begin;

revoke all privileges
on table public.public_verification_records
from anon, authenticated, service_role;

grant select
on table public.public_verification_records
to anon, authenticated;

grant select, insert
on table public.public_verification_records
to service_role;

commit;
