-- OIR-01 Phase 1: durable, secret-free recovery ledger for canonical actor provisioning.
-- This migration does not alter existing identity tables or replay prior onboarding migrations.
begin;

create table if not exists public.actor_provisioning_jobs (
  id uuid primary key default gen_random_uuid(),
  idempotency_key uuid not null,
  request_fingerprint text not null,
  institution_id uuid not null references public.institutions(id) on delete restrict,
  requested_by_user_id uuid not null references auth.users(id) on delete restrict,
  root_authority_user_id uuid not null references auth.users(id) on delete restrict,
  actor_type text not null,
  target_auth_user_id uuid references auth.users(id) on delete set null,
  identity_actor_id uuid references public.identity_actors(id) on delete set null,
  status text not null default 'pending_auth',
  stage text not null default 'auth',
  attempt_count integer not null default 0,
  request_payload jsonb not null default '{}'::jsonb,
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint actor_provisioning_jobs_idempotency_key_key unique (idempotency_key),
  constraint actor_provisioning_jobs_fingerprint_check
    check (request_fingerprint ~ '^[a-f0-9]{64}$'),
  constraint actor_provisioning_jobs_actor_type_check
    check (actor_type in ('dean','hod','adviser','lecturer','student',
      'principal_admin','vice_principal','bursar','teacher','parent')),
  constraint actor_provisioning_jobs_status_check
    check (status in ('pending_auth','pending_profile','pending_actor',
      'pending_authority','pending_credentials','active','recovery_required','failed')),
  constraint actor_provisioning_jobs_stage_check
    check (stage in ('auth','profile','actor','authority','credentials','complete')),
  constraint actor_provisioning_jobs_attempt_count_check
    check (attempt_count >= 0),
  constraint actor_provisioning_jobs_payload_object_check
    check (jsonb_typeof(request_payload) = 'object'),
  constraint actor_provisioning_jobs_completion_check
    check ((status = 'active' and completed_at is not null)
      or (status <> 'active' and completed_at is null))
);

create index if not exists actor_provisioning_jobs_institution_status_idx
  on public.actor_provisioning_jobs (institution_id, status, updated_at desc);
create index if not exists actor_provisioning_jobs_requester_idx
  on public.actor_provisioning_jobs (requested_by_user_id, created_at desc);
create index if not exists actor_provisioning_jobs_target_auth_idx
  on public.actor_provisioning_jobs (target_auth_user_id)
  where target_auth_user_id is not null;
create index if not exists actor_provisioning_jobs_identity_actor_idx
  on public.actor_provisioning_jobs (identity_actor_id)
  where identity_actor_id is not null;

comment on table public.actor_provisioning_jobs is
  'Trusted server-only idempotency and recovery ledger for institution actor provisioning. Never stores passwords, PINs, hashes or tokens.';
comment on column public.actor_provisioning_jobs.request_payload is
  'Allowlisted non-secret provisioning fields required to resume the same request. Readable only by trusted server operations.';
comment on column public.actor_provisioning_jobs.request_fingerprint is
  'SHA-256 fingerprint of normalized allowlisted request fields; rejects changed payloads on idempotent retry.';

alter table public.actor_provisioning_jobs enable row level security;
revoke all on table public.actor_provisioning_jobs from public, anon, authenticated;
grant all on table public.actor_provisioning_jobs to service_role;

commit;
