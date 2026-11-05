import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const migration = readFileSync(new URL('../supabase/migrations/20261105170000_cbt_commercial_core_v1.sql', import.meta.url), 'utf8');
const service = readFileSync(new URL('../src/services/cbtService.ts', import.meta.url), 'utf8');
const runner = readFileSync(new URL('../src/pages/cbt/CBTExamRunner.tsx', import.meta.url), 'utf8');
const payment = readFileSync(new URL('../supabase/functions/cbt-payments/index.ts', import.meta.url), 'utf8');

describe('CBT commercial execution contract', () => {
  it('keeps public access on the existing student/attempt identity foundation', () => {
    expect(migration).toContain('cbt_public_candidate_profiles');
    expect(migration).toContain('cbt_public_entitlements');
    expect(migration).toContain('create or replace function public.cbt_student_can_access_exam');
    expect(migration).toContain('public.cbt_public_candidate_profiles cp');
  });

  it('keeps payment confirmation server-only and amount-authoritative', () => {
    expect(migration).toContain('grant execute on function public.cbt_public_confirm_payment(text,text,bigint,text,jsonb) to service_role');
    expect(migration).toContain('p_amount_minor is distinct from v_order.amount_minor');
    expect(migration).toContain('p_currency');
    expect(payment).toContain('x-paystack-signature');
    expect(payment).toContain('HMAC');
    expect(payment).toContain('cbt_public_confirm_payment');
  });

  it('uses protected RPCs instead of browser-side attempt and answer inserts', () => {
    expect(service).toContain("rpc('create_cbt_attempt'");
    expect(service).toContain("rpc('submit_cbt_answer'");
    expect(migration).toContain("'saved',true,'time_remaining',v_remaining");
    expect(migration).not.toContain("'current_score',v_current_score");
    expect(service).toContain("rpc('submit_cbt_exam'");
    expect(service).not.toContain(".from('cbt_attempts').insert");
    expect(service).not.toContain(".from('cbt_answers').insert");
    expect(runner).not.toContain('correct_option');
  });

  it('has an idempotent server-side result lifecycle and candidate-owned retrieval', () => {
    expect(migration).toContain("if v_order.status='paid' then");
    expect(migration).toContain('on conflict(user_id,exam_id) do update');
    expect(migration).toContain('get_cbt_candidate_result');
    expect(migration).toContain('get_cbt_exam_results');
  });
});
