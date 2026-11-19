import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL("../supabase/migrations/20261117130000_oir01_actor_provisioning_recovery_ledger.sql", import.meta.url),
  "utf8",
);

describe("OIR-01 actor provisioning recovery schema", () => {
  it("creates a durable idempotency ledger without replacing canonical identity tables", () => {
    expect(migration).toContain("create table if not exists public.actor_provisioning_jobs");
    expect(migration).toContain("unique (idempotency_key)");
    expect(migration).not.toMatch(/drop table\s+public\.(profiles|identity_actors)/i);
  });

  it("binds recovery jobs to institution, initiating authority and canonical actor records", () => {
    expect(migration).toContain("references public.institutions(id)");
    expect(migration).toContain("references auth.users(id)");
    expect(migration).toContain("references public.identity_actors(id)");
    expect(migration).toContain("root_authority_user_id");
    expect(migration).toContain("requested_by_user_id");
  });

  it("supports explicit resumable lifecycle states and retry tracking", () => {
    for (const state of ["pending_auth", "pending_profile", "pending_actor", "pending_authority", "pending_credentials", "recovery_required", "active"]) {
      expect(migration).toContain(state);
    }
    expect(migration).toContain("attempt_count");
    expect(migration).toContain("last_error_code");
    expect(migration).toContain("request_fingerprint");
  });

  it("does not persist credentials or expose recovery payloads to browser roles", () => {
    expect(migration).toContain("Never stores passwords, PINs, hashes or tokens");
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("revoke all on table public.actor_provisioning_jobs from public, anon, authenticated");
    expect(migration).toContain("grant all on table public.actor_provisioning_jobs to service_role");
  });

  it("requires active jobs to have a completion timestamp", () => {
    expect(migration).toContain("status = 'active' and completed_at is not null");
  });
});
