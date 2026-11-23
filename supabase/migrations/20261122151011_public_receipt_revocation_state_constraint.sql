alter table public.public_verification_records
  drop constraint if exists public_verification_records_provenance_state_ck,
  add constraint public_verification_records_provenance_state_ck
  check (
    (
      verification_run_id is null and result_hash is null and manifest_hash is null
      and status is null and public_schema_version is null
    )
    or
    (
      verification_run_id is not null
      and result_hash ~ '^[a-f0-9]{64}$'
      and manifest_hash ~ '^[a-f0-9]{64}$'
      and status in ('VALID','REVOKED','EXPIRED')
      and nullif(trim(public_schema_version),'') is not null
    )
  );
