import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const service = readFileSync(new URL('../src/services/cbtService.ts', import.meta.url), 'utf8');
const runner = readFileSync(new URL('../src/pages/cbt/CBTExamRunner.tsx', import.meta.url), 'utf8');
const migration = readFileSync(new URL('../supabase/migrations/20261107090000_cbt_p0_table_privilege_hardening.sql', import.meta.url), 'utf8');
const acceptance = readFileSync(new URL('../supabase/tests/cbt_p0_table_privilege_acceptance.sql', import.meta.url), 'utf8');

describe('CBT P0-01 table privilege contract', () => {
  it('persists session snapshots only through the authenticated server RPC', () => {
    expect(service).toContain("rpc('persist_cbt_session_snapshot' as any");
    expect(service).toContain('p_session_id: sessionId');
    expect(service).toContain('p_current_question: currentQuestion');
    expect(service).toContain('p_remaining_time: Math.max(0, Math.floor(remainingTime))');
    expect(service).not.toMatch(/\.from\(['"]cbt_session_snapshots['"]\)\s*\.insert/);
    expect(runner).toContain('cbtService.saveSessionSnapshot(attempt.session_id, questionIndex, seconds)');
    expect(runner).not.toMatch(/saveSessionSnapshot\([^\n]*sessionState/);
  });

  it('fails closed when the branch migration prerequisites are absent', () => {
    expect(migration).toContain("to_regprocedure('public.persist_cbt_session_snapshot(uuid,integer,integer)')");
    expect(migration).toContain('Reconcile CBT migration lineage before applying');
    for (const relation of [
      'cbt_sessions',
      'cbt_session_snapshots',
      'gradifi_exam_question_map',
      'gradifi_exam_question_snapshots',
      'gradifi_question_bank_answer_keys',
      'gradifi_question_bank_items',
      'gradifi_question_bank_options',
      'gradifi_question_bank_versions',
      'cbt_public_candidate_profiles',
      'cbt_public_offers',
      'cbt_public_orders',
      'cbt_public_entitlements',
    ]) {
      expect(migration).toContain('public.' + relation);
    }
  });

  it('revokes client write and structural privileges while restoring only approved reads', () => {
    for (const relation of [
      'cbt_sessions',
      'cbt_session_snapshots',
      'gradifi_exam_question_map',
      'gradifi_exam_question_snapshots',
      'gradifi_question_bank_answer_keys',
      'gradifi_question_bank_items',
      'gradifi_question_bank_options',
      'gradifi_question_bank_versions',
      'cbt_public_candidate_profiles',
      'cbt_public_offers',
      'cbt_public_orders',
      'cbt_public_entitlements',
    ]) {
      expect(migration).toContain('revoke all privileges on table public.' + relation);
    }
    expect(migration).toContain('grant select on table public.cbt_sessions');
    expect(migration).toContain('public.cbt_session_snapshots to authenticated');
    expect(migration).toContain('public.gradifi_question_bank_versions to anon, authenticated');
    expect(migration).toContain('public.cbt_public_offers to anon, authenticated');
    expect(migration).not.toMatch(/alter default privileges/i);
  });

  it('provides read-only SQL assertions for effective ACLs and RPC execution', () => {
    expect(acceptance).toContain("has_table_privilege(v_role");
    expect(acceptance).toContain("'TRUNCATE'");
    expect(acceptance).toContain("'REFERENCES'");
    expect(acceptance).toContain("'TRIGGER'");
    expect(acceptance).toContain('persist_cbt_session_snapshot');
    expect(acceptance).toContain("has_function_privilege(\n    'anon'");
  });
});
