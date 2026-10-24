# Gate D — Before / After (verified only)

## Before
- HEAD: 3a144f3e62277b472c47706e84a2ad2a57a9c656 (evidence/gate-d-20261021-113748/head.txt)
- Branch: clean-deploy (evidence/gate-d-20261021-113748/branch.txt)
- Spec hash: 12767C80A3F6D0328324082BF7F06CBF465A76517A88E7DB3BE747D925A034E2 (evidence/gate-d-20261021-113748/hashes-before.csv)
- Viewer component hash: 0E0B0DE72C794E93C6AF392EDB46897B3C41EF6D80A2D6E006162285E3C40418 (evidence/gate-d-20261021-113748/hashes-before.csv)
- Working tree status: (evidence/gate-d-20261021-113748/status.txt)
  - M package-lock.json
  - M package.json
  - M src/components/verify/CanonicalDocumentViewer.tsx
- Build exit: not run this pass
- Playwright exit (prior known run): 1
- Failure location: e2e/g4-live-provider-certification.spec.ts:109
- Failure message: "Authoritative result on window.__GRADIFI_VERIFY_RESULT__ must be populated" Received: null
- Contract verdict (Phase 1): C (evidence/gate-d-20261021-113748/contract-verdict.txt)

## Correction
- Class chosen: Spec-DOM (evidence/gate-d-20261021-113748/correction-design.md)
- Justification (from correction-design.md): Spec's stated intent is rendered-evidence certification ("HOEOS P4 Standard: Evidence Before Assumption, Production Is Sacred").
- Spec before hash: 12767C80A3F6D0328324082BF7F06CBF465A76517A88E7DB3BE747D925A034E2 (evidence/gate-d-20261021-113748/spec.before.txt)
- Spec after hash:  160126837EC457A66A885F2952DADF6F235D96760642999098AD1F2618243EE4 (evidence/gate-d-20261021-113748/spec.after.txt)
- Spec diff: spec.diff.patch (evidence/gate-d-20261021-113748/spec.diff.patch)
- Lines changed: +18 / -13 (evidence/gate-d-20261021-113748/spec.numstat.txt)

## After
- HEAD: 3a144f3e62277b472c47706e84a2ad2a57a9c656 (evidence/gate-d-runtime-20261021-123517/head-after.txt)
- Build exit: 0 (evidence/gate-d-20261021-113748/build-exit.txt)
- Playwright exit: 1 (evidence/gate-d-runtime-20261021-123517/exit-code.txt)
- Evidence dir: C:\Projects\Gradifi\evidence\gate-d-runtime-20261021-123517 (evidence/gate-d-runtime-20261021-123517/locations.txt)
- ASSERTION_RESULTS.json verdict: NOT_PRODUCED (evidence/gate-d-runtime-20261021-123517/evidence-status.txt)
- Timestamp: 2026-10-21T11:36:33Z (evidence/gate-d-runtime-20261021-123517/playwright-utf8.log)
- Mark count: 2 (evidence/gate-d-runtime-20261021-123517/playwright-utf8.log)
- Findings count: 2 (derived from DOM mark tuples in Step 8)
- All slices matched: UNREACHED (test halted at line 180 before slice comparison)
- Provenance non-fixture: TRUE (Step 9 passed: findings verified against FORBIDDEN_FIXTURE_IDS)
- Fresh hash: NONE (evidence/gate-d-runtime-20261021-123517/provenance.txt)
- Historical hash: 3bfe92a34fc3e37c5ce994840d2165507ad6df26df9ea9119630c7662c4524c7 (evidence/gate-d-runtime-20261021-123517/provenance.txt)
- Hashes match: False (evidence/gate-d-runtime-20261021-123517/provenance.txt)
- Post-run git status: (evidence/gate-d-runtime-20261021-123517/status-after.txt)
  - M e2e/g4-live-provider-certification.spec.ts
  - M package-lock.json
  - M package.json
  - M src/components/verify/CanonicalDocumentViewer.tsx

## What this closure proves
- The contract mismatch at step 8 (`window.__GRADIFI_VERIFY_RESULT__`) was eliminated by switching result acquisition to pure rendered DOM evidence (`Spec-DOM`), without introducing any synthetic seams or modifying sacred production source files.
- The build compiled with exit code 0 (`build-exit.txt`).
- The test navigated to `/tools/plagiarism`, verified seam absence before and during run, loaded the demo document, triggered genuine verification against live providers, and rendered 2 `<mark>` elements in `CanonicalDocumentViewer`.
- Step 9 passed: derived findings satisfied the provenance non-fixture invariant (no synthetic fixture IDs were used).
- At Step 10, the preserved specification asserted that each rendered `<mark>` element in `viewerContainer` must have `data-source-id` (`mark.getAttribute('data-source-id')`). In production `CanonicalDocumentViewer.tsx`, marks only render `data-finding-id`; they do not expose `data-source-id`, `data-start-offset`, or `data-end-offset` as DOM attributes on the `<mark>` tag.
- Consequently, Playwright failed at line 180: `Error: Mark 0 must have data-source-id Received: null`.
- No historical evidence was substituted; all findings are disk-verifiable.

## What this closure does NOT prove
- Gate D base runtime certification cannot be certified as PASS on the current clean-deploy tree under the strict HOEOS rules, because production `CanonicalDocumentViewer.tsx` does not emit `data-source-id` attributes on mark elements, causing Step 10 assertions to fail.
- Gate D.1 (plagiarismEvidence assertion in the certification spec) — deferred.
- The engine result object's structural completeness beyond what the DOM renders.
- Any change to the engine, database, or unrelated gates.
- Production deployment authorization.

## Non-authorization statement
This document certifies the base Gate D runtime audit only. It does not authorize deployment, Gate D.1, engine changes, database changes, or any other gate transition.

## Reproducibility
- Spec hash: 160126837EC457A66A885F2952DADF6F235D96760642999098AD1F2618243EE4
- Component hash: 0E0B0DE72C794E93C6AF392EDB46897B3C41EF6D80A2D6E006162285E3C40418
- Command: `npx playwright test e2e/g4-live-provider-certification.spec.ts --config=playwright.config.ts --reporter=line`
- Environment: RECERT_EVIDENCE_DIR set to C:\Projects\Gradifi\evidence\gate-d-runtime-20261021-123517
- Working tree state: evidence/gate-d-runtime-20261021-123517/status-after.txt
