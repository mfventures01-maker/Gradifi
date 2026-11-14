# G2 Runtime Regression Evidence Record

**Date:** 2026-11-12  
**Repository:** mfventures01-maker/Gradifi  
**Branch:** fix/g2-image-ocr-ingestion  
**Execution environment:** Windows PowerShell, Node.js v24.19.0, npm 11.17.0  
**Evidence class:** RUNTIME (local execution of the six named regression checks)

## Result

**6/6 named regression checks passed** after the DOI terminal-punctuation repair.

| Check | Result | Captured detail |
|---|---|---|
| Canonical evidence regression | PASS | Vitest: 5 tests passed, 0 failed |
| TXT / DOCX / PDF canonical authority | PASS | All three normalized lengths 654; canonical document ID and engine document hash `1dce5774abbe28fa`; evidence hash `1499f1484f9b780a`; tamper detection PASS |
| Canonical offset fidelity | PASS | 3 findings checked; all three canonical text slices equalled their source segments |
| OCR determinism | PASS | `ocr_tesseract`; canonical document ID and engine hash `d30a18a54ed1e709`; both evidence hashes `6f0d6884d8e09e6c`; byte-identical true |
| PDF structural ingestion | PASS | Vitest: 1 test passed |
| Existing G2 repair regression | PASS | 5 checks passed, 0 failed |

## Cross-format finding IDs

- `e29aad9da880fd67`
- `aa7660693253b619`
- `49d289b17177d507`

## Offset evidence

- Finding `6a08d3846d97d12c`: start 0, end 264, slice equality true
- Finding `b40a3f9bf1457507`: start 265, end 389, slice equality true
- Finding `0d29c6b3b43f9519`: start 390, end 505, slice equality true

Coordinate space: canonical whitespace-normalized evidence text.

## Repair under test

The sentence-boundary regression exposed that the DOI protection expression swallowed the terminal full stop. The tested replacement leaves terminal sentence punctuation outside the protected DOI span:

```ts
const doiPattern = '(?:\\b10\\.\\d{4,}\\/\\S+?(?=[.!?](?:\\s|$)))';
```

Focused canonical evidence regression: 5/5 passed. The complete six-check PowerShell run then completed all six checks and printed `G2 SIX-TEST REGRESSION: 6/6 PASS`.

## Scope and limitations

This record preserves the user's supplied local PowerShell execution output. It is not a GitHub Actions result, independent certification, production deployment evidence, or proof of every possible document/format edge case. The local run used Node.js 24.19.0; the repository workflow specifies Node.js 20. GitHub Actions must independently pass on the exact branch commit before the G2 certification decision.

## Source log

Captured from the PowerShell run supplied in the ChatGPT conversation on 2026-11-12. The full console output includes all six command results, hashes, finding IDs, and per-test summaries.
