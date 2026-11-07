-- Enforce that Dean can never be provisioned as a generated-ID/PIN actor.
begin;

alter table public.identity_actors
  drop constraint if exists identity_actors_actor_type_check;
alter table public.identity_actors
  add constraint identity_actors_actor_type_check
  check (actor_type = any (array[
    'superadmin','principal_admin','vice_principal','bursar','teacher','student','parent',
    'hod','adviser','lecturer'
  ]));

create or replace function public.set_pin(p_new_pin text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $pin$
declare
  v_user_id uuid := auth.uid();
  v_role text;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED'; end if;
  select role into v_role from public.profiles where user_id = v_user_id;
  if v_role is null then raise exception 'PROFILE_NOT_FOUND'; end if;
  if v_role not in ('vice_principal','bursar','teacher','student','parent','hod','adviser','lecturer') then
    raise exception 'PIN_AUTHENTICATION_NOT_ALLOWED_FOR_ROLE';
  end if;
  if length(p_new_pin) not in (4,6) or p_new_pin !~ '^[0-9]{4,6}$'
     or length(p_new_pin) <> case when v_role in ('student','parent') then 4 else 6 end then
    raise exception 'INVALID_PIN_LENGTH';
  end if;
  update public.profiles
  set pin = null, pin_hash = crypt(p_new_pin, gen_salt('bf')),
      pin_changed_at = now(), pin_requires_change = false,
      failed_attempts = 0, locked_until = null
  where user_id = v_user_id;
  update public.identity_actors
  set pin_hash = crypt(p_new_pin, gen_salt('bf')), pin_changed_at = now(),
      failed_attempts = 0, locked_until = null, updated_at = now()
  where auth_user_id = v_user_id;
  return jsonb_build_object('success', true, 'pin_requires_change', false);
end;
$pin$;

revoke all on function public.set_pin(text) from public, anon;
grant execute on function public.set_pin(text) to authenticated;

commit;
