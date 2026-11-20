# Gradifi Super Admin: first administrator bootstrap

The higher-education approval workflow uses the existing canonical `identity_actors` identity model. A Super Admin is an Auth user with one active actor row:

- `actor_type = 'superadmin'`
- `institution_id IS NULL`
- `school_id IS NULL`
- `auth_method = 'email'`
- `status = 'active'`

The live database already permits `superadmin` in the `identity_actors.actor_type` constraint and permits a Super Admin actor without an institution. Do not add `superadmin` to `profiles.role`; platform administrators do not belong to an institution.

## One-time first administrator setup

1. Create a dedicated Supabase Auth user for the platform administrator. Use an institutional/operations mailbox, a strong password and verified email. Do not reuse a Rector, Dean, Principal or student account because `identity_actors.auth_user_id` is unique.
2. Apply the migration `20261120181000_super_admin_higher_ed_approval_workflow.sql`.
3. In the Supabase SQL Editor, replace the email below with the exact verified Auth email and execute the statement. This is a privileged operator action, not a browser operation.

```sql
do $$
declare
  v_email text := lower(trim('REPLACE_WITH_VERIFIED_SUPER_ADMIN_EMAIL'));
  v_user_id uuid;
begin
  if v_email = '' or v_email = 'replace_with_verified_super_admin_email' then
    raise exception 'SET_VERIFIED_SUPER_ADMIN_EMAIL';
  end if;

  select u.id into v_user_id
  from auth.users u
  where lower(u.email) = v_email
    and u.email_confirmed_at is not null;

  if v_user_id is null then
    raise exception 'VERIFIED_SUPER_ADMIN_AUTH_USER_NOT_FOUND';
  end if;

  if exists (
    select 1 from public.identity_actors
    where auth_user_id = v_user_id
      and actor_type <> 'superadmin'
  ) then
    raise exception 'DEDICATED_SUPER_ADMIN_AUTH_USER_REQUIRED';
  end if;

  insert into public.identity_actors (
    auth_user_id, institution_id, school_id, actor_type,
    actor_record_id, login_identifier, auth_method, status
  )
  values (
    v_user_id, null, null, 'superadmin',
    null, v_email, 'email', 'active'
  )
  on conflict (auth_user_id) do update
    set status = 'active',
        actor_type = 'superadmin',
        institution_id = null,
        school_id = null,
        login_identifier = excluded.login_identifier,
        auth_method = 'email',
        updated_at = now()
  where public.identity_actors.actor_type = 'superadmin';

  if not exists (
    select 1 from public.identity_actors
    where auth_user_id = v_user_id
      and actor_type = 'superadmin'
      and institution_id is null
      and status = 'active'
      and auth_method = 'email'
  ) then
    raise exception 'SUPER_ADMIN_BOOTSTRAP_NOT_CONFIRMED';
  end if;
end;
$$;
```

4. Sign in through the normal Gradifi email/password login.
5. Open `/super-admin/institutions`. The page calls the server-side `is_current_user_super_admin()` check; an ordinary `admin` profile is not sufficient.

## Approval contract

- Queue: `get_pending_higher_ed_institution_approvals()`
- Decision: `review_higher_ed_institution(institution_id, decision, reason)`
- Decisions: `approved` or `rejected`
- A decision reason must contain at least 10 non-whitespace characters.
- Approval requires an active VC/Rector profile, active identity actor, active institution membership, completed initial Dean provisioning job, active Dean actor and a bootstrap campus whose `slug` and `url_slug` match the institution slug.
- Approval and its append-only audit event are committed in the same database transaction.
- Approval transitions `pending -> active`; rejection transitions `pending -> rejected`. The decision RPC cannot review an institution twice.
- The browser receives no direct write permission on `institutions.status` or `institution_approval_events`.

## Operational caveat

The live database already contains P2/R1/R2/R3-01 migrations, but the inspected GitHub integration branch did not contain their corresponding migration files. Reconcile and commit that migration baseline before treating a clean-clone migration replay as certified. This workflow migration intentionally depends on those live schema objects and must not be applied to an older database snapshot that lacks them.
