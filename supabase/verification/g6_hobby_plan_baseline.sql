-- Synthetic PostgreSQL fixture matching the inspected production grant shape.
\set ON_ERROR_STOP on

do $$
begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin; end if;
end $$;

drop schema if exists public cascade;
create schema public;
grant usage on schema public to anon, authenticated, service_role;

create table public.public_verification_records (
  id uuid primary key default gen_random_uuid(),
  verification_id text not null unique,
  document_hash text not null,
  evidence_hash text not null,
  engine_version text not null,
  policy_version text not null,
  overall_similarity numeric not null check (overall_similarity between 0 and 100),
  total_sources_found integer not null default 0,
  evidence_envelope jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.public_verification_records enable row level security;
create policy "Public Verification Record Select Policy"
  on public.public_verification_records for select to anon, authenticated using (true);

-- Reproduce the current production privilege shape: metadata plus the
-- unintended evidence_envelope grant, but no table-level SELECT.
grant select (
  verification_id, document_hash, evidence_hash, engine_version,
  policy_version, overall_similarity, total_sources_found,
  evidence_envelope, created_at
) on public.public_verification_records to anon, authenticated;
grant select, insert on public.public_verification_records to service_role;

insert into public.public_verification_records
  (verification_id, document_hash, evidence_hash, engine_version, policy_version,
   overall_similarity, total_sources_found, evidence_envelope)
values
  ('fixture-original', repeat('a',64), repeat('b',64), 'G5-DETERMINISTIC-v1',
   'G3-POLICY-v1', 12.5, 1, '{"private":"synthetic-only"}'::jsonb);

-- Apply the ordered privacy repair, then G6 lineage migration from the workflow.
