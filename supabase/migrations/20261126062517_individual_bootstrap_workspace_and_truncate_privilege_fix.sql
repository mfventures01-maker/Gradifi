begin;

do $preflight$
begin
  if to_regprocedure('public.ensure_personal_workspace()') is null then
    raise exception 'BOOTSTRAP_PREREQUISITE_MISSING: public.ensure_personal_workspace()';
  end if;
  if to_regclass('public.workspaces') is null
     or to_regclass('public.workspace_members') is null
     or to_regclass('public.individual_accounts') is null then
    raise exception 'BOOTSTRAP_PREREQUISITE_MISSING: individual workspace schema';
  end if;
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.workspaces'::regclass
      and tgname = 'trg_create_individual_account_for_workspace'
      and not tgisinternal
  ) then
    raise exception 'BOOTSTRAP_PREREQUISITE_MISSING: individual account workspace trigger';
  end if;
end;
$preflight$;

-- Authenticated users must never be able to bulk-truncate identity or evidence rows.
revoke truncate on table public.profiles, public.verification_runs from authenticated;

do $security_assertions$
begin
  if has_table_privilege('authenticated', 'public.profiles', 'TRUNCATE') then
    raise exception 'SECURITY_REPAIR_FAILED: authenticated retains TRUNCATE on public.profiles';
  end if;
  if has_table_privilege('authenticated', 'public.verification_runs', 'TRUNCATE') then
    raise exception 'SECURITY_REPAIR_FAILED: authenticated retains TRUNCATE on public.verification_runs';
  end if;
end;
$security_assertions$;

-- One RPC transaction now provisions identity and its personal workspace.
-- Lock the Auth row first to serialize concurrent confirmation callbacks for the same user.
create or replace function public.bootstrap_public_individual(
  p_full_name text,
  p_account_type text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_profile_id uuid;
  v_actor_id uuid;
  v_workspace_id uuid;
  v_membership_id uuid;
  v_individual_account_id uuid;
  v_membership_status text;
  v_membership_role text;
  v_membership_source text;
  v_account_status text;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  if nullif(trim(p_full_name), '') is null then
    raise exception 'FULL_NAME_REQUIRED';
  end if;

  if p_account_type is null or p_account_type not in (
    'freelancer',
    'independent_student',
    'independent_professional',
    'other_individual'
  ) then
    raise exception 'INVALID_PUBLIC_ACCOUNT_TYPE';
  end if;

  select lower(trim(u.email))
    into v_email
  from auth.users u
  where u.id = v_user_id
    and u.email_confirmed_at is not null
  for update;

  if v_email is null then
    raise exception 'VERIFIED_EMAIL_REQUIRED';
  end if;

  -- A partial or conflicting identity is never silently repaired or reclassified.
  if exists (
    select 1 from public.profiles p where p.user_id = v_user_id
  ) or exists (
    select 1 from public.identity_actors ia where ia.auth_user_id = v_user_id
  ) then
    if not exists (
      select 1
      from public.profiles p
      join public.identity_actors ia on ia.auth_user_id = p.user_id
      where p.user_id = v_user_id
        and p.role = 'individual'
        and p.account_type = p_account_type
        and p.institution_id is null
        and p.school_id is null
        and ia.actor_type = 'individual'
        and ia.institution_id is null
        and ia.school_id is null
        and ia.authority_user_id is null
        and ia.auth_method = 'email'
        and ia.status = 'active'
    ) then
      raise exception 'AUTH_IDENTITY_ALREADY_PROVISIONED';
    end if;

    select p.id, ia.id
      into v_profile_id, v_actor_id
    from public.profiles p
    join public.identity_actors ia on ia.auth_user_id = p.user_id
    where p.user_id = v_user_id;
  else
    insert into public.profiles (
      user_id, institution_id, school_id, full_name, role, email,
      authentication_method, pin, pin_hash, pin_type, pin_requires_change,
      failed_attempts, locked_until, authority_user_id, account_type
    ) values (
      v_user_id, null, null, trim(p_full_name), 'individual', v_email,
      'email', null, null, null, false,
      0, null, null, p_account_type
    )
    returning id into v_profile_id;

    insert into public.identity_actors (
      auth_user_id, institution_id, school_id, actor_type, actor_record_id,
      login_identifier, auth_method, status, pin_hash, pin_changed_at,
      failed_attempts, authority_user_id
    ) values (
      v_user_id, null, null, 'individual', null,
      v_email, 'email', 'active', null, now(),
      0, null
    )
    returning id into v_actor_id;
  end if;

  -- This trusted, idempotent function creates the individual workspace and owner
  -- membership. The workspace INSERT trigger creates its individual_accounts row.
  v_workspace_id := public.ensure_personal_workspace();

  -- Defensive repair for a workspace whose account projection is absent.
  insert into public.individual_accounts (workspace_id, owner_user_id)
  values (v_workspace_id, v_user_id)
  on conflict (workspace_id) do nothing;

  select ia.id, ia.account_status
    into v_individual_account_id, v_account_status
  from public.individual_accounts ia
  where ia.workspace_id = v_workspace_id
    and ia.owner_user_id = v_user_id
  for update;

  if v_individual_account_id is null or v_account_status <> 'active' then
    raise exception 'INDIVIDUAL_ACCOUNT_PROVISIONING_FAILED';
  end if;

  select wm.id, wm.status, wm.role, wm.membership_source
    into v_membership_id, v_membership_status, v_membership_role, v_membership_source
  from public.workspace_members wm
  where wm.workspace_id = v_workspace_id
    and wm.user_id = v_user_id
  for update;

  if v_membership_id is null
     or v_membership_status <> 'active'
     or v_membership_role <> 'owner'
     or v_membership_source <> 'workspace_owner' then
    raise exception 'PERSONAL_WORKSPACE_OWNER_MEMBERSHIP_INVALID';
  end if;

  return jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'profile_id', v_profile_id,
    'actor_id', v_actor_id,
    'workspace_id', v_workspace_id,
    'membership_id', v_membership_id,
    'individual_account_id', v_individual_account_id,
    'role', 'individual',
    'account_type', p_account_type,
    'institution_id', null,
    'school_id', null
  );
end;
$function$;

revoke all on function public.bootstrap_public_individual(text, text) from public, anon;
grant execute on function public.bootstrap_public_individual(text, text) to authenticated, service_role;

comment on function public.bootstrap_public_individual(text, text) is
  'Atomically provisions a confirmed individual Auth user, profile, identity actor, personal workspace, active owner membership and individual account. Idempotent for the same existing individual identity.';

commit;
