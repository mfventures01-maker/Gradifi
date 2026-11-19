-- Remove the legacy auth trigger that attempted to create incomplete profiles.
-- Root and subordinate profiles are now created only by canonical provisioning RPCs.
begin;

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- Dean is a root institution owner, never a subordinate created by another admin.
drop function if exists public.complete_dean_onboarding(uuid,uuid,uuid,text,text,text);

commit;
