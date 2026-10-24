# G1 GATE DECISION

**Gate:** G1 — DOCX Extraction Fidelity
**Decision:** PASS
**Decision date:** 2026-10-22
**Baseline commit:** d339a488debecbf420a96a5f2d6956f6c2e2effd

## Acceptance criteria — all met

- [x] Expected text is preserved for supported document structures
- [x] Failures are explicit (empty, oversized, unsupported all return structured errors)
- [x] Repeated extraction produces stable output

## Root cause

`DocxExtractionResult` (7 fields) did not match the shape `DocumentIngestionResult` expected (14+ fields). `adapterResult.text` was `undefined`; `canonicalReady` stayed `false`; `buildCanonicalAnalysisDocument` was never called for DOCX.

## Repair

`src/services/verify/universalIngestionService.ts` DOCX branch now maps the extractor result into the expected shape. Source hash: F6D300DB01010D88C377A9D6CB4587B59CD9F508EFDF38461A1BB6AF5E65EA79.

## Evidence trail

| Layer | Result | Directory |
|---|---|---|
| Root cause | Documented | G1-root-cause-20261022-143800 |
| Regression, before repair | 3 fail / 1 trivial pass | G1-repair-20261022-221144 |
| Regression, after repair | 4/4 pass | G1-repair-rerun-20261022-221914 |
| Typechecks | 0/0 | G1-post-rerun-check-20261022-222042 |
| Harness fix | Applied | G1-harness-fix-20261022-223030 |
| Browser path | 1 passed, 37,259 chars extracted in 418ms | G1-browser-final-20261022-224202 |

Browser spec hash: FE3B8FC8E2A5EA4F60177B818CAEDB32227407CC49B7F166F22F2A812203B31D
Screenshot: tests/hoeos/g2/evidence/g1_browser/g1_docx_browser_completion.png (SHA-256 368B586519AAA9005961994C1C9E84BE6ADD6746C467E8E9304A745430950E95)

## Reproducibility constraint

The fixture `DIGITAL THERMOMETER real.docx` must be at `C:/Users/faith/Downloads/DIGITAL THERMOMETER real.docx` with SHA-256 `6B76024857A8722BF17BD4B03456C684E3A04E4AD8AAF7E23F5DF8AC2053E12C`. Documented as a machine-local dependency.

## Deferred to G2 / G3

Two federation endpoints returned errors during the verification handoff:
- POST /api/verify/core — ERR_ABORTED
- POST /api/verify/googlebooks — 500

These are downstream of G1 (extraction completed first). They are recorded here for the G2 gate packet.

## Next gate

G2 — Canonical Identity and Score Authority.
