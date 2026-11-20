create table if not exists public.verify_document_uploads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid null references public.tenants(id) on delete restrict,
  institution_id uuid not null references public.institutions(id) on delete restrict,
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  bucket_id text not null default 'verify-private',
  object_path text not null unique,
  original_filename text not null,
  content_type text not null,
  byte_size bigint not null check (byte_size > 0 and byte_size <= 20971520),
  source_file_sha256 text not null check (source_file_sha256 ~ '^[a-f0-9]{64}$'),
  extraction_status text not null default 'uploaded'
    check (extraction_status in ('uploaded','extracting','extracted','failed')),
  canonicalization_status text not null default 'pending'
    check (canonicalization_status in ('pending','completed','failed')),
  canonicalization_version text null,
  extracted_text_sha256 text null check (extracted_text_sha256 is null or extracted_text_sha256 ~ '^[a-f0-9]{64}$'),
  canonical_document_hash text null check (canonical_document_hash is null or canonical_document_hash ~ '^[a-f0-9]{64}$'),
  verification_run_id uuid null references public.verification_runs(id) on delete set null,
  error_code text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, institution_id, owner_user_id)
);

create index if not exists verify_uploads_owner_created_idx
  on public.verify_document_uploads(owner_user_id, created_at desc);
create index if not exists verify_uploads_institution_created_idx
  on public.verify_document_uploads(institution_id, created_at desc);
create index if not exists verify_uploads_run_idx
  on public.verify_document_uploads(verification_run_id)
  where verification_run_id is not null;

alter table public.verify_document_uploads enable row level security;
alter table public.verify_document_uploads force row level security;
revoke all on public.verify_document_uploads from public, anon;
grant select on public.verify_document_uploads to authenticated;
grant all on public.verify_document_uploads to service_role;

drop policy if exists "Verify uploads owner or institution member read" on public.verify_document_uploads;
create policy "Verify uploads owner or institution member read"
on public.verify_document_uploads for select to authenticated
using (
  owner_user_id = (select auth.uid())
  or public.is_current_user_institution_member(institution_id)
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'verify-private',
  'verify-private',
  false,
  20971520,
  array[
    'application/pdf',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
set public = false,
    file_size_limit = 20971520,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Verify private objects readable by owner or institution member" on storage.objects;
create policy "Verify private objects readable by owner or institution member"
on storage.objects for select to authenticated
using (
  bucket_id = 'verify-private'
  and exists (
    select 1
    from public.verify_document_uploads u
    where u.bucket_id = storage.objects.bucket_id
      and u.object_path = storage.objects.name
      and (
        u.owner_user_id = (select auth.uid())
        or public.is_current_user_institution_member(u.institution_id)
      )
  )
);

revoke all on storage.objects from anon;
;
