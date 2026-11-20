
alter table public.actor_provisioning_jobs
  add column credential_receipt_status text not null default 'not_ready',
  add column credential_receipt_ciphertext bytea,
  add column credential_receipt_nonce bytea,
  add column credential_receipt_key_version text,
  add column credential_receipt_ready_at timestamptz,
  add column credential_receipt_issued_at timestamptz,
  add column credential_receipt_issued_by_user_id uuid references auth.users(id) on delete restrict,
  add column credential_receipt_expires_at timestamptz,
  add column credential_receipt_recovery_count integer not null default 0,
  add column credential_receipt_last_recovery_at timestamptz,
  add column credential_receipt_last_recovery_by_user_id uuid references auth.users(id) on delete restrict,
  add column credential_receipt_last_recovery_reason text;

alter table public.actor_provisioning_jobs
  add constraint actor_provisioning_jobs_receipt_status_check
    check (credential_receipt_status in ('not_ready','ready','issued','expired','revoked')),
  add constraint actor_provisioning_jobs_receipt_recovery_count_check
    check (credential_receipt_recovery_count >= 0),
  add constraint actor_provisioning_jobs_receipt_state_check
    check (
      (
        credential_receipt_status = 'not_ready'
        and credential_receipt_ciphertext is null
        and credential_receipt_nonce is null
        and credential_receipt_key_version is null
        and credential_receipt_ready_at is null
        and credential_receipt_issued_at is null
        and credential_receipt_issued_by_user_id is null
        and credential_receipt_expires_at is null
      )
      or
      (
        credential_receipt_status = 'ready'
        and credential_receipt_ciphertext is not null
        and credential_receipt_nonce is not null
        and octet_length(credential_receipt_nonce) = 12
        and credential_receipt_key_version is not null
        and credential_receipt_ready_at is not null
        and credential_receipt_issued_at is null
        and credential_receipt_issued_by_user_id is null
        and credential_receipt_expires_at is not null
      )
      or
      (
        credential_receipt_status = 'issued'
        and credential_receipt_ciphertext is null
        and credential_receipt_nonce is null
        and credential_receipt_key_version is not null
        and credential_receipt_ready_at is not null
        and credential_receipt_issued_at is not null
        and credential_receipt_issued_by_user_id is not null
        and credential_receipt_expires_at is not null
      )
      or
      (
        credential_receipt_status in ('expired','revoked')
        and credential_receipt_ciphertext is null
        and credential_receipt_nonce is null
        and credential_receipt_key_version is not null
        and credential_receipt_ready_at is not null
        and credential_receipt_expires_at is not null
      )
    ),
  add constraint actor_provisioning_jobs_payload_no_credentials_check
    check (not (request_payload ?| array['pin','password','initial_pin','credential','secret']));

create index actor_provisioning_jobs_receipt_expiry_idx
  on public.actor_provisioning_jobs (credential_receipt_expires_at)
  where credential_receipt_status = 'ready';

create table public.actor_credential_receipt_events (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.actor_provisioning_jobs(id) on delete restrict,
  institution_id uuid not null references public.institutions(id) on delete restrict,
  event_type text not null check (
    event_type in (
      'prepared',
      'issued',
      'expired',
      'recovery_authorized',
      'recovery_prepared',
      'revoked',
      'claim_denied'
    )
  ),
  actor_user_id uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index actor_credential_receipt_events_job_idx
  on public.actor_credential_receipt_events (job_id, created_at desc);

create index actor_credential_receipt_events_institution_idx
  on public.actor_credential_receipt_events (institution_id, created_at desc);

alter table public.actor_credential_receipt_events enable row level security;

revoke all on public.actor_credential_receipt_events from public, anon, authenticated;
grant select, insert on public.actor_credential_receipt_events to service_role;

comment on column public.actor_provisioning_jobs.credential_receipt_ciphertext
  is 'Authenticated ciphertext only; plaintext credentials must never be persisted.';
comment on column public.actor_provisioning_jobs.credential_receipt_nonce
  is '12-byte AES-GCM nonce paired with credential_receipt_ciphertext.';
comment on column public.actor_provisioning_jobs.credential_receipt_key_version
  is 'Identifier for the Edge Function encryption key version; never contains key material.';
comment on table public.actor_credential_receipt_events
  is 'Append-only service-role audit trail for one-time credential receipt lifecycle events; contains no credentials.';
