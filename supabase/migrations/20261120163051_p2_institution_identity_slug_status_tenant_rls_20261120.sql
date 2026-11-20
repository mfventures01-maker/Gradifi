
-- P2-01..P2-06: canonical institution identity, lifecycle, slug allocation,
-- duplicate registration protection, and read-side tenant isolation.

ALTER TABLE public.institutions
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

UPDATE public.institutions
SET status = 'active'
WHERE status IS NULL OR status NOT IN ('pending','active','suspended','rejected');

-- Preserve the existing FUTO tenant slug where the tenant and institution names
-- match exactly; all other institutions receive a normalized name slug.
UPDATE public.institutions i
SET slug = t.slug
FROM public.tenants t
WHERE i.slug IS NULL
  AND t.slug IS NOT NULL
  AND lower(btrim(t.name)) = lower(btrim(i.name));

UPDATE public.institutions
SET slug = trim(both '-' from regexp_replace(lower(btrim(name)), '[^a-z0-9]+', '-', 'g'))
WHERE slug IS NULL OR btrim(slug) = '';

DO $$
DECLARE
  r record;
  v_base text;
  v_candidate text;
BEGIN
  FOR r IN
    SELECT id, slug
    FROM public.institutions
    ORDER BY created_at NULLS FIRST, id
  LOOP
    v_base := trim(both '-' from regexp_replace(lower(btrim(coalesce(r.slug,''))), '[^a-z0-9]+', '-', 'g'));
    IF v_base = '' THEN v_base := 'institution'; END IF;
    v_candidate := v_base;
    WHILE EXISTS (
      SELECT 1 FROM public.institutions i
      WHERE i.slug = v_candidate AND i.id <> r.id
    ) LOOP
      v_candidate := v_base || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
    END LOOP;
    UPDATE public.institutions SET slug = v_candidate WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE public.institutions
  ALTER COLUMN slug SET NOT NULL;

ALTER TABLE public.institutions
  ADD CONSTRAINT institutions_status_check
  CHECK (status IN ('pending','active','suspended','rejected'));

ALTER TABLE public.institutions
  ADD CONSTRAINT institutions_slug_format_check
  CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

CREATE UNIQUE INDEX IF NOT EXISTS institutions_slug_key
  ON public.institutions (slug);

CREATE UNIQUE INDEX IF NOT EXISTS institutions_normalized_name_key
  ON public.institutions (lower(btrim(name)));

CREATE UNIQUE INDEX IF NOT EXISTS institutions_registration_number_normalized_key
  ON public.institutions (lower(btrim(registration_number)))
  WHERE registration_number IS NOT NULL AND btrim(registration_number) <> '';

-- Connect the existing legacy FUTO tenant record to its exact institution.
UPDATE public.tenants t
SET institution_id = i.id
FROM public.institutions i
WHERE t.institution_id IS NULL
  AND lower(btrim(t.name)) = lower(btrim(i.name));

CREATE OR REPLACE FUNCTION public.guard_institution_identity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_base text;
  v_candidate text;
  v_attempt integer := 0;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'INSTITUTION_ID_IMMUTABLE' USING ERRCODE = '23514';
    END IF;
    IF NEW.slug IS DISTINCT FROM OLD.slug THEN
      RAISE EXCEPTION 'INSTITUTION_SLUG_IMMUTABLE' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.slug IS NULL OR btrim(NEW.slug) = '' THEN
    v_base := regexp_replace(lower(btrim(NEW.name)), '[^a-z0-9]+', '-', 'g');
  ELSE
    v_base := regexp_replace(lower(btrim(NEW.slug)), '[^a-z0-9]+', '-', 'g');
  END IF;

  v_base := trim(both '-' from v_base);
  IF v_base = '' THEN
    RAISE EXCEPTION 'INSTITUTION_SLUG_INVALID' USING ERRCODE = '23514';
  END IF;

  v_candidate := v_base;
  WHILE EXISTS (SELECT 1 FROM public.institutions i WHERE i.slug = v_candidate) LOOP
    v_attempt := v_attempt + 1;
    IF v_attempt > 10 THEN
      RAISE EXCEPTION 'INSTITUTION_SLUG_ALLOCATION_FAILED' USING ERRCODE = '23505';
    END IF;
    v_candidate := v_base || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
  END LOOP;

  NEW.slug := v_candidate;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_institution_identity ON public.institutions;
CREATE TRIGGER trg_guard_institution_identity
BEFORE INSERT OR UPDATE ON public.institutions
FOR EACH ROW EXECUTE FUNCTION public.guard_institution_identity();

-- Pending applications cannot duplicate an institution name or registration
-- number. Existing approved institutions are protected by their own unique indexes.
CREATE UNIQUE INDEX IF NOT EXISTS gradifi_onboarding_pending_name_key
  ON public.gradifi_school_onboarding_requests (lower(btrim(institution_name)))
  WHERE status IN ('pending','under_review');

CREATE UNIQUE INDEX IF NOT EXISTS gradifi_onboarding_pending_registration_key
  ON public.gradifi_school_onboarding_requests (lower(btrim(registration_number)))
  WHERE status IN ('pending','under_review')
    AND registration_number IS NOT NULL
    AND btrim(registration_number) <> '';

CREATE OR REPLACE FUNCTION public.guard_gradifi_institution_application_duplicates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.status IN ('pending','under_review') THEN
    IF EXISTS (
      SELECT 1 FROM public.institutions i
      WHERE lower(btrim(i.name)) = lower(btrim(NEW.institution_name))
    ) THEN
      RAISE EXCEPTION 'INSTITUTION_ALREADY_REGISTERED' USING ERRCODE = '23505';
    END IF;

    IF NEW.registration_number IS NOT NULL
       AND btrim(NEW.registration_number) <> ''
       AND EXISTS (
         SELECT 1 FROM public.institutions i
         WHERE i.registration_number IS NOT NULL
           AND lower(btrim(i.registration_number)) = lower(btrim(NEW.registration_number))
       ) THEN
      RAISE EXCEPTION 'INSTITUTION_REGISTRATION_NUMBER_EXISTS' USING ERRCODE = '23505';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_gradifi_institution_application_duplicates
  ON public.gradifi_school_onboarding_requests;
CREATE TRIGGER trg_guard_gradifi_institution_application_duplicates
BEFORE INSERT OR UPDATE OF institution_name, registration_number, status
ON public.gradifi_school_onboarding_requests
FOR EACH ROW EXECUTE FUNCTION public.guard_gradifi_institution_application_duplicates();

-- A narrowly scoped predicate for institution-owned academic data.
CREATE OR REPLACE FUNCTION public.is_current_user_active_institution_member(p_institution_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.institution_memberships m
    JOIN public.institutions i ON i.id = m.institution_id
    WHERE m.user_id = (SELECT auth.uid())
      AND m.institution_id = p_institution_id
      AND m.status = 'active'
      AND i.status = 'active'
  );
$$;

REVOKE ALL ON FUNCTION public.is_current_user_active_institution_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_current_user_active_institution_member(uuid) TO authenticated;

-- Institution members can read their own institution, including its lifecycle
-- state. Child academic structures are visible only while the institution is active.
DROP POLICY IF EXISTS institutions_member_read_self ON public.institutions;
CREATE POLICY institutions_member_read_self
ON public.institutions
FOR SELECT TO authenticated
USING (public.is_current_user_institution_member(id));

DROP POLICY IF EXISTS schools_active_institution_member_read ON public.schools;
CREATE POLICY schools_active_institution_member_read
ON public.schools
FOR SELECT TO authenticated
USING (
  institution_id IS NOT NULL
  AND public.is_current_user_active_institution_member(institution_id)
);

-- Preserve the existing dean-specific access path, but make it respect suspension.
DROP POLICY IF EXISTS dean_read_own_institution_schools ON public.schools;
CREATE POLICY dean_read_own_institution_schools
ON public.schools
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.institutions i ON i.id = schools.institution_id
    WHERE p.user_id = (SELECT auth.uid())
      AND p.role = 'dean'
      AND p.institution_id = schools.institution_id
      AND i.status = 'active'
  )
);

DROP POLICY IF EXISTS faculties_active_institution_member_read ON public.faculties;
CREATE POLICY faculties_active_institution_member_read
ON public.faculties
FOR SELECT TO authenticated
USING (
  institution_id IS NOT NULL
  AND public.is_current_user_active_institution_member(institution_id)
);

DROP POLICY IF EXISTS departments_active_institution_member_read ON public.departments;
CREATE POLICY departments_active_institution_member_read
ON public.departments
FOR SELECT TO authenticated
USING (
  institution_id IS NOT NULL
  AND public.is_current_user_active_institution_member(institution_id)
);
