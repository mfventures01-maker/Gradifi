drop trigger if exists verification_run_lifecycle_guard on public.verification_runs;
drop trigger if exists zz_verification_run_lifecycle_guard on public.verification_runs;
create trigger zz_verification_run_lifecycle_guard
before insert or update on public.verification_runs
for each row execute function private.enforce_verification_run_lifecycle();
