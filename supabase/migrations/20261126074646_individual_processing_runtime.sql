alter table public.verify_document_uploads
  add column if not exists canonical_object_path text,
  add column if not exists extraction_method text,
  add column if not exists ocr_used boolean not null default false,
  add column if not exists ocr_confidence numeric;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.verify_document_uploads'::regclass
      and conname = 'verify_upload_canonical_path_scope_check'
  ) then
    alter table public.verify_document_uploads
      add constraint verify_upload_canonical_path_scope_check
      check (
        canonical_object_path is null
        or canonical_object_path =
          workspace_id::text || '/' || owner_user_id::text || '/' || id::text || '/canonical.txt'
      );
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.verify_document_uploads'::regclass
      and conname = 'verify_upload_ocr_confidence_range_check'
  ) then
    alter table public.verify_document_uploads
      add constraint verify_upload_ocr_confidence_range_check
      check (ocr_confidence is null or (ocr_confidence >= 0 and ocr_confidence <= 100));
  end if;
end $$;

create unique index if not exists verify_upload_canonical_object_path_uidx
  on public.verify_document_uploads(canonical_object_path)
  where canonical_object_path is not null;

update storage.buckets
set allowed_mime_types = array[
  'application/pdf',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png'
]
where id = 'verify-private';
