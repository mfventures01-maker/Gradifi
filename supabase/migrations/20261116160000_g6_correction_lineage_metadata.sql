-- G6 correction lineage metadata.
-- Candidate only: do not apply until explicitly approved and reconciled with live grants.
begin;
alter table public.public_verification_records
  add column if not exists correction_of_verification_id text null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'public_verification_records_correction_parent_fkey'
      and conrelid = 'public.public_verification_records'::regclass
  ) then
    alter table public.public_verification_records
      add constraint public_verification_records_correction_parent_fkey
      foreign key (correction_of_verification_id)
      references public.public_verification_records (verification_id)
      on update restrict on delete restrict;
  end if;
end $$;

alter table public.public_verification_records
  drop constraint if exists public_verification_records_no_self_correction;
alter table public.public_verification_records
  add constraint public_verification_records_no_self_correction
  check (correction_of_verification_id is null or correction_of_verification_id <> verification_id);

-- The pointer is approved receipt metadata. This does not grant access to evidence_envelope.
grant select (correction_of_verification_id)
  on table public.public_verification_records to anon, authenticated;

create index if not exists public_verification_records_correction_parent_idx
  on public.public_verification_records (correction_of_verification_id)
  where correction_of_verification_id is not null;
commit;
