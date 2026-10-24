# HOEOS V2 G1 TARGETS APPENDIX: UNIVERSAL DOCUMENT INGESTION

**Protocol ID:** `HOEOS-G1-E2E-DETERMINISTIC-CLOSURE-001`  
**Gate:** G1, Universal Document Ingestion  
**Authority:** HOEOS V2, Evidence Before Assumption, Deterministic Engineering, Production Is Sacred  
**Status:** AUTHORITATIVE TARGETS SPECIFICATION  
**Created:** 2026-10-24  

---

## 1. RECONCILED G1 FORMAT CONTRACT

The Gradifi platform advertises universal academic document ingestion across 17 format specifications. The reconciled format matrix defines the authoritative detection, extraction adapter, expected terminal outcome, representative fixture, and falsification controls.

| # | Format | Extension | Advertised | Detection Behavior | Production Extraction Path | Expected Terminal Outcome | Representative Fixture Path | Required Text Marker / Oracle | Falsification Control | Repetitions |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | PDF (Native) | `.pdf` | Yes | Ext `.pdf` / `application/pdf` | `extractPdfAdapter` -> `extractDocumentText` (pdfjs-dist stream) | `PASS` | `tests/fixtures/ingestion/quantum_federated_learning_paper.pdf` | `"Quantum Entanglement and Decoupled Neural Architecture"` | Truncated/empty stream (`corrupted.pdf`) -> `TEXT_EXTRACTION_UNAVAILABLE` | 3 |
| 2 | PDF (OCR) | `.pdf` | Yes | Ext `.pdf` / `application/pdf` | `extractPdfAdapter` -> OCR Fallback (`ocr_tesseract`) | `PASS` | `tests/fixtures/ingestion/scanned_page_001.pdf` | `"HOEOS_KNOWN_PHRASE_7F3A9C"` | Scanned PDF without text -> `TEXT_EXTRACTION_UNAVAILABLE` | 3 |
| 3 | DOCX | `.docx` | Yes | Ext `.docx` / `wordprocessingml` | `extractDocx` (`docxExtractor.ts`) | `PASS` | `tests/hoeos/g2/golden_test_001.docx` | `"Gradifi Universal Ingestion Service DOCX Golden Test"` | Truncated ZIP bytes (`corrupted.docx`) -> `INVALID_PACKAGE` | 3 |
| 4 | TXT | `.txt` | Yes | Ext `.txt` / `text/plain` | `extractTextAdapter` (`txt_text_reader`) | `PASS` | `tests/fixtures/ingestion/sample.txt` | `"GRADIFI UNIVERSAL INGESTION FIXTURE"` | Empty file (`empty.txt`) -> `EMPTY_DOCUMENT` | 3 |
| 5 | Markdown | `.md` | Yes | Ext `.md` / `.markdown` | `extractTextAdapter` (`md_text_reader`) | `PASS` | `tests/fixtures/ingestion/sample.md` | `"GRADIFI UNIVERSAL INGESTION FIXTURE"` (headers stripped) | Empty file (`empty.md`) -> `EMPTY_DOCUMENT` | 3 |
| 6 | HTML | `.html` | Yes | Ext `.html` / `text/html` | `extractHtmlAdapter` (`html_parser`) | `PASS` | `tests/fixtures/ingestion/sample.html` | `"GRADIFI UNIVERSAL INGESTION FIXTURE"` (scripts/styles stripped) | Empty file (`empty.html`) -> `EMPTY_DOCUMENT` | 3 |
| 7 | HTM | `.htm` | Yes | Ext `.htm` / `text/html` | `extractHtmlAdapter` (`html_parser`) | `PASS` | `tests/fixtures/ingestion/sample.htm` | `"GRADIFI UNIVERSAL INGESTION FIXTURE"` | Empty file (`empty.htm`) -> `EMPTY_DOCUMENT` | 3 |
| 8 | RTF | `.rtf` | Yes | Ext `.rtf` / `application/rtf` | `extractRtfAdapter` (`rtf_parser`) | `PASS` | `tests/fixtures/ingestion/sample.rtf` | `"GRADIFI UNIVERSAL INGESTION FIXTURE"` (controls stripped) | Empty file (`empty.rtf`) -> `EMPTY_DOCUMENT` | 3 |
| 9 | CSV | `.csv` | Yes | Ext `.csv` / `text/csv` | `extractCsvAdapter` (`csv_parser`) | `PASS` | `tests/fixtures/ingestion/sample.csv` | `"GRADIFI UNIVERSAL INGESTION FIXTURE"` | Empty file (`empty.csv`) -> `EMPTY_DOCUMENT` | 3 |
| 10 | JSON | `.json` | Yes | Ext `.json` / `application/json` | `extractJsonAdapter` (`json_parser`) | `PASS` | `tests/fixtures/ingestion/sample.json` | `"GRADIFI UNIVERSAL INGESTION FIXTURE"` (deterministic keys) | Syntax error (`invalid.json`) -> `MALFORMED_DOCUMENT` | 3 |
| 11 | XML | `.xml` | Yes | Ext `.xml` / `application/xml` | `extractXmlAdapter` (`xml_parser`) | `PASS` | `tests/fixtures/ingestion/sample.xml` | `"GRADIFI UNIVERSAL INGESTION FIXTURE"` (XXE defended) | Unbalanced tags (`malformed.xml`) -> `MALFORMED_DOCUMENT` | 3 |
| 12 | EPUB | `.epub` | Yes | Ext `.epub` / `application/epub+zip` | `extractEpubText` (`officeZipAdapter.ts`) | `PASS` | `tests/fixtures/ingestion/image_only.epub` / `sample.epub` | `"HOEOS KNOWN PHRASE 7F3A9C"` / `"GRADIFI UNIVERSAL INGESTION FIXTURE"` | Truncated ZIP bytes (`corrupted.epub`) -> `EMPTY_DOCUMENT` | 3 |
| 13 | ODT | `.odt` | Yes | Ext `.odt` / `application/vnd.oasis.opendocument.text` | `extractOdtText` (`officeZipAdapter.ts`) | `PASS` | `tests/fixtures/ingestion/sample.odt` | `"GRADIFI UNIVERSAL INGESTION FIXTURE"` | Truncated ZIP bytes (`corrupted.odt`) -> `INVALID_PACKAGE` | 3 |
| 14 | PPTX | `.pptx` | Yes | Ext `.pptx` / `presentationml` | `extractPptxText` (`officeZipAdapter.ts`) | `PASS` | `tests/fixtures/ingestion/sample.pptx` | `"GRADIFI UNIVERSAL INGESTION FIXTURE"` | Truncated ZIP bytes (`corrupted.pptx`) -> `INVALID_PACKAGE` | 3 |
| 15 | XLSX | `.xlsx` | Yes | Ext `.xlsx` / `spreadsheetml` | `extractXlsxText` (`officeZipAdapter.ts`) | `PASS` | `tests/fixtures/ingestion/sample.xlsx` | `"GRADIFI UNIVERSAL INGESTION FIXTURE"` | Truncated ZIP bytes (`corrupted.xlsx`) -> `INVALID_PACKAGE` | 3 |
| 16 | DOC (Legacy) | `.doc` | Yes | Ext `.doc` / `application/msword` | `extractLegacyBinaryAdapter` | `FAIL_CLOSED` | `tests/fixtures/ingestion/legacy.doc` | Rejection message: `"Legacy binary .doc format is not directly supported"` | Attempt upload -> `STATUS: FAILED` in UI | 3 |
| 17 | PPT (Legacy) | `.ppt` | Yes | Ext `.ppt` | `extractLegacyBinaryAdapter` | `FAIL_CLOSED` | `tests/fixtures/ingestion/legacy.ppt` | Rejection message: `"Legacy binary .ppt format is not directly supported"` | Attempt upload -> `STATUS: FAILED` in UI | 3 |
| 18 | XLS (Legacy) | `.xls` | Yes | Ext `.xls` | `extractLegacyBinaryAdapter` | `FAIL_CLOSED` | `tests/fixtures/ingestion/legacy.xls` | Rejection message: `"Legacy binary .xls format is not directly supported"` | Attempt upload -> `STATUS: FAILED` in UI | 3 |

---

## 2. MEASURABLE ACCEPTANCE CRITERIA

### A. Extraction Correctness
1. **Canonical Text Integrity:** For supported formats, extraction must produce valid non-empty canonical text matching known fixture anchors.
2. **Readiness State (`canonicalReady`):** `canonicalReady` must transition to `true` if and only if extraction succeeds, text length > 0, and `buildCanonicalAnalysisDocument` generates a valid `CanonicalAnalysisDocument`.
3. **No False Positives on Empty/Corrupt Documents:** Rejection must produce `canonicalReady: false`, `success: false`, and an explicit error code (`EMPTY_DOCUMENT`, `MALFORMED_DOCUMENT`, `INVALID_PACKAGE`, `TEXT_EXTRACTION_UNAVAILABLE`, or `UNSUPPORTED_FORMAT`).
4. **OCR Specifics:** Real OCR must be triggered when a PDF contains no digital stream text or when an EPUB contains only images. OCR must recover the embedded text marker `"HOEOS_KNOWN_PHRASE_7F3A9C"`.

### B. Format Coverage
- **100% Verified Terminal Outcome:** Every one of the 17 advertised entries must have a verified terminal state under browser E2E Playwright execution.
- **Fail-Closed Verification:** Legacy binary formats (`doc`, `ppt`, `xls`) must be proven to reject cleanly in the browser with `STATUS: FAILED` and visible user-facing guidance to convert to modern formats or PDF.

### C. Runtime Latency Targets
- Standard text / XML formats (`txt`, `md`, `html`, `htm`, `rtf`, `csv`, `json`, `xml`): `< 2,000ms`.
- Package extraction (`docx`, `odt`, `pptx`, `xlsx`, native `pdf`): `< 5,000ms`.
- OCR extraction (`scanned_page_001.pdf`, `image_only.epub`): `< 60,000ms` (measured baseline: ~11.6s).
- Fail-closed rejection: `< 1,000ms`.

### D. Determinism & Repeatability
- Minimum 3 consecutive repetitions per representative browser fixture.
- Canonical document hash comparison must yield 100% identical SHA-256 hashes for identical inputs.
- Changing 1 character in the input must produce a distinct hash.

### E. Failure Classification
- `PASS`: Document is supported and produces valid canonical text and `canonicalReady: true`.
- `FAIL_CLOSED`: Document is unsupported or malformed and is deterministically rejected with `STATUS: FAILED` and a clear error explanation.
- `BLOCKED`: Required execution environment or dependency missing.
- `FAIL`: Acceptance condition violated (e.g. premature success, unhandled crash, wrong text extracted).
