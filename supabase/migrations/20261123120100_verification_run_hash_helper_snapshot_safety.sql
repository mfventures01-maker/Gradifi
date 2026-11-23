-- The verifier is called after writes in the same transaction; VOLATILE ensures fresh statement snapshots.
alter function private.verification_run_hashes_match(uuid) volatile;
