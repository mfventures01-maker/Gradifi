# HOEOS TEST REMEDIATION PLAN

**Generated:** 2026-10-23T22:42:23.6649200+01:00
**Baseline commit:** d339a488debecbf420a96a5f2d6956f6c2e2effd
**Test runner:** vitest/2.1.9 win32-x64 node-v22.23.3
**Command:** `npm test`
**Baseline result:** 168 passed, 17 failed, 45 failed test files, 7 unhandled errors, exit 1
**Reproducibility:** three consecutive runs, identical counts

## Purpose

This plan orders the 17 test failures by what they block. The ordering is not by
test count. It is by what prevents the market durability claim from being made,
and by what prevents the test suite from being a reliable measurement instrument
at all.

## Execution order versus importance order

The priorities below are ordered by importance. The execution order is different:

1. Execute Priority 3 first (harness reliability).
2. Then Priority 1 (the durability blocker).
3. Then Priority 2, then 4 and 5, then 7, then 6.

The reason is simple: you cannot verify that Priority 1's fix works if `npm test`
still exits 1 because six test files call `process.exit()`. The measurement
instrument must be reliable before it can measure anything.

---

## Priority 1 — G2 segmentation accuracy (blocks the durability claim)

**Tests:** 13
**File:** `tests/g2-punctuation-classification.temp.test.ts`
**Source:** `src/services/verify/documentNormalizer.ts`, function `segmentDocument`

### Failing behaviors

| Test | Expected | Actual |
|---|---|---|
| L1 | DOI `10.1038/s41586-023-00001-x` preserved in one sentence | split or dropped |
| L2 | `99.4%` preserved | split or dropped |
| L3 | `Dr.` not a sentence boundary | splits after `Dr.` |
| L4 | `Prof.` not a sentence boundary | splits after `Prof.` |
| L5 | `Vol.` not a sentence boundary | splits after `Vol.` |
| L7 | 91 canonical tokens preserved | 77 tokens (14 lost) |
| L8 | decimal + DOI in one sentence | two sentences |
| E1 | `!!!` terminates a sentence | does not split |
| E4 | `\n` is a sentence boundary | does not split |
| E6 | `Dr.` at start of sentence preserved | strips `Dr.` entirely |
| E9 | DOI with trailing period preserved | leading `10.` dropped |

### Why this blocks the durability claim

The claim is "accurate sentence, phrase, and paragraph extraction." This suite is
the direct measurement of that claim. It fails 13 of 18. The L7 token-loss
finding (77 vs 91) is the most serious: 14 tokens are dropped during
segmentation, which means passages a user would expect to see highlighted are
not in the sentence set at all. That is a direct failure of the accuracy claim.

### What a fix requires

- An abbreviation dictionary (`Dr.`, `Prof.`, `Vol.`, `pp.`, `cf.`, `et al.`,
  etc.) that suppresses sentence splitting after these tokens.
- A decimal/DOI-aware scanner that does not split on `.` when preceded by a digit
  and followed by a digit or a slash-path.
- A newline-as-boundary rule.
- A regression test that verifies the fix against the same 18 assertions.

### Blocks

`CMVP-G2-DETERMINISM`, `CMVP-G1-SEGMENTATION-ACCURACY`, any claim about accurate
highlighting or passage review.

### Note on test inclusion

The `.temp.` in the filename means these tests were intended to be excluded from
the default run via `vitest.config.ts`. The exclusion pattern
`exclude: ['**/.temp.test.ts']` does not match `g2-punctuation-classification.temp.test.ts`
because the pattern expects `.temp.` immediately before `.test.ts`, but the
filename has `-classification` before `.temp.`. The tests ran, which is why they
appear in the 17. That is a config issue, not a product issue, but it means the
failures are visible in the default run where they were intended to be hidden.
Recommendation: either fix the exclusion pattern to actually exclude them, or
promote them to non-`.temp.` names because they test real product behavior.

---

## Priority 2 — Wrong DOCX fixture in format matrix (blocks G1 matrix DOCX claim)

**Tests:** 1
**File:** `tests/g1_format_matrix.test.ts`, TEST 1, line 89
**Fixture:** `tests/hoeos/g2/golden_test_001.docx` (1,012 bytes)

### The failure

`ingestDocument({ name: 'golden_test_001.docx', buffer })` returns
`success: false`. The larger `tests/fixtures/g1/DIGITAL_THERMOMETER_real.docx`
(285,032 bytes) passes 4/4 in `g1_docx_fidelity.test.ts`. The small fixture is
too minimal to exercise the extractor correctly.

### Why this blocks the G1 matrix

The format matrix is the instrument that certifies format ingestion. Its DOCX
test is using the wrong fixture. The failure does not show a product defect; it
shows the test is not testing the right input. Until this is fixed, the G1 matrix
cannot certify DOCX.

### What a fix requires

Change line 89 of `tests/g1_format_matrix.test.ts` to use
`tests/fixtures/g1/DIGITAL_THERMOMETER_real.docx` instead of
`tests/hoeos/g2/golden_test_001.docx`. That is a test-fixture change, not a
source change. The correct fixture is already staged (hash `6B760248…`).

### Blocks

The G1 matrix DOCX entry. Does not affect the browser acceptance, which already
uses the real document.

---

## Priority 3 — `process.exit()` inside test files aborts the runner (blocks test-suite reliability)

**Errors:** 7
**Files:** 6

| File | Line | Result |
|---|---|---|
| `tests/g1_docx_fidelity.test.ts` | 87 | passes 4/4, exits 0 |
| `tests/g2_repairs_regression.test.ts` | 171 | passes 5/5, exits 0 |
| `tests/g4-offset-invariants.test.ts` | 467 | passes 43/43, exits 0 |
| `tests/correction/correctionPanel.test.ts` | 192 | passes 8/8, exits 0 |
| `tests/markers/markerRendering.test.ts` | 232 | passes 8/8, exits 0 |
| `tests/provider/passageExtractor.test.ts` | 77 | 4 pass / 1 fail, exits 1 |
| `tests/g2_offset_fidelity.test.ts` | 51 | unhandled exit 1 |

### What happens

Vitest reports these as "Unhandled Errors" because `process.exit()` terminates
the Node process vitest runs in. The tests themselves largely pass; the
`process.exit(0)` at the end fires and crashes the runner even though the
assertions succeeded. That is why `npm test` exits 1 even when 168 tests pass.

### Why this is Priority 3

These are not product failures — they are test-harness failures. But they make
the test suite's verdict unreliable. A suite that crashes on 6 files cannot
report a clean exit code regardless of assertion results. Until this is fixed,
`npm test` will always exit 1 regardless of what actually passes.

### What a fix requires

Either:
- Remove the `process.exit()` calls and let the test function return normally
  (converting to `describe`/`it` structure removes the need entirely).
- Or add an `if (typeof process !== 'undefined' && !process.env.VITEST) process.exit(0)`
  guard so the file remains runnable as a standalone script but does not crash
  vitest.

The second is smaller and preserves the standalone-script usability of these
files. The first is cleaner but requires larger rewrites.

### Blocks

The reliability of any test-run verdict. Not the durability claim directly, but
the ability to verify that the durability claim's fix actually worked.

---

## Priority 4 — Stale test expectations vs current source (contaminates failure list)

**Tests:** 2
**File:** `tests/universalIngestion.test.ts`, tests 10 and 13

### Test 10

Expects `FILE_TOO_LARGE`, gets `TEXT_SIZE_EXCEEDED`. A 16MB buffer passes the
50MB file-size gate but fails the 1MB canonical-text gate. The test was written
when the canonical-text gate did not exist, or with a different gate ordering.

### Test 13

Expects error message `'Text extraction unavailable. OCR required.'`, gets
`'Text extraction unavailable. PDF contains no legible text or OCR failed.'`.
The message was changed in source and the test was not updated.

### Why this is Priority 4

Test drift, not product defects. Neither is a durability blocker, but both
contaminate the failure list with expectations that no longer match source
behavior.

### What a fix requires

- Test 10: update expected code to `TEXT_SIZE_EXCEEDED`, or update the source's
  gate ordering to check file size before canonical text. Either direction
  requires a decision about which gate should fire first for a 16MB input.
- Test 13: update expected message substring to match the current source.

### Blocks

Nothing directly. Contaminates the failure list.

---

## Priority 5 — Test asserting the wrong thing (permanent failure by design)

**Tests:** 1
**File:** `tests/granularSimilarityResult.test.ts`, Test E, line 94

### The failure

The test asserts `git diff -- src/services/verify/documentNormalizer.ts` returns
empty. It does not, because the G2 sentence-admission-floor repair is applied.
The test asserts "source has not drifted from baseline," which is the opposite
of what the repair intends.

### Why this is Priority 5

The test is wrong, not the source. It is checking that a fix is absent when the
fix is supposed to be present.

### What a fix requires

Remove the test. Its purpose (catch uncommitted changes to
`documentNormalizer.ts`) was obviated once the G2 repair was applied. Or invert
it: assert that the specific repair lines are present in the source.

### Blocks

Nothing. It fails permanently by design.

---

## Priority 6 — Test-suite structure: missing imports and unrecognized suites

**Files:** 42

### "describe is not defined" (3 files)

`tests/gemmaService.test.ts`, `tests/nemotronService.test.ts`,
`tests/ocrService.test.ts` all use `describe()` without importing it from
vitest. Each fails with `ReferenceError: describe is not defined`.

### "No test suite found" (39 files)

Files such as `tests/aiEvidenceFirewall.test.ts`,
`tests/bulkIngestionAndMetadata.test.ts`, `tests/demoWorkflow3Runs.test.ts` use a
structure vitest does not recognize as a test suite — likely top-level `await`
followed by `console.log` assertions, or a script that runs at import time with
no `it()`/`test()` calls.

### Why this is Priority 6

These are not test failures. They are tests that do not run at all. The 168
passing tests are the ones that do run. These 42 files are invisible to the
runner. They do not contaminate the result; they are simply absent from it.

### What a fix requires

- The 3 `describe is not defined` files: add
  `import { describe, it, expect } from 'vitest'` at the top.
- The 39 "No test suite found" files: convert to `describe`/`it` structure.

That is a large mechanical change (42 files) and it is test migration, not
product work.

### Blocks

Nothing. These files were never running, and the 168 passing tests are the real
count.

---

## Priority 7 — Independent real behavior mismatches

**Tests:** 6, each isolated.

| Finding | Test | Nature |
|---|---|---|
| Sentinel defense not implemented | `tests/g5m02-sentinel-collision.temp.test.ts` | `segmentDocument` does not throw on `\uE000` |
| Request retry mismatch | `tests/federation/requestQueue.test.ts` | 429 not retried (1 vs expected 2) |
| Persistence ID derivation | `tests/verificationPersistence.test.ts` | Derived ID does not match `VRF-8AFCFF6056B0` |
| Missing migration file | `tests/verificationSchemaRLS.test.ts` | `20260912_public_verification_records.sql` absent |
| OCR branch timeout | `tests/g1_ocr_branch_forensic.test.ts` | 5-second timeout, actual 5.8s |
| Invalid EPUB fixture | `tests/g1_epub_ocr.test.ts` | Fixture is not a valid ZIP |

Each is a small independent finding. They do not share a cause. They are worth
recording and addressing separately, but none is the thing that blocks the
durability claim.

---

## Summary table

| Priority | Item | Tests | Nature | Blocks | Execution order |
|---|---|---|---|---|---|
| 1 | G2 segmentation accuracy | 13 | Product gap | Durability claim | 2 |
| 2 | `golden_test_001.docx` fixture | 1 | Wrong fixture | G1 matrix DOCX | 3 |
| 3 | `process.exit()` in 6 files | 7 errors | Harness defect | Test-suite verdict | 1 |
| 4 | Stale error messages | 2 | Test drift | Contaminates list | 4 |
| 5 | `documentNormalizer.ts` diff assertion | 1 | Test wrong by design | Nothing | 4 |
| 6 | Missing imports / unrecognized suites | 42 files | Test migration | Nothing (invisible) | 6 |
| 7 | Sentinel, retry, persistence, migration, timeout, EPUB | 6 | Independent findings | Separate gates | 5 |

---

## What this plan does not do

- Does not fix any test or source file.
- Does not claim any priority is resolved.
- Does not change any disposition.
- Does not commit, push, or deploy.

The plan is a record of the failures and the ordering. The decision to fix them,
and the authorization to change source or tests, are separate.

## Baseline preservation

The 168 passing tests are the baseline. The 17 failures are the gap. Any future
run can be measured against these numbers. The baseline must not be re-derived
from a fresh clone until the Priority 3 harness fix is applied, because the
`process.exit()` crashes make a clean exit code impossible regardless of
assertion results.

## Attestation

Written: 2026-10-23T22:42:23.6649200+01:00
Baseline: d339a488debecbf420a96a5f2d6956f6c2e2effd
Runner: vitest/2.1.9 win32-x64 node-v22.23.3
Result: 168 passed, 17 failed, 45 failed files, 7 unhandled errors, exit 1
Reproducibility: three runs, identical counts
