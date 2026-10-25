# G2 DETERMINISTIC CANONICAL AUTHORITY — CERTIFICATION VERDICT

**Gate:** G2 — Deterministic Canonical Authority
**Certified at:** HEAD=20bd207b0c9e207b04054e7c487b4316f093c543
**Generated:** 2026-10-24T21:57:45.1990383Z
**Verifier repair:** 8985442d… → c4391f30… (four blocks: strict parser, parsed gate results, pinned counts, derived exit code)

---

## 1. Gate identity and acceptance criteria

G2 certifies that the canonical document identity produced by `deterministicEngine.ts` is deterministic under repeated execution, stable across processes, invariant to filename and MIME metadata, changed by content mutation, independent of clock and randomness, and derived exclusively from server-origin canonicalization. The gate does not certify detection accuracy or segmentation fidelity.

**Acceptance criteria (six, all satisfied):**

1. Suite process exits 0.
2. Every summary field present exactly once, parsed unambiguously.
3. Total exactly 14, 14 passed, 0 failed, 0 blocked, 0 not tested.
4. Build succeeds.
5. Every individual gate result derived from suite evidence, not hardcoded.
6. Script exit code 0 for PASS, nonzero for FAIL/BLOCKED.

## 2. Targets

Not declared at G2. This is a named gap under HOEOS 2.0 Upgrade Layer 1. The gate measures correctness, not latency, throughput, storage, or recovery. Those targets are owed by a later gate.

## 3. Baseline commit

`20bd207b0c9e207b04054e7c487b4316f093c543`

## 4. Evidence references and SHA-256

| Artifact | SHA-256 |
|---|---|
| Fixture `tests/hoeos/g2/golden_test_001.docx` | `3903fcaff82b632acb69ccdb6a5d4b7450053598a2fa79f6ac31c55fad9184d2` |
| Suite `tests/hoeos/g2/test_g2_full_suite.ts` | `45768bc2cde04e44f7756a67f6f98ad02c00087019300cb92a20d75de91df1f1` |
| Verifier `scripts/hoeos/verifyG2Certification.ps1` | `c4391f30da8f29d6f43e10d4540b022c1154f8ae3a1fc60af4e83e562ceb7515` |
| Suite run 10 log | `0C6410FAEF9CA9F3FF2BEECB89F3443D2CBD6CFDAAFEED7DCD80BB2216AD5515` |

## 5. Files and functions inspected (STATIC)

- `src/services/verify/deterministicEngine.ts`
- `src/services/verify/documentNormalizer.ts` (line 44, line 134 — segmentation defect)
- `src/services/verify/universalIngestionService.ts`
- `tests/hoeos/g2/test_g2_full_suite.ts`
- `scripts/hoeos/verifyG2Certification.ps1`

## 6. Commands actually executed (RUNTIME)

- `npx tsx tests/hoeos/g2/test_g2_full_suite.ts` — via `npx.cmd` Start-Process from verifier
- `npm run build` — via `npm.cmd` Start-Process from verifier
- `.\scripts\hoeos\verifyG2Certification.ps1` — positive case, log `g2-verifier-run11.log`
- `.negativecontrol.ps1` (stubbed 13/14) — negative control, log `g2-verifier-negativecontrol-repaired.log`
- `npx vitest run tests/g2-punctuation-classification.test.ts --reporter=verbose` — segmentation recheck, 11/18 failing

## 7. Raw runtime artefacts (RUNTIME)

- `evidence/g2-verifier-run11.log` — positive case, `G2_CERTIFICATION=PASS`, exit 0
- `evidence/g2-verifier-negativecontrol-repaired.log` — negative control, `G2_CERTIFICATION=FAIL`, exit 1
- `evidence/g2-punctuation-verbose.log` — segmentation recheck, 11/18
- `certification/federation_logs/2026-10-24/crossref.jsonl` — provider-authority appends (25 lines, `mailto=verify@gradifi.org`)

## 8. Back-of-envelope register

Not applicable at this gate. No scale-dependent claim is made.

## 9. Consistency declaration

The verification records store is declared **linearizable** by intent (a receipt that can be verified cannot be equivocal). G2 verifies that the persistence record's `verification_id === deriveVerificationId(docHash, evHash)` within one process. G2 does not test cross-instance read-after-write consistency. That test is owed by a later gate.

## 10. Resilience evidence

Out of scope for G2. The gate does not test timeout enforcement, retry safety, circuit breaker correctness, fallback explicitness, or the four resilience negative controls (success, timeout, error, recovery). Those are owed by the integration gate under HOEOS 2.0 Upgrade Layer 3.

## 11. Defect statement

**No defect in G2's canonical authority.** The 14 gates PASS, and the verifier that reports them meets all six acceptance criteria.

**Separate defect, not in G2's scope:** segmentation accuracy is 11/18 failing against `documentNormalizer.ts`. Root cause:
- `documentNormalizer.ts:44` — `.split(/(?<=[.!?])\s+/)` treats every period as a boundary; no abbreviation or DOI/decimal awareness.
- `documentNormalizer.ts:134` — `sentenceRegex` (used by `segmentDocument`) shows the same class of failure.

Named failures: L1, L2, L3, L4, L5, L7, L8, E1, E6, E9. The nine passing tests confirm the defect is specific to DOI decimals, percentage decimals, and abbreviations (`Dr.`, `Prof.`, `Vol.`).

## 12. Proposed change

- **G2 canonical authority:** no change required.
- **Segmentation defect:** owed by a separate segmentation repair gate. The repair is to `documentNormalizer.ts:134` (and consistently `:44`) — add abbreviation set (`Dr.`, `Prof.`, `Vol.`, `Mr.`, `Ms.`, `etc.`, etc.), DOI pattern protection (`10\.\d{4,}/\S+`), and decimal protection (`\d+\.\d+`), before the sentence boundary regex is applied. That gate requires its own 18-test matrix to pass, its own negative controls, and its own verdict.

## 13. Before/after comparison

| Block | Before (`8985442d…`) | After (`c4391f30…`) |
|---|---|---|
| B (gate results) | 14 hardcoded `Write-Host "G2_*=PASS"` | Parsed from `$TsxOutput` |
| A (parser) | Silent `if ($m)` with `-Last 1` | `Get-SummaryField` throws on missing/conflicting |
| C (verdict) | `$passedCount -eq $gateCount` | Pins 14/14/0/0/0, checks all gate results PASS, pins gate count 14 |
| Exit | `CERTIFICATION_SCRIPT_EXIT_CODE=0` unconditionally | Derived from verdict, `exit $exitCode` |

## 14. Regression results (negative controls)

- **Negative control** (stubbed 13/14): `G2_CERTIFICATION=FAIL`, `G2_FREEZE_AUTHORIZED=NO`, `CERTIFICATION_SCRIPT_EXIT_CODE=1`, `NEGATIVE_CONTROL_EXIT=1`. Correct.
- **Positive case** (real 14/14): `G2_CERTIFICATION=PASS`, `G2_FREEZE_AUTHORIZED=YES`, `CERTIFICATION_SCRIPT_EXIT_CODE=0`, `VERIFIER_EXIT=0`, all 14 gates parsed as `PASS`, none `MISSING`. Correct.

## 15. Unresolved risks

1. **Segmentation accuracy BLOCKED** — 11/18 failing, root cause `documentNormalizer.ts:44` and `:134`. Repair gate owed.
2. **Verifier FAIL-from-build branch untested** — the negative control exercised the PASS→FAIL branch via gate-count mismatch, not the build-failure branch. The positive case exercised PASS. The build-failure branch is structurally correct but not tested with a synthetic build failure.
3. **Verifier BLOCKED branch untested** — no test set `$TsxOutput` to empty or missing fields and confirmed `BLOCKED` result.
4. **Targets Appendix undeclared** — G2 measures correctness, not NFRs. Later gate.
5. **Resilience Gate not exercised** — no timeout, retry, or circuit-breaker tests at G2.
6. **Consistency declaration not tested cross-instance** — persistence ID derivation tested within one process.
7. **`documentNormalizer.ts` line 134 regex not fully inspected** — the root cause is inferred from the failure pattern, not from a line-by-line read.

## 16. Decision

**G2 canonical authority: PASS** (14/14, verifier meets all six acceptance criteria, both falsification directions tested).
**G2 segmentation accuracy: BLOCKED** (11/18, named root cause, repair gate owed).
**G2 combined disposition: BLOCKED.**

The commercial MVP proceeds with Layer 1 certified and Layer 2 segmentation documented with a specific file:line and a specific owed repair. The limitation is preserved in the record, not erased.

## 17. Exact evidence needed to advance

To convert G2's combined disposition to PASS:
- A segmentation repair gate that reduces the 18-test matrix to 0 failing with its own negative controls and its own verdict.
- A test that exercises the verifier's build-failure branch (synthetic `$BuildResult='FAIL'` producing `G2_CERTIFICATION=FAIL`, exit 1).
- A test that exercises the verifier's BLOCKED branch (empty `$TsxOutput` producing `G2_CERTIFICATION=BLOCKED`, exit 1).
- Declared Targets Appendix for the gate.
- Resilience Gate evidence (timeout, retry, circuit breaker, four negative controls).

## G3 Authorization

**G3_AUTHORIZATION_REQUIRES_SEPARATE_APPROVAL**

G3 authorization is a governance decision from the owner-decision register (DEC-16). This verdict does not and cannot authorize G3.

## Evidence locations

- Positive case: `evidence/g2-verifier-run11.log`
- Negative control: `evidence/g2-verifier-negativecontrol-repaired.log`
- Segmentation recheck: `evidence/g2-punctuation-verbose.log`
- Suite run 10: `evidence/g2-verifier-run10.log`
- Crossref appends: `certification/federation_logs/2026-10-24/crossref.jsonl`
