
do $$
declare
  r record;
begin
  for r in
    select c.oid, n.nspname, c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relrowsecurity
      and not exists (
        select 1 from pg_policy p where p.polrelid = c.oid
      )
  loop
    execute format(
      'create policy %I on %I.%I for all to anon, authenticated using (false) with check (false)',
      'r3_explicit_deny_client_roles',
      r.nspname,
      r.relname
    );
    execute format(
      'revoke all privileges on table %I.%I from anon, authenticated',
      r.nspname,
      r.relname
    );
  end loop;
end
$$;

do $$
declare
  r record;
begin
  for r in
    select p.oid, n.nspname, p.proname,
      pg_get_function_identity_arguments(p.oid) as identity_args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and not exists (
        select 1
        from unnest(coalesce(p.proconfig, array[]::text[])) cfg
        where cfg like 'search_path=%'
      )
  loop
    execute format(
      'alter function %I.%I(%s) set search_path = pg_catalog, public, extensions, vault',
      r.nspname,
      r.proname,
      r.identity_args
    );
  end loop;
end
$$;
