-- Prevent repeated requests during an active PIN lockout from extending it indefinitely.
-- Preserve the existing five-attempt threshold, 15-minute duration and service-role boundary.

begin;

create or replace function public.auth_pin_login(p_identifier text, p_pin text)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'extensions'
as $function$
declare
  v_actor public.identity_actors%rowtype;
  v_next_failed_attempts integer;
begin
  if coalesce(length(p_pin), 0) not in (4, 6)
     or nullif(trim(p_identifier), '') is null then
    return jsonb_build_object('success', false, 'error', 'INVALID_CREDENTIALS');
  end if;

  select *
    into v_actor
  from public.identity_actors
  where upper(login_identifier) = upper(trim(p_identifier))
    and status = 'active'
  limit 1;

  if not found or v_actor.pin_hash is null then
    return jsonb_build_object('success', false, 'error', 'INVALID_CREDENTIALS');
  end if;

  -- An active lockout is terminal for this attempt: do not increment counters
  -- or move locked_until forward while the account is already locked.
  if v_actor.locked_until is not null and v_actor.locked_until > now() then
    return jsonb_build_object('success', false, 'error', 'INVALID_CREDENTIALS');
  end if;

  if crypt(p_pin, v_actor.pin_hash) is distinct from v_actor.pin_hash then
    v_next_failed_attempts := coalesce(v_actor.failed_attempts, 0) + 1;

    update public.identity_actors
    set failed_attempts = v_next_failed_attempts,
        locked_until = case
          when v_next_failed_attempts >= 5 then now() + interval '15 minutes'
          else null
        end,
        updated_at = now()
    where id = v_actor.id;

    return jsonb_build_object('success', false, 'error', 'INVALID_CREDENTIALS');
  end if;

  update public.identity_actors
  set failed_attempts = 0,
      locked_until = null,
      last_login_at = now(),
      updated_at = now()
  where id = v_actor.id;

  return jsonb_build_object(
    'success', true,
    'user_id', v_actor.auth_user_id,
    'actor_id', v_actor.id,
    'institution_id', v_actor.institution_id,
    'school_id', v_actor.school_id,
    'role', v_actor.actor_type,
    'login_id', v_actor.login_identifier
  );
end;
$function$;

revoke all on function public.auth_pin_login(text, text) from public, anon, authenticated;
grant execute on function public.auth_pin_login(text, text) to service_role;

commit;
