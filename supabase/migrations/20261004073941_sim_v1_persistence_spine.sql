create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  status text not null default 'active'
    check (status in ('active','inactive','retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_versions (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id),
  version text not null,
  engine_version text,
  policy_version text,
  canonicalization_version text,
  status text not null default 'draft'
    check (status in ('draft','active','retired')),
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  unique (service_id, version)
);

create table if not exists public.price_versions (
  id uuid primary key default gen_random_uuid(),
  service_version_id uuid not null references public.service_versions(id),
  version text not null,
  amount numeric(14,2) not null check (amount >= 0),
  currency text not null,
  status text not null default 'draft'
    check (status in ('draft','active','retired')),
  effective_from timestamptz not null default now(),
  effective_to timestamptz,
  created_at timestamptz not null default now(),
  unique (service_version_id, version),
  check (effective_to is null or effective_to > effective_from)
);

create table if not exists public.billable_events (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id),
  school_id uuid references public.schools(id),
  service_version_id uuid not null references public.service_versions(id),
  price_version_id uuid references public.price_versions(id),
  idempotency_key text not null,
  quantity integer not null default 1 check (quantity > 0),
  unit_amount numeric(14,2) check (unit_amount >= 0),
  total_amount numeric(14,2) check (total_amount >= 0),
  currency text,
  status text not null default 'pending'
    check (status in ('pending','confirmed','cancelled','refunded')),
  actor_user_id uuid references auth.users(id),
  request_fingerprint text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  unique (institution_id, idempotency_key)
);

create table if not exists public.verification_runs (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id),
  school_id uuid references public.schools(id),
  service_version_id uuid not null references public.service_versions(id),
  billable_event_id uuid references public.billable_events(id),
  verification_id text,
  source_submission_id uuid references public.submissions(id),
  document_hash text,
  canonical_document_hash text,
  evidence_hash text,
  manifest_hash text,
  result_hash text,
  engine_version text,
  policy_version text,
  status text not null default 'queued'
    check (status in ('queued','running','succeeded','failed','superseded','cancelled')),
  attempt integer not null default 1 check (attempt > 0),
  parent_run_id uuid references public.verification_runs(id),
  result jsonb,
  error_code text,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists verification_runs_verification_id_uq
  on public.verification_runs(verification_id)
  where verification_id is not null;

create index if not exists verification_runs_billable_event_idx
  on public.verification_runs(billable_event_id);

create index if not exists verification_runs_document_hash_idx
  on public.verification_runs(document_hash);

create index if not exists billable_events_institution_created_idx
  on public.billable_events(institution_id, created_at desc);

create index if not exists service_versions_service_status_idx
  on public.service_versions(service_id, status);

create index if not exists price_versions_service_version_status_idx
  on public.price_versions(service_version_id, status);

alter table public.services enable row level security;
alter table public.service_versions enable row level security;
alter table public.price_versions enable row level security;
alter table public.billable_events enable row level security;
alter table public.verification_runs enable row level security;

drop policy if exists "Authenticated users can read active services" on public.services;
create policy "Authenticated users can read active services"
on public.services for select
to authenticated
using (status = 'active');

drop policy if exists "Authenticated users can read active service versions" on public.service_versions;
create policy "Authenticated users can read active service versions"
on public.service_versions for select
to authenticated
using (
  status = 'active'
  and exists (
    select 1 from public.services s
    where s.id = service_versions.service_id
      and s.status = 'active'
  )
);

drop policy if exists "Authenticated users can read active price versions" on public.price_versions;
create policy "Authenticated users can read active price versions"
on public.price_versions for select
to authenticated
using (
  status = 'active'
  and effective_from <= now()
  and (effective_to is null or effective_to > now())
);

drop policy if exists "Institution members can read billable events" on public.billable_events;
create policy "Institution members can read billable events"
on public.billable_events for select
to authenticated
using (
  exists (
    select 1
    from public.tenant_identity_map tim
    where tim.user_id = (select auth.uid())
      and tim.institution_id = billable_events.institution_id
  )
);

drop policy if exists "Institution members can read verification runs" on public.verification_runs;
create policy "Institution members can read verification runs"
on public.verification_runs for select
to authenticated
using (
  exists (
    select 1
    from public.tenant_identity_map tim
    where tim.user_id = (select auth.uid())
      and tim.institution_id = verification_runs.institution_id
  )
);

insert into public.services (code, name, description, status)
values (
  'SIM',
  'Similarity Verification',
  'Deterministic document similarity verification using the certified G5/G3 authority boundary.',
  'active'
)
on conflict (code) do nothing;

insert into public.service_versions (
  service_id, version, engine_version, policy_version, status, activated_at
)
select
  s.id,
  'SIM-V1',
  'G5-DETERMINISTIC-v1',
  'G3-POLICY-v1',
  'active',
  now()
from public.services s
where s.code = 'SIM'
on conflict (service_id, version) do nothing;
