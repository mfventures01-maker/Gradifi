-- Run after 20261116000100_verify_receipt_private_evidence_column_revoke.sql.
-- Expected: anon=false, authenticated=false, service_role=true.
select
  has_column_privilege('anon', 'public.public_verification_records', 'evidence_envelope', 'SELECT') as anon_can_read_private_evidence,
  has_column_privilege('authenticated', 'public.public_verification_records', 'evidence_envelope', 'SELECT') as authenticated_can_read_private_evidence,
  has_column_privilege('service_role', 'public.public_verification_records', 'evidence_envelope', 'SELECT') as service_role_can_read_private_evidence,
  (select relrowsecurity from pg_class where oid = 'public.public_verification_records'::regclass) as rls_enabled;

-- Public receipt metadata remains readable without granting the private envelope.
select
  has_column_privilege('anon', 'public.public_verification_records', 'verification_id', 'SELECT') as anon_can_read_receipt_id,
  has_column_privilege('anon', 'public.public_verification_records', 'document_hash', 'SELECT') as anon_can_read_document_hash,
  has_column_privilege('anon', 'public.public_verification_records', 'evidence_hash', 'SELECT') as anon_can_read_evidence_hash,
  has_column_privilege('anon', 'public.public_verification_records', 'overall_similarity', 'SELECT') as anon_can_read_score;
