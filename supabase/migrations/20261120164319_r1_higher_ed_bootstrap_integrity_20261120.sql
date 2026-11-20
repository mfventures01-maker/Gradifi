
DO $guard$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.tenants
    WHERE institution_id IS NOT NULL
    GROUP BY institution_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'R1_ABORT: duplicate tenant rows already exist for an institution';
  END IF;
END
$guard$;

CREATE UNIQUE INDEX IF NOT EXISTS tenants_one_per_institution_uidx
  ON public.tenants (institution_id)
  WHERE institution_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.bootstrap_higher_institution(
  p_auth_user_id uuid,
  p_institution_name text,
  p_institution_type text,
  p_registration_number text,
  p_country text,
  p_address text,
  p_phone text,
  p_website text,
  p_authority_name text,
  p_authority_email text,
  p_authority_phone text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
DECLARE
  v_institution_id uuid;
  v_campus_id uuid;
  v_profile_id uuid;
  v_tenant_id uuid;
  v_slug_base text;
  v_institution_slug text;
  v_email text := lower(trim(p_authority_email));
  v_authority_role text;
  v_attempt integer := 0;
BEGIN
  IF p_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_USER_REQUIRED';
  END IF;

  IF nullif(trim(p_institution_name), '') IS NULL
     OR nullif(trim(p_institution_type), '') IS NULL
     OR nullif(trim(p_authority_name), '') IS NULL
     OR nullif(v_email, '') IS NULL THEN
    RAISE EXCEPTION 'INSTITUTION_AND_AUTHORITY_REQUIRED';
  END IF;

  IF p_institution_type NOT IN ('university', 'polytechnic', 'college_of_education') THEN
    RAISE EXCEPTION 'UNSUPPORTED_HIGHER_INSTITUTION_TYPE';
  END IF;

  v_authority_role := CASE
    WHEN p_institution_type = 'university' THEN 'vice_chancellor'
    ELSE 'rector'
  END;

  IF NOT EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.id = p_auth_user_id
      AND lower(u.email) = v_email
      AND u.email_confirmed_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'AUTHORITY_AUTH_EMAIL_MISMATCH_OR_UNVERIFIED';
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = p_auth_user_id)
     OR EXISTS (SELECT 1 FROM public.identity_actors a WHERE a.auth_user_id = p_auth_user_id) THEN
    RAISE EXCEPTION 'ROOT_AUTH_IDENTITY_ALREADY_PROVISIONED';
  END IF;

  IF nullif(trim(p_registration_number), '') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM public.institutions i
       WHERE lower(btrim(i.registration_number)) = lower(btrim(p_registration_number))
     ) THEN
    RAISE EXCEPTION 'INSTITUTION_REGISTRATION_NUMBER_EXISTS';
  END IF;

  v_slug_base := trim(both '-' from regexp_replace(
    lower(trim(p_institution_name)),
    '[^a-z0-9]+',
    '-',
    'g'
  ));

  IF v_slug_base = '' THEN
    RAISE EXCEPTION 'INSTITUTION_SLUG_INVALID';
  END IF;

  v_institution_slug := v_slug_base;

  -- Allocate one canonical slug that is free across all three slug namespaces
  -- used by this bootstrap: institutions, school routes, and tenant routes.
  WHILE EXISTS (
    SELECT 1 FROM public.institutions i WHERE i.slug = v_institution_slug
    UNION ALL
    SELECT 1 FROM public.schools s
      WHERE s.url_slug = v_institution_slug OR s.slug = v_institution_slug
    UNION ALL
    SELECT 1 FROM public.tenants t WHERE t.slug = v_institution_slug
  ) LOOP
    v_attempt := v_attempt + 1;
    IF v_attempt > 10 THEN
      RAISE EXCEPTION 'INSTITUTION_SLUG_ALLOCATION_FAILED';
    END IF;
    v_institution_slug := v_slug_base || '-' ||
      substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
  END LOOP;

  INSERT INTO public.institutions (
    name, type, country, registration_number, address, phone, website_url,
    established_year, institution_category, slug, status
  )
  VALUES (
    trim(p_institution_name),
    p_institution_type,
    coalesce(nullif(trim(p_country), ''), 'Nigeria'),
    nullif(trim(p_registration_number), ''),
    nullif(trim(p_address), ''),
    nullif(trim(p_phone), ''),
    nullif(trim(p_website), ''),
    extract(year FROM now())::integer,
    p_institution_type,
    v_institution_slug,
    'pending'
  )
  RETURNING id, slug INTO v_institution_id, v_institution_slug;

  INSERT INTO public.schools (
    institution_id, school_name, email, phone, address, campus_address, campus_phone,
    school_type, url_slug, slug, provisioning_status
  )
  VALUES (
    v_institution_id,
    trim(p_institution_name) || ' Main Campus',
    v_email,
    nullif(trim(p_phone), ''),
    nullif(trim(p_address), ''),
    nullif(trim(p_address), ''),
    nullif(trim(p_phone), ''),
    'tertiary',
    v_institution_slug,
    v_institution_slug,
    'unprovisioned'
  )
  RETURNING id INTO v_campus_id;

  INSERT INTO public.profiles (
    user_id, institution_id, school_id, full_name, role, email, phone,
    authentication_method, pin, pin_hash, pin_type, pin_requires_change,
    failed_attempts, locked_until
  )
  VALUES (
    p_auth_user_id,
    v_institution_id,
    v_campus_id,
    trim(p_authority_name),
    v_authority_role,
    v_email,
    nullif(trim(p_authority_phone), ''),
    'email',
    null,
    null,
    null,
    false,
    0,
    null
  )
  RETURNING id INTO v_profile_id;

  INSERT INTO public.identity_actors (
    auth_user_id, institution_id, school_id, actor_type, actor_record_id,
    login_identifier, auth_method, status, pin_hash, pin_changed_at,
    failed_attempts, authority_user_id
  )
  VALUES (
    p_auth_user_id,
    v_institution_id,
    v_campus_id,
    v_authority_role,
    null,
    v_email,
    'email',
    'active',
    null,
    now(),
    0,
    null
  );

  -- Membership is active for the authenticated authority, while institution
  -- status remains pending. Institution-status RLS gates operational access
  -- until an approval process activates the institution.
  INSERT INTO public.institution_memberships (
    user_id, institution_id, role, status
  )
  VALUES (
    p_auth_user_id, v_institution_id, v_authority_role, 'active'
  );

  INSERT INTO public.tenants (name, slug, institution_id)
  VALUES (trim(p_institution_name), v_institution_slug, v_institution_id)
  RETURNING id INTO v_tenant_id;

  INSERT INTO public.institution_onboarding (
    institution_id, institution_created, school_created, classes_created,
    subjects_created, teachers_created, students_created, completed
  )
  VALUES (
    v_institution_id, true, true, false, false, false, false, false
  );

  INSERT INTO public.tenant_subscriptions (institution_id, plan_type, is_active)
  VALUES (v_institution_id, 'free', true);

  RETURN jsonb_build_object(
    'success', true,
    'institution_id', v_institution_id,
    'institution_status', 'pending',
    'school_id', v_campus_id,
    'profile_id', v_profile_id,
    'tenant_id', v_tenant_id,
    'auth_user_id', p_auth_user_id,
    'actor_type', v_authority_role,
    'authority_role', v_authority_role,
    'authority_title', CASE
      WHEN v_authority_role = 'vice_chancellor' THEN 'Vice-Chancellor'
      ELSE 'Rector'
    END,
    'url_slug', v_institution_slug,
    'institution_path', '/institution/' || v_institution_slug,
    'institution_name', trim(p_institution_name),
    'authority_email', v_email
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.bootstrap_higher_institution(
  uuid, text, text, text, text, text, text, text, text, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_higher_institution(
  uuid, text, text, text, text, text, text, text, text, text, text
) TO service_role;

COMMENT ON FUNCTION public.bootstrap_higher_institution(
  uuid, text, text, text, text, text, text, text, text, text, text
) IS 'R1: atomically bootstraps a pending higher institution, executive identity, active membership, canonical school/institution/tenant slug, and tenant linkage. Service-role only.';
