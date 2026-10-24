# HOEOS V2 FORENSIC BASELINE REPORT: G1 UNIVERSAL DOCUMENT INGESTION

**Protocol ID:** `HOEOS-G1-E2E-DETERMINISTIC-CLOSURE-001`  
**Execution Timestamp (UTC):** `2026-10-24T12:36:32Z`  
**Execution Timestamp (Local):** `2026-10-24T13:36:32+01:00`  
**Repository Root:** `c:\Projects\Gradifi`  
**Current Branch:** `clean-deploy`  
**Upstream Branch:** `origin/clean-deploy (+1 -0)`  
**Current HEAD OID:** `b27f6b03ad762537fbbf07532740259f97c7fa8e`  
**Working Tree Status:** Clean except untracked `evidence/G1-REPAIR-AND-B-GROUP-COMMIT-MSG.txt`  
**Git Diff Check:** Clean (exit code 0)  

---

## 1. Tool & Runtime Environment

- **Node.js:** `v22.23.3`
- **npm:** `10.9.9`
- **Playwright Test Runner:** `Version 1.62.1`
- **Vitest Test Runner:** `vitest/2.1.9 win32-x64 node-v22.23.3`
- **Playwright Chromium Version:** Chrome for Testing 151.0.7922.34 (playwright chromium v1234)
- **Chromium Installation Path:** `C:\Users\faith\AppData\Local\ms-playwright\chromium-1234`
- **OCR Engine:** `tesseract.js` version `^7.0.0` (in package.json dependencies)
- **Local Dev Server Configuration:** `vite` on port `5173` (`playwright.config.ts` configured for `http://127.0.0.1:5173`)

---

## 2. Forensic Inspection of Commit b27f6b03ad762537fbbf07532740259f97c7fa8e

Commit `b27f6b03ad762537fbbf07532740259f97c7fa8e` is verified as HEAD.
Its commit message records:
1. G1 fixture repair (C-1): `tests/hoeos/g2/golden_test_001.docx` regenerated as conformant OOXML with forward-slash ZIP entry paths and valid XML attributes. Hash: `3903fcaff82b632acb69ccdb6a5d4b7450053598a2fa79f6ac31c55fad9184d2`.
2. Test harness stabilization (C-2a, C-2b, C-3): 28 `process.exit()` calls guarded across 12 files. 8 script-style files excluded from default vitest run in `vitest.config.ts`.
3. B-group findings: verified under `npx tsx` and `verificationPersistence.test.ts` converted to vitest format.
4. G1 OCR branch timeout: `tests/g1_ocr_branch_forensic.test.ts` timeout increased from 5s to 60s.
5. Gate Decision at that commit: `BLOCKED` because 15 advertised formats (TXT, RTF, HTML, Markdown, EPUB, ODT, PPTX, XLSX, CSV, JSON, XML) possessed unit-level evidence only, without full browser end-to-end acceptance.

---

## 3. G1 Component & File Analysis

### 3.1 Ingestion Dispatch Service
- File: `src/services/verify/universalIngestionService.ts`
- Format detection: `detectFileFormat(filename, mimeType)` handles 17 extensions: `pdf`, `doc`, `docx`, `rtf`, `odt`, `txt`, `epub`, `html`, `htm`, `md`, `ppt`, `pptx`, `xls`, `xlsx`, `csv`, `json`, `xml`.
- Dispatch routes:
  - `pdf`: `extractPdfAdapter` (pdfjs-dist stream extractor with fallback to OCR)
  - `txt`, `md`: `extractTextAdapter`
  - `html`, `htm`: `extractHtmlAdapter`
  - `rtf`: `extractRtfAdapter`
  - `csv`: `extractCsvAdapter`
  - `json`: `extractJsonAdapter`
  - `xml`: `extractXmlAdapter`
  - `docx`: `extractDocx` (`docxExtractor.ts` using `fflate` and `fast-xml-parser`)
  - `odt`: `extractOdtText` (`officeZipAdapter.ts`)
  - `epub`: `extractEpubText` (`officeZipAdapter.ts`)
  - `pptx`: `extractPptxText` (`officeZipAdapter.ts`)
  - `xlsx`: `extractXlsxText` (`officeZipAdapter.ts`)
  - `doc`, `ppt`, `xls`: `extractLegacyBinaryAdapter` (returns `UNSUPPORTED_FORMAT` fail-closed)
- Security Gate 1: 50MB file size ceiling (`G1_MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024`).
- Security Gate 2: Unknown format returns `UNSUPPORTED_FORMAT`.
- Security Gate 3: 1MB canonical text ceiling (`G1_MAX_CANONICAL_TEXT_BYTES = 1 * 1024 * 1024`).
- Canonical convergence: `buildCanonicalAnalysisDocument` produces `CanonicalAnalysisDocument` and sets `canonicalReady: true`.

### 3.2 Document Normalization Service
- File: `src/services/verify/documentNormalizer.ts`
- Normalization version: `NORM-V1`
- `normalizeText`: NFKD normalization, strips diacritics, lowercase, alphanumeric/whitespace replacement, collapse whitespace.
- `computeHash`: FNV-1a 64-bit deterministic hash.
- `segmentDocument`: Paragraphs (`PAR-XXX`), sentences (`SEN-XXX`), phrases (`PHR-XXX`).
  - Sentence admission floor: minimum 3 tokens and minimum 15 characters (rejects pathological fragments).

### 3.3 UI Implementation & Acceptance Surface
- File: `src/pages/verify/GradifiVerifyDemoPage.tsx`
- Accessible via route `/verify`.
- File input selector: `input[type="file"]`.
- `accept` attribute: `.pdf,.txt,.docx,.rtf,.odt,.epub,.html,.htm,.md,.pptx,.xlsx,.csv,.json,.xml`.
- On change: calls `ingestDocument(file)`.
- UI status badge transitions: `STATUS: READY` -> `STATUS: PROCESSING` -> `STATUS: EXTRACTED` or `STATUS: FAILED`.
- Rendered extracted details:
  - Filename badge
  - Extraction method badge (`Method: ...`)
  - Textarea (`textarea[placeholder*="Paste academic paper"]`) containing extracted canonical text.
  - Section `2. Canonical Analysis Document` with badge `PROVENANCE: NORMALIZED`.

### 3.4 Browser E2E Acceptance Status
- Existing specs:
  - `e2e/g1-docx-browser-acceptance.spec.ts`: Passes for `DIGITAL THERMOMETER real.docx`.
  - `e2e/g1-pdf-browser-acceptance.spec.ts`: Passes for `quantum_federated_learning_paper.pdf`.
  - Missing browser specs: No browser E2E acceptance test currently exists covering the remaining 15 formats and the fail-closed negative controls.

### 3.5 Vitest Test Discovery & Harness Status
- File: `vitest.config.ts`
- Script-style files excluded from default run to avoid "No test suite found" false negatives:
  - `tests/g1_docx_fidelity.test.ts`
  - `tests/g2_repairs_regression.test.ts`
  - `tests/g4-offset-invariants.test.ts`
  - `tests/correction/correctionPanel.test.ts`
  - `tests/markers/markerRendering.test.ts`
  - `tests/provider/passageExtractor.test.ts`
  - `tests/g2_offset_fidelity.test.ts`
  - `tests/g1_epub_ocr.test.ts`
  - `tests/granularSimilarityResult.test.ts`
  - `tests/ocrService.test.ts`
- Total registered assertions under default run at commit `b27f6b03`: 186 passing tests across 17 files. 27 files showed `No test suite found` because they are legacy script-style.

---

## 4. Initial Gate Assessment

Current Gate Status: **BLOCKED**
Evidence:
1. Browser E2E acceptance tests exist and pass only for DOCX and PDF.
2. The remaining formats (`txt`, `md`, `rtf`, `odt`, `epub`, `html`, `htm`, `pptx`, `xlsx`, `csv`, `json`, `xml`) and legacy binary fail-closed formats (`doc`, `ppt`, `xls`) have unit-level adapter code but have not been verified end-to-end in the real browser under Playwright + CDP.
3. Negative controls (corrupted/malformed files) have not been verified across all format groups in the browser.
4. Next step is Phase B: Reconcile the actual G1 format contract and produce `G1-TARGETS-APPENDIX.md`.
