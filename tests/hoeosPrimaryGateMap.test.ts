import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('Gradifi primary worktree integration contract', () => {
  it('connects school and higher-education onboarding routes in the application router', () => {
    const app = read('src/App.tsx');
    expect(app).toContain('path="/onboarding"');
    expect(app).toContain('path="/onboarding/higher-education/register"');
    expect(app).toContain('path="/onboarding/higher-education"');
  });

  it('connects root onboarding and staff provisioning to the canonical actor-onboarding function', () => {
    const onboarding = read('src/services/onboardingService.ts');
    const actors = read('src/services/actorOnboardingService.ts');
    expect(onboarding).toContain("functions.invoke('actor-onboarding'");
    expect(onboarding).toContain('completePendingRootRegistration');
    expect(actors).toContain('actor-onboarding');
  });

  it('connects G5 correction reruns to trusted G6 persistence and comparison endpoints', () => {
    const page = read('src/pages/verify/GradifiVerifyDemoPage.tsx');
    const persistence = read('src/services/verify/server/persistenceServerHandler.ts');
    const compareClient = read('src/services/verify/correctionComparisonClient.ts');
    const compareApi = read('api/verify/compare-correction.ts');
    expect(page).toContain('handleSubmitCorrection');
    expect(page).toContain('requestCorrectionComparison');
    expect(persistence).toContain('correctionOfVerificationId');
    expect(persistence).toContain('validatePayload(payload)');
    expect(compareClient).toContain('/api/verify/compare-correction');
    expect(compareApi).toContain('handleCorrectionComparisonRequest');
  });

  it('uses the public receipt RPC instead of direct public table reads', () => {
    const service = read('src/services/verify/publicVerificationService.ts');
    expect(service).toContain("supabase.rpc('lookup_public_verification'");
    expect(service).not.toContain(".from('public_verification_records')");
  });

  it('keeps all G0-G12 gate evidence and onboarding smoke coverage in this repository tree', () => {
    const required = [
      'e2e/onboarding-entrypoints.spec.ts',
      'tests/g1_all_17_formats_contract.test.ts',
      'tests/g1_format_matrix.test.ts',
      'tests/g2_canonical_evidence_regression.test.ts',
      'tests/deterministicSimilarityEvidence.test.ts',
      'tests/g3_deterministic_forensic_e2e.test.ts',
      'tests/g4b_canonical_source_alignment.test.ts',
      'tests/g4c_production_finding_coordinate_integrity.test.ts',
      'tests/studentCorrectionLifecycle.test.ts',
      'tests/trustedCorrectionComparison.test.ts',
      'tests/publicReceiptPrivacy.test.ts',
      'tests/g4d_persisted_evidence_integrity.test.ts',
      'tests/federationHardening.test.ts',
      'tests/aiOutputFirewall.test.ts',
      'tests/higherEdAuthorityContract.test.ts',
      'e2e/public-verification-route.spec.ts',
      'e2e/golden-path-demo-e2e.spec.ts',
    ];
    for (const path of required) {
      expect(existsSync(new URL(`../${path}`, import.meta.url)), path).toBe(true);
    }
  });

  it('defines one primary workflow with onboarding as a prerequisite to G1-G12', () => {
    const workflow = read('.github/workflows/gradifi-primary-g0-g12.yml');
    expect(workflow).toContain('primary-g0-g12:');
    const orderedSteps = [
      'G0 - Freeze commit and install',
      'Onboarding - School wizard and higher-education registration',
      'G1 - Document ingestion',
      'G2 - Canonical document authority',
      'G3 - Deterministic forensic evidence',
      'G4 - Source alignment, offsets and highlighting',
      'G5 - Student correction and deterministic re-verification',
      'G6 - Trusted before/after correction report',
      'G7 - Public receipt and privacy boundary',
      'G8 - Persistence and immutable evidence integrity',
      'G9 - Provider federation hardening',
      'G10 - Auth, tenant and AI authority security',
      'G11 - Onboarding and public verification UX',
      'G12 - Unified commercial MVP release contract',
    ];
    const positions = orderedSteps.map(step => workflow.indexOf(`name: ${step}`));
    expect(positions.every(position => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(workflow).toContain('RUNTIME_PRODUCTION_E2E_NOT_RUN');
  });
});
