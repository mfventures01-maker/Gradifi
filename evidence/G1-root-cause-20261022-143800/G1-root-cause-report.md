# G1 Root-Cause & Ingestion Fidelity Report
**Timestamp:** 2026-10-22T14:40:00+01:00  
**Gate:** G1 — DOCX Extraction Fidelity  
**Status:** DIAGNOSIS COMPLETE — AWAITING AUTHORIZATION FOR PROPOSED REPAIR & REGRESSION TEST  

---

## 1. Files Inspected
1. `src/pages/verify/GradifiVerifyDemoPage.tsx` (Lines 170–245: UI trigger and file upload ingestion dispatch)
2. `src/services/verify/universalIngestionService.ts` (Lines 140–374: format detection, adapter dispatch, canonical document building)
3. `src/services/verify/ingestionAdapters/officeZipAdapter.ts` (Lines 64–145: legacy `extractDocxText` & `extractTextFromXmlElements`)
4. `src/services/verify/ingestionAdapters/docxExtractor.ts` (Lines 1–730: G5-M03 deterministic extractor with XML run walker and canonical assembly)
5. `src/services/verify/documentNormalizer.ts` (Lines 1–150: canonical whitespace and paragraph normalization)
6. `C:\Users\faith\Downloads\DIGITAL THERMOMETER real.docx` (SHA-256: `6B76024857A8722BF17BD4B03456C684E3A04E4AD8AAF7E23F5DF8AC2053E12C`)

---

## 2. Ingestion Call Graph
```
UI Button / File Drop ("Run Academic Evidence Verification" / Demo Page)
  └─► GradifiVerifyDemoPage.handleFileUpload(e)
        └─► universalIngestionService.ingestDocument(fileOrInput)
              ├─► detectFileFormat(filename, mimeType) -> 'docx'
              ├─► [LEGACY PATH in VRF-5D60C34F875A]: officeZipAdapter.extractDocxText(buf)
              │     └─► extractTextFromXmlElements(xml, ['w:t', 'w:p'])
              │           └─► nodes.join('\n')  <-- [DEFECT: Inter-run newline injection]
              └─► [MODERN PATH in commit aa09836]: docxExtractor.extractDocx(buf)
                    └─► walkBody() -> walkParagraph() -> walkRun()
                          └─► assembleCanonical() -> pieces.join('') -> canonicalText
              └─► [SEAM DEFECT in universalIngestionService.ts:326]:
                    checks `adapterResult.text` instead of `adapterResult.canonicalText || adapterResult.text`,
                    leaving `result.text` empty and `canonicalReady: false`
```

---

## 3. Root Cause Classification
**Root Cause Statement:**  
The textual fragmentation observed in historical verification `VRF-5D60C34F875A` was caused by `officeZipAdapter.extractTextFromXmlElements` extracting each `<w:t>` XML element as an isolated node and joining them with newline characters (`\n`), which split words spanning multiple formatting or spell-check runs across line breaks; while the modern replacement `docxExtractor.ts` properly concatenates intra-paragraph runs without newline splits, `universalIngestionService.ts` contains an uncorrected seam defect where it reads `adapterResult.text` rather than `adapterResult.canonicalText`, silently failing to surface the extracted canonical document.

### Classification:
- Primary root cause: **(a) DOCX structural element not handled by legacy extractor** (`officeZipAdapter.ts` treating run-level `<w:t>` elements as paragraph boundaries and joining them with `\n`).
- Secondary seam defect: **Interface property mismatch between `extractDocx` (`canonicalText`) and `universalIngestionService.ts` (`adapterResult.text`)**.

---

## 4. Intended Canonical Representation
For the six observed historical fragments from `DIGITAL THERMOMETER real.docx`:
1. `T / hermometer` ➔ **`Thermometer`** (single unified word token; drop-cap or initial run unified with remainder of word).
2. `digital thermo / meters` ➔ **`digital thermometers`** (single unified compound phrase without newline or space injection).
3. `19 / th century` ➔ **`19th century`** (unified ordinal run with following noun).
4. `5 / 0 / C` ➔ **`50C`** (unified numeric temperature degree token).
5. `2 . 1` ➔ **`2.1`** (unified decimal section heading).
6. `Fig 2 . 7` ➔ **`Fig 2.7`** (unified figure caption label).

Verified in `docxExtractor.ts` output:
`Thermometer` found at offset 31 (`"Thermometer In the se..."`).
`digital thermometer` found at offset 1214.
`19th century` found at offset 985.
`50C` found at offset 5433.
`2.1` found at offset 4255.

---

## 5. Regression-Test Proposal
- **Fixture:** `C:\Users\faith\Downloads\DIGITAL THERMOMETER real.docx` (SHA-256: `6B76024857A8722BF17BD4B03456C684E3A04E4AD8AAF7E23F5DF8AC2053E12C`).
- **Test File Proposed:** `tests/g1_docx_fidelity.test.ts`
- **Pass Conditions:**
  1. `await ingestDocument({ name: 'DIGITAL THERMOMETER real.docx', buffer })` returns `success: true`, `canonicalReady: true`, and `text.length > 35000`.
  2. `canonicalDoc.rawText` contains `"Thermometer"`, `"digital thermometer"`, `"19th century"`, `"50C"`, `"2.1"`.
  3. `canonicalDoc.rawText` does NOT contain `"T\nhermometer"`, `"thermo\nmeters"`, `"19\nth"`, `"5\n0\nC"`, or `"2\n.\n1"`.
  4. Two consecutive extractions yield identical SHA-256 canonical text hashes.
- **Implementation Status:** NOT IMPLEMENTED (waiting for explicit user authorization).

---

## 6. Unresolved Risks & Prerequisites
1. `universalIngestionService.ts` currently fails to populate `adapterResult.text` when calling `extractDocx` because `DocxExtractionResult` defines `canonicalText`. Fixing this requires modifying `universalIngestionService.ts` to map `canonicalText` to `text` and `characterCount`, which requires user authorization before code edit.
2. `officeZipAdapter.ts` still contains the defective regex extractor; until fully retired or replaced across all caller sites, any residual calls to `extractDocxText` risk reintroducing fragmentation.
