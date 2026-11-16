# HOEOS G6/G7 Acceptance Reconciliation
Date: 2026-11-16
Repository: mfventures01-maker/Gradifi
Base branch: `clean-deploy`
Base commit: `81cf1363704ba26aecf9466c6d8f23f8141f0c32`
Repair branch: `repair/g6-before-after-g7-public-receipt-2026-11-16`

## Authority and scope

The two uploaded forensic documents are the acceptance baseline for this work.

- `PowerShell Forensic Check.txt` defines the Commercial MVP gates. G6 is the Before/After Correction Report; G7 is Verification Receipt + Public Verification.
- `Forensic Implementation Baseline.txt` confirms the G5 scoring contract and states that no G5 scoring modification is justified. Preserve `overallSimilarity`, `highestSourceMatch`, unique matched-token coverage, and deterministic findings.

Do not confuse these G6/G7 commercial MVP gates with the older G6.1-G6.5 persistence milestones or the separate HOEOS v2 commercial buyer-validation document also named G7.

## G6 — Before/After Correction Report

### Required outcome from the acceptance baseline

A report must compare two independently verifiable receipts generated from two separate verification events:

1. Original submission and original immutable receipt.
2. Student correction, producing a new canonical document/hash.
3. Re-verification of the corrected submission.
4. New immutable receipt for the corrected submission.
5. Report calculated from those two receipts, showing original and corrected similarity, findings, resolved findings, and evidence sources.
6. Exact values must be derived from persisted receipt data and actual findings. No illustrative/hardcoded percentages.
7. The original receipt must never be mutated.

### Current repository evidence

- `src/components/verify/CorrectionPanel.tsx` exists and renders correction guidance, citation formatting, source navigation, and local checklist state.
- `tests/correction/correctionPanel.test.ts` tests filtering of verified findings and deterministic citation formatting.
- These files do not demonstrate an end-to-end correction editor, re-check event, immutable receipt pair, comparison model, or report derived from two independently retrieved receipts.
- The uploaded G5 baseline says deterministic student/source finding structures and offsets already exist. G5 scoring must remain unchanged.

### G6 classification

**NOT CERTIFIED / IMPLEMENTATION GAP.** Correction guidance is present; the required two-receipt before/after comparison workflow is not evidenced in the inspected current branch.

### G6 implementation contract

- Add explicit correction lineage linking original and corrected verification IDs without updating the original record.
- Re-run the existing G5 deterministic pipeline on the corrected canonical text; do not introduce a second scoring formula.
- Persist the corrected run as a distinct immutable receipt.
- Resolve both receipts independently before comparison.
- Compute displayed deltas from receipt values and findings, with null/unknown handled explicitly.
- Define finding resolution by stable evidence/finding identity and source mapping; do not infer resolution merely from a lower overall percentage.
- Include regression tests proving original receipt immutability, distinct corrected hash/receipt, exact delta calculations, missing receipt handling, and tamper detection.

## G7 — Verification Receipt + Public Verification

### Required outcome from the acceptance baseline

A third party with a receipt ID or QR must independently reach a public verification URL and verify:
- receipt ID;
- document identity/hash representation;
- result;
- evidence;
- source findings;
- integrity state.

The public result must not depend on the originating browser's React state or rerunning client-side evidence calculations.

### Current repository evidence

- `src/pages/verify/GradifiVerifyDemoPage.tsx` extracts `verificationId` using `useParams()` and invokes public resolution.
- `src/services/verify/publicVerificationService.ts` in `clean-deploy` selects `*`, then expects `evidence_envelope` and validates the persisted record.
- `src/services/verify/verificationPersistenceService.ts` stores `evidence_envelope` in the persistence record.
- `src/utils/qrGenerator.ts` and `e2e/public-verification-g7.spec.ts` provide QR/public route infrastructure and a Playwright scenario.
- The existing G7 E2E spec uses a fixed `VRF-ABCDEF121234` record and logs whether a PostgREST response was seen, but it does not assert that the response flag is true. A screenshot and a visible status alone are not sufficient proof of an independently fetched authoritative record.
- The existing migration `20261114105314_verify_receipt_column_allowlist_20261114.sql` grants anon/authenticated column SELECT including `evidence_envelope`. That conflicts with the privacy boundary required by the open PR #12.
- PR #12 (`fix/verify-persistence-auth-validation`, head `b344f94274a32bab1839bf1cd6c71572c07370cb`) is still an open draft. It changes public reads to metadata-only selection and removes the public dependency on `evidence_envelope`; it also adds authenticated server persistence. Its live Preview/auth/DB release gates remain outstanding. This branch does not merge or silently duplicate PR #12.

### G7 classification

**PARTIALLY IMPLEMENTED / NOT CERTIFIED AGAINST THE FULL ACCEPTANCE CONTRACT.** Public route, lookup, receipt metadata, and QR foundations exist. The current public contract does not expose a privacy-safe independently verifiable evidence/source-finding result. The legacy public query also depends on a private envelope and broad `select('*')`.

### G7 implementation contract

- Define a versioned, minimal public verification DTO containing only fields explicitly approved for public disclosure: receipt ID, document hash/fingerprint, evidence hash, engine/policy version, score, source/finding summary, and integrity result.
- Do not expose raw submitted text, canonical document rawText, private provider payloads, credentials, internal diagnostics, or the private `evidence_envelope`.
- Build the public DTO server-side from validated persisted evidence; do not trust a browser-supplied public summary.
- Separate public evidence summary storage/access from private evidence storage. Reconcile grants and RLS with PR #12 before any migration is applied.
- Replace `select('*')` with an explicit column allowlist matching the public DTO.
- Make public resolution verify the receipt ID/hash relationship and the public evidence summary integrity. Label metadata-only validation honestly; do not call it full evidence integrity.
- QR must encode the canonical public URL and resolve in a clean browser context with no originating session.
- E2E must assert the actual database/API response, the rendered receipt fields and source findings, a valid integrity state, and negative cases (missing, malformed, tampered, unavailable). Use a controlled seeded non-production fixture, not an unexplained hardcoded ID.
- Ensure a privacy test proves anon/authenticated cannot read the private envelope while the intended public DTO remains readable.

## Cross-gate invariants

1. G5 remains the only similarity authority for `/tools/plagiarism`; do not change its scoring formulas.
2. A correction creates a new verification event and receipt. Existing receipts are immutable.
3. G6 comparisons use independently resolved receipts, not transient UI state.
4. G7 public verification uses an explicit privacy-safe DTO, never the private evidence envelope.
5. Distinguish STATIC, STRUCTURAL, RUNTIME, and CERTIFICATION evidence. Unit tests or screenshots alone do not prove live Supabase persistence or third-party resolution.
6. No Supabase migration, grant, policy change, real DB write, PR merge, or Production deployment is authorized by this reconciliation.

## Work order on this branch

1. Implement and test G6 correction lineage + immutable receipt comparison.
2. Define and implement the privacy-safe G7 public evidence contract, coordinated with the open PR #12 trust boundary.
3. Add seeded non-production E2E coverage for clean-session QR resolution and integrity/failure branches.
4. Run GitHub Actions and inspect all results.
5. Keep the branch unmerged until the owner reviews the diff and explicitly authorizes any database or release action.

## Source references inspected

- Uploaded `PowerShell Forensic Check.txt`, sections G0-G12, especially G5, G6, G7, G8, and Final Commercial MVP Gate.
- Uploaded `Forensic Implementation Baseline.txt`, HOEOS Seven-Question Gate and G5 deterministic scoring/finding contract.
- `src/components/verify/CorrectionPanel.tsx`
- `tests/correction/correctionPanel.test.ts`
- `src/pages/verify/GradifiVerifyDemoPage.tsx`
- `src/services/verify/publicVerificationService.ts`
- `src/services/verify/verificationPersistenceService.ts`
- `src/utils/qrGenerator.ts`
- `e2e/public-verification-g7.spec.ts`
- `supabase/migrations/20261114105314_verify_receipt_column_allowlist_20261114.sql`
- Open draft PR #12: `fix/verify-persistence-auth-validation`
