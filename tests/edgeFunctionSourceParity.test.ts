import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('Supabase Edge Function source and dependency parity', () => {
  it('routes subordinate actor provisioning through the recovery implementation', () => {
    const entry = read('../supabase/functions/actor-onboarding/index.ts');
    const recovery = read('../supabase/functions/actor-onboarding/subordinate-recovery.ts');

    expect(entry).toContain('import { provisionSubordinateActor } from "./subordinate-recovery.ts"');
    expect(entry).toContain('await provisionSubordinateActor(admin, {');
    expect(recovery).toContain('export async function provisionSubordinateActor');
    expect(entry).not.toContain('admin.rpc("complete_actor_onboarding"');
  });

  it('keeps Verify entrypoint imports on the canonical shared dependency graph', () => {
    const entry = read('../supabase/functions/verify/index.ts');
    const types = read('../supabase/functions/_shared/verify/types.ts');
    const engine = read('../supabase/functions/_shared/verify/deterministicEngine.ts');
    const normalizer = read('../supabase/functions/_shared/verify/documentNormalizer.ts');
    const policy = read('../supabase/functions/_shared/verify/plagiarismPolicy.ts');

    expect(entry).toContain('../_shared/verify/deterministicEngine.ts');
    expect(entry).toContain('../_shared/verify/documentNormalizer.ts');
    expect(entry).toContain('../_shared/verify/plagiarismPolicy.ts');
    expect(entry).toContain('../_shared/verify/types.ts');
    expect(entry).toContain('../_shared/processing/extract.ts');
    expect(types).toContain("| 'RATE_LIMITED'");
    expect(engine).toContain("from './types.ts'");
    expect(engine).toContain("from './documentNormalizer.ts'");
    expect(normalizer).toContain("from './types.ts'");
    expect(policy).toContain("from './types.ts'");
    expect(policy).toContain("from './documentNormalizer.ts'");
  });

  it('keeps OCR on the same canonical shared extraction implementation', () => {
    const entry = read('../supabase/functions/ocr-processor/index.ts');
    const extraction = read('../supabase/functions/_shared/processing/extract.ts');

    expect(entry).toContain('../_shared/processing/extract.ts');
    expect(extraction).toContain('export async function extractUploadedDocument');
    expect(extraction).toContain('export async function sha256Hex');
    expect(entry).not.toContain('from "./extract.ts"');
  });
});
