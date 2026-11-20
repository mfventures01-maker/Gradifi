# Gradifi Primary Worktree Gate Map: Onboarding + G0-G12
Date: 2026-11-20
Branch: `integration/gradifi-primary-2026-11-20`

## Single-worktree rule

The onboarding wizard, higher-education root registration, actor onboarding backend, G1-G12 verification code/tests, G6 correction comparison, G7 public receipt client, G8 persistence tests, and the primary CI workflow are kept on this branch.

The workflow is `.github/workflows/gradifi-primary-g0-g12.yml`. It runs one sequential job on the same checked-out commit. The onboarding browser smoke runs immediately after G0 and before G1, followed by G1 through G12 in order. A failed gate stops the sequence.

## Gate evidence map

| Gate | Required function | Automated evidence |
|---|---|---|
| G0 | Freeze the commit, typecheck, build | `npm run typecheck`, `npm run build` |
| Onboarding | School wizard and higher-ed registration | `e2e/onboarding-entrypoints.spec.ts`; actor recovery and higher-ed authority contract suites |
| G1 | Ingest supported document formats | `tests/g1_all_17_formats_contract.test.ts`, `tests/g1_format_matrix.test.ts` |
| G2 | Canonical document and offset authority | `tests/canonicalTextOffsetModel.test.ts`, `tests/g2_canonical_evidence_regression.test.ts`, `tests/deterministicSimilarityEvidence.test.ts` |
| G3 | Deterministic forensic findings | `tests/g3_deterministic_forensic_e2e.test.ts` |
| G4 | Source alignment and rendered highlights | `tests/g4b_canonical_source_alignment.test.ts`, `tests/g4c_production_finding_coordinate_integrity.test.ts`, `tests/matchedTextHighlighting.test.ts` |
| G5 | Student correction and deterministic rerun | `tests/studentCorrectionLifecycle.test.ts` |
| G6 | Trusted before/after comparison | `tests/trustedCorrectionComparison.test.ts`, `tests/verifyPersistenceAuthorization.test.ts` |
| G7 | Public receipt RPC and privacy allowlist | `tests/publicReceiptPrivacy.test.ts`, `tests/publicVerificationResolution.test.ts`, `tests/publicVerificationResultContract.test.ts` |
| G8 | Persistence and evidence integrity | `tests/g4d_persisted_evidence_integrity.test.ts`, `tests/verificationPersistence.test.ts` |
| G9 | Provider federation reliability | `tests/federationHardening.test.ts` |
| G10 | Auth, actor authority and AI output security | `tests/aiOutputFirewall.test.ts`, `tests/actorProvisioningRecoveryEngine.test.ts`, `tests/actorProvisioningRecoverySchema.test.ts`, `tests/higherEdAuthorityContract.test.ts` |
| G11 | Onboarding and public verification browser UX | `e2e/onboarding-entrypoints.spec.ts`, `e2e/public-verification-route.spec.ts` |
| G12 | Unified release contract | `tests/hoeosPrimaryGateMap.test.ts`, typecheck and build |

## Current qualification

- The CI workflow connects the onboarding smoke test to the G1-G12 sequence.
- The G6 correction UI, authenticated BFF/API paths, server comparison handler and tests are now on the same branch.
- The G7 public service uses the SECURITY DEFINER receipt RPC, not direct table SELECT.
- G6/G7/G8 remain structurally incomplete against production until trusted persistence creates and binds `verification_runs` and complete public receipt metadata.
- The complete G12 golden-path browser test is retained but is not executed by this CI workflow because it writes verification records. The CI G12 job is static/structural and uses placeholder Supabase credentials. No production writes are attempted.

## Production-write boundary

The workflow does not use the production service-role key and does not run the full persistence/public-receipt golden path. The SQL proposal is under `supabase/proposals/`, not `supabase/migrations/`. Production remains untouched pending explicit approval.
