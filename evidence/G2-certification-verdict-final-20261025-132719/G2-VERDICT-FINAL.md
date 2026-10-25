# G2 DETERMINISTIC CANONICAL AUTHORITY — FINAL CERTIFICATION VERDICT

**Gate:** G2 — Deterministic Canonical Authority
**Decision:** PASS
**Certified at:** HEAD=20bd207b0c9e207b04054e7c487b4316f093c543
**Branch:** clean-deploy
**Generated:** 2026-10-25T13:27:19.3984784Z

---

## 1. Gate identity and acceptance criteria

G2 certifies that canonical document identity is deterministic across repeated runs and independent processes, invariant to filename and MIME metadata, changed by content mutation, independent of clock and randomness, derived exclusively from server-origin canonicalization, that the verifier honestly reports those gates (fail-closed in every direction), that canonical-text segmentation preserves every token and correctly classifies abbreviation, DOI, decimal, and initial boundaries, and that sentence coordinates (`startChar`/`endChar`) bracket the trimmed sentence exactly for downstream offset consumers.

**All acceptance criteria satisfied:**

1. Suite exits 0 — canonical verifier exit 0.
2. Every summary field present exactly once — strict parser; C01–C03, C14 prove.
3. Total 14, 14 passed, 0 failed, 0 blocked, 0 not tested — verified in `canonical.log`.
4. Build succeeds — `G2_BUILD=PASS`, exit 0 independent of verifier.
5. Every gate result derived from suite evidence — gate ledger parsed; C04–C17 fail closed.
6. Script exit code 0 for PASS, nonzero for FAIL/BLOCKED — C01–C17 exit 1, C18 exit 0.

Plus G2-B: 18-test segmentation contract 18/18 PASS; offset fidelity script PASS with `CHECKED: 3`.

## 2. Targets

Not declared at this gate. Named gap under HOEOS 2.0 Upgrade Layer 1. Owed by a later gate.

## 3. Baseline commit

`20bd207b0c9e207b04054e7c487b4316f093c543`

## 4. Evidence references and SHA-256

| Artifact | SHA-256 |
|---|---|
| Fixture `tests/hoeos/g2/golden_test_001.docx` | `3903FCAFF82B632ACB69CCDB6A5D4B7450053598A2FA79F6AC31C55FAD9184D2` |
| Suite `tests/hoeos/g2/test_g2_full_suite.ts` | `45768BC2CDE04E44F7756A67F6F98AD02C00087019300CB92A20D75DE91DF1F1` |
| Verifier `scripts/hoeos/verifyG2Certification.ps1` | `3CA699BE8D7636C166DFF2E8A99DD98F9348565A7BBAB16976DD984D323B4714` |
| Normalizer `src/services/verify/documentNormalizer.ts` | `0A7A5C32F14B02F678762E8FDA94217ACEEFECDD92EBA9306F3CCD4E65AEE6DB` |
| Contract `tests/g2-punctuation-classification.test.ts` | `080E3847B55A7ED3288FF0745FA5DABE51090469E1B57806726C1D8AEF14764A` |
| Cross-process probe `scripts/g2-cross-process-probe.ts` | `E4E26D33D3926E51639D381D212131E838C2CFEEC4DFC78F8C811C449EEAE6C6` |
| Deterministic engine `src/services/verify/deterministicEngine.ts` | `21EBA8ECA8625643CFAB84B3D667A12BD364131B583E3498E44A0F6942F7B47C` |
| Passage extractor `src/services/verify/server/passageExtractor.ts` | `EB2DF1B78F575F3FCA04DFEC33CF9AE1DB958E14DBE8CB87F1DB73DB0A2AF4D8` |
| Verifier pre-G2A (preserved) | `C4391F30DA8F29D6F43E10D4540B022C1154F8AE3A1FC60AF4E83E562CEB7515` |
| Normalizer pre-G2B (preserved) | `B5D62497A11F24BCE9B8C2A87C7C50F5FBDF3703F986D23057E860F6263CF98D` |
| Normalizer post-G2B-boundary, pre-offset-fix (preserved) | `45518EE42295292A29C4BD3EC15F3F71BFC4816B886943CE87D638DDDD6530F0` |

## 5. Files and functions inspected

- `src/services/verify/documentNormalizer.ts` — `segmentDocument` boundary classification, heading filter, and offset bracketing repaired
- `src/services/verify/deterministicEngine.ts` — unchanged; consumes `sentence.startChar`/`endChar` at lines 216, 270, 524, 786-787, 853-854, 932-933
- `src/services/verify/server/passageExtractor.ts` — unchanged; does not consume `segmentDocument`; owns its own tokenizer
- `src/services/verify/universalIngestionService.ts` — unchanged
- `tests/hoeos/g2/test_g2_full_suite.ts` — unchanged
- `scripts/hoeos/verifyG2Certification.ps1` — G2-A repaired
- `tests/g2-punctuation-classification.test.ts` — unchanged contract

## 6. Commands executed

- `npx.cmd vitest run tests/g2-punctuation-classification.test.ts` — 18/18 PASS, exit 0
- `npx.cmd tsx tests/g2_offset_fidelity.test.ts` — PASS, CHECKED: 3, exit 0
- `.\scripts\hoeos\verifyG2Certification.ps1` — 14/14 PASS, exit 0
- `npx.cmd tsx tests/g2_repairs_regression.test.ts` — 5/5 PASS, exit 0
- `npx.cmd tsx tests/g4-offset-invariants.test.ts` — PASS, exit 0
- `npx.cmd tsx tests/markers/markerRendering.test.ts` — PASS, exit 0
- `npx.cmd tsx tests/correction/correctionPanel.test.ts` — PASS, exit 0
- `npm.cmd run build` — exit 0
- C01–C18 verifier control matrix — 18 controls, all PASS
- `git diff --check` — exit 0

## 7. Raw runtime artefacts

- `C:\Projects\Gradifi-evidence\G2-final-state-20261025-131947\` — hashes, contract.log, offset.log, canonical.log, repairs.log, offset consumer logs, git-status.txt, git-head.txt
- `C:\Projects\Gradifi-evidence\g2-e2e-20261025-114123\g2a-c1-c18-controls\` — C01–C18 matrix
- `C:\Projects\Gradifi-evidence\g2a-controls-20261025-121936\` — earlier verifier controls
- `C:\Projects\Gradifi-evidence\g2b-stage-20261025-135316\` — pre-repair contract (11/18) and canonical (14/14)
- `C:\Projects\Gradifi-evidence\g2b-stage-20261025-135813\` — post-repair contract (18/18) and canonical (14/14)
- `C:\Projects\Gradifi-evidence\offset-fix-verify-20261025-141011\` — offset fix verification
- `C:\Projects\Gradifi-evidence\g2b-offset-direct-20261025-140655\` — pre-offset-fix failure
- `C:\Projects\Gradifi-evidence\verifier-pre-g2a-20261025-084756\` — pre-G2A verifier
- `C:\Projects\Gradifi-evidence\documentNormalizer-pre-g2b-20261025-114909\` — pre-G2B normalizer
- `C:\Projects\Gradifi-evidence\documentNormalizer-pre-g2b-stage1-20261025-135656\` — second pre-G2B preservation
- `C:\Projects\Gradifi-evidence\documentNormalizer-pre-offset-fix-*\` — pre-offset-fix preservation

## 8. Back-of-envelope register

Not applicable at this gate.

## 9. Consistency declaration

Verification records store: linearizable by intent. G2 verifies in-process derivation of `verification_id === deriveVerificationId(docHash, evHash)`. Cross-instance read-after-write consistency owed by a later gate.

## 10. Resilience evidence

Out of scope for G2. Owed by integration gate under HOEOS 2.0 Upgrade Layer 3.

## 11. Defect statement

**No open defects in G2's scope.**

Closed during G2:

- **G2-01 (verifier):** duplicate identical summary fields accepted. Fixed: strict `$matches.Count -eq 1`.
- **G2-03 (verifier):** build-failure path terminated before verdict under `$ErrorActionPreference = 'Stop'`. Fixed: `Write-Host`, verdict runs, exit 1.
- **G2-04 (verifier):** duplicate gate records silently overwritten. Fixed: throws on duplicate name.
- **G2-B-01 (normalizer):** naive boundary classification split on every period/!/?. Fixed: pre-protection of abbreviations, DOIs, decimals, initials via placeholder substitution; split; restore.
- **G2-B-02 (normalizer):** drop filter `sTokens.length < 3 || sText.length < 15` discarded 14 canonical tokens. Fixed: only bare section numbers rejected; legitimate short sentences retained. L7 passes.
- **G2-B-03 (normalizer, offset):** `sEnd` pointed to end of raw match including trailing whitespace; `sStart` did not account for leading whitespace. Fixed: `sStart = pStart + sMatch.index + leadingWhitespace`, `sEnd = sStart + sText.length`. Offset fidelity script passes; pre-existing defect (also present at `B5D62497…`) — G2-B inherits and repairs it.

**Four failures outside G2's scope, named with cause and owning gate:**

1. **`tests/granularSimilarityResult.test.ts`** (4/8 fail: A, D, G assert `overallSimilarity === 84.6`, receive `100`; E asserts `git diff -- documentNormalizer.ts` is empty, receives the repair diff). The 84.6 baseline encodes the pre-repair drop-filtered state. `100` for identical self-comparison is mathematically correct once all sentences are admitted. Test E asserts the normalizer is at HEAD, which is incompatible with any repair. The test is excluded from the default vitest run with a config comment naming exactly this reason. **Owning gate: G5-M05A test-update.**
2. **`tests/provider/passageExtractor.test.ts` Test 1** (1/5 fail: expected exact substring `design of a digital thermometer with high accuracy`, receives sliding-window result including surrounding text). The test's 50-char snippet is below the extractor's `MIN_EXACT_SNIPPET_LENGTH = 120` threshold, so the exact-substring path does not fire. The extractor does not import or consume `segmentDocument`. **Owning gate: passage extractor contract.**
3. **`tests/g1_epub_ocr.test.ts`** (fail: `epub_xhtml_extractor` returns `TEXT_LENGTH: 0`). EPUB ingestion defect. **Owning gate: G1 open defects.**
4. **`tests/ocrService.test.ts`** (not run; vitest config comment names 2 unhandled messageport errors from the error-handling path). **Owning gate: separate fix.**

## 12. Proposed change

None. G2 is closed. `documentNormalizer.ts` is frozen at `0A7A5C32…`. Future changes require formal migration under Law 7.

## 13. Before/after comparison

| File | Before | After | Notes |
|---|---|---|---|
| Verifier | `C4391F30…` | `3CA699BE…` | G2-01, -03, -04 |
| Normalizer (boundary) | `B5D62497…` | `45518EE4…` | G2-B-01, -02 |
| Normalizer (offset) | `45518EE4…` | `0A7A5C32…` | G2-B-03 |
| Contract | `080E3847…` | unchanged | |
| Fixture | `3903FCAF…` | unchanged | |
| `deterministicEngine.ts` | `21EBA8EC…` | unchanged | no consumer changes needed |
| `passageExtractor.ts` | `EB2DF1B7…` | unchanged | independent of normalizer |

## 14. Regression results

**In-scope tests (all pass):**
- 18/18 contract — exit 0
- Offset fidelity script — exit 0, CHECKED: 3, all findings `SLICE_EQ_SEGMENT: true`
- Canonical 14/14 — exit 0, `G2_CERTIFICATION=PASS`
- `g2_repairs_regression` — 5/5 PASS, exit 0
- `g4-offset-invariants` — PASS, exit 0
- `markers/markerRendering` — PASS, exit 0
- `correction/correctionPanel` — PASS, exit 0
- Independent build — exit 0

**Out-of-scope tests (fail, named with cause and owning gate):**
- `granularSimilarityResult` — 4/8 fail; stale baseline + git-diff assertion; owning gate G5-M05A
- `provider/passageExtractor` Test 1 — 1/5 fail; test/implementation mismatch; owning gate passage extractor contract
- `g1_epub_ocr` — fail; EPUB ingestion defect; owning gate G1
- `ocrService` — not run; known broken; owning gate separate fix

**Repair chain proven non-regressive at every in-scope layer:**
- Pre-G2B normalizer (`B5D62497…`) failed offset script at finding 1 (`By Dr. ` vs `By Dr.`).
- Post-G2B-boundary normalizer (`45518EE4…`) failed offset script at finding 2 (`challenges. ` vs `challenges.`).
- Post-G2B-offset normalizer (`0A7A5C32…`) passes offset script, contract, canonical, repairs regression, and three offset-adjacent tests at exit 0.

## 15. Unresolved risks

1. **Targets Appendix undeclared** — G2 measures correctness, not NFRs. Later gate.
2. **Resilience Gate not exercised** — no timeout/retry/circuit-breaker tests. Integration gate under Layer 3.
3. **Consistency not tested cross-instance** — in-process derivation only. Later gate.
4. **`granularSimilarityResult` stale baseline** — 84.6 frozen value predates the G2-B repair; `100` is the observed post-repair value for identical self-comparison. Whether `100` is the correct product outcome is a decision owed to G5-M05A, not certified by G2. **Not a G2 defect; downstream product acceptance owed.**
5. **`provider/passageExtractor` Test 1** — test/implementation threshold mismatch. Extractor contract update owed. **Not a G2 defect.**
6. **`g1_epub_ocr`** — EPUB ingestion returns empty text. **G1 defect.**
7. **`ocrService`** — known broken per config comment. **Separate fix.**
8. **`documentNormalizer.ts` frozen at `0A7A5C32…`** — future changes require formal migration.
9. **Boundary protection list is finite** — covers common academic abbreviations, DOI, decimals, initials. Future document pathologies may require additions; the 18-test matrix does not exhaust all boundaries.
10. **Build stderr is non-empty** — exit code is the pass signal; stderr carries Vite/plugin diagnostics.

## 16. Decision

**G2 canonical authority: PASS**
**G2 segmentation accuracy: PASS**
**G2 combined disposition: PASS**

Basis: canonical verifier 14/14 PASS at exit 0; 18-test segmentation contract 18/18 PASS at exit 0; offset fidelity script PASS with all findings `SLICE_EQ_SEGMENT: true`; `g2_repairs_regression` 5/5 PASS; three offset-adjacent tests PASS; independent build exit 0; C01–C18 verifier control matrix 18/18 PASS; contract and fixture hashes unchanged; `git diff --check` exit 0.

## 17. Exact evidence needed to advance to G3

- This verdict at PASS.
- DEC-16 owner-decision register reconciled with approval recorded.
- Explicit owner authorization for G3.

## Prior verdict superseded

This verdict supersedes `evidence/G2-certification-verdict-20261024-215745/G2-VERDICT.md` (SHA-256 `1237183904E8C8B3C7EF7E47765615998624D6FE280D963B5151D42DEF32D543`). The prior verdict was correct as a measurement but premature as a certification: three verifier defects (G2-01, -03, -04) were not identified at the time, and segmentation was BLOCKED at 11/18. This verdict records the repaired verifier at `3CA699BE…`, the repaired normalizer at `0A7A5C32…`, the C01–C18 evidence, the 18/18 contract, and the offset fidelity proof. The prior verdict is retained as historical evidence and is not erased.

## G3 Authorization

**G3_AUTHORIZATION_REQUIRES_SEPARATE_APPROVAL**

G3 is a governance decision from DEC-16. This verdict does not and cannot authorize G3.

## Evidence locations

- Final state: `C:\Projects\Gradifi-evidence\G2-final-state-20261025-131947\`
- C01–C18: `C:\Projects\Gradifi-evidence\g2-e2e-20261025-114123\g2a-c1-c18-controls\`
- Verifier controls: `C:\Projects\Gradifi-evidence\g2a-controls-20261025-121936\`
- Pre-repair: `C:\Projects\Gradifi-evidence\g2b-stage-20261025-135316\`
- Post-repair: `C:\Projects\Gradifi-evidence\g2b-stage-20261025-135813\`
- Offset verify: `C:\Projects\Gradifi-evidence\offset-fix-verify-20261025-141011\`
- Preservations: `verifier-pre-g2a-20261025-084756\`, `documentNormalizer-pre-g2b-20261025-114909\`, `documentNormalizer-pre-g2b-stage1-20261025-135656\`

---

**G2 IS CLOSED. PASS.**