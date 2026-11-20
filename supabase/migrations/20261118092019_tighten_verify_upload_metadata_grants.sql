revoke all on public.verify_document_uploads from public, anon, authenticated;
grant select on public.verify_document_uploads to authenticated;
grant all on public.verify_document_uploads to service_role;
