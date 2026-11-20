begin;

-- The evidence envelope contains submitted canonical text and matched excerpts.
-- Public verification reads only the explicit receipt metadata allowlist.
revoke select (evidence_envelope)
on table public.public_verification_records
from anon, authenticated;

commit;
