# HOEOS G1 CONCLUSIVE RESEARCH & FORENSIC CERTIFICATION REPORT

**Repository**: `C:\Projects\Gradifi`  
**Branch**: `clean-deploy`  
**Git HEAD**: `9a59897599d11d5f812f0800c6764b2d01eeb93b`  
**Subsystem**: `G1 — Scanned PDF OCR Ingestion`  
**Certification Status**: **WITHHELD**  
**Timestamp**: 2026-09-21T23:45:00+01:00  

---

## 1. EXECUTIVE FINDING

The HOEOS G1 Scanned-PDF OCR Ingestion certification is **WITHHELD**.

While the production codebase contains **zero synthetic text fabrication, zero hardcoded phrase mocks, and zero test-only shortcuts**, a genuine scanned/image-only PDF whose embedded images use standard deflate compression (`/FlateDecode`) **cannot currently be ingested through the production OCR pipeline**.

Specifically, the current implementation in `src/utils/pdfExtractor.ts`:
1. Naively scans raw PDF byte streams for uncompressed JPEG markers (`0xFF 0xD8 0xFF`), returning `0` images for deflated PDF image objects (`/FlateDecode`).
2. Passes the raw `application/pdf` File object directly to Tesseract.js, which fails with `OCR_WORKER_FAILURE` (`Error attempting to read image`).
3. Fails closed with `TEXT_EXTRACTION_UNAVAILABLE`, but reports default metadata (`ocrUsed: false`, `ocrStatus: NOT_AVAILABLE`), resulting in an **observability/provenance defect**.

---

## 2. SYSTEM UNDER INVESTIGATION

- **Repository**: `C:\Projects\Gradifi`
- **Branch**: `clean-deploy`
- **HEAD Commit**: `9a59897599d11d5f812f0800c6764b2d01eeb93b`
- **Relevant Source Files**:
  - `src/services/verify/universalIngestionService.ts`
  - `src/services/verify/ingestionAdapters/pdfAdapter.ts`
  - `src/utils/pdfExtractor.ts`
  - `src/services/ocrService.ts`
- **Engine Dependencies**: `tesseract.js`: `^7.0.0`

---

## 3. G1 ACCEPTANCE CRITERION

> A genuine scanned/image-only PDF must enter the production ingestion path (`ingestDocument`), invoke the OCR engine, extract text from embedded page images, accurately reflect `ocrUsed: true` and `ocrStatus: USED`, and return legible recovered text without hardcoded, mocked, or synthetic fallback data.

---

## 4. EVIDENCE MATRIX

| ID | Proposition | Evidence | Class | Result |
| :--- | :--- | :--- | :--- | :--- |
| **G1-A01** | OCR service module exists and is wired | `src/services/ocrService.ts` | STATIC | **PASS** |
| **G1-B01** | OCR fallback branch is reachable | `pdfExtractor.ts:247` | STRUCTURAL | **PASS** |
| **G1-C01** | OCR fallback path executed for scanned PDF | `run_g1_forensics.ts` step 6 | RUNTIME | **PASS** |
| **G1-C02** | Valid raster image payload extracted from PDF | `pdfExtractor.ts:161` | RUNTIME | **FAIL** (0 JPEG streams found for `/FlateDecode`) |
| **G1-C03** | Tesseract accepts raw `application/pdf` File | `ocrService.ts:33` | RUNTIME | **FAIL** (`Error attempting to read image`) |
| **G1-C04** | Ground-truth phrase recovered from scanned PDF | `ingestDocument()` execution | RUNTIME | **FAIL** (Returns empty string / `false`) |
| **G1-C05** | Truthful provenance metadata on OCR failure | `pdfAdapter.ts:103-105` | RUNTIME | **FAIL** (Emits `ocrUsed: false`, `ocrStatus: NOT_AVAILABLE`) |
| **G1-D01** | Complete End-to-End G1 Certification | All evidence requirements | CERTIFICATION | **WITHHELD** |

---

## 5. PRODUCTION CALL GRAPH

```text
ingestDocument(fileOrInput) [universalIngestionService.ts:151]
  │
  ▼ (format = "pdf")
extractPdfAdapter(fileOrBuffer) [pdfAdapter.ts:25]
  │
  ▼
extractDocumentText(file) [pdfExtractor.ts:197]
  ├── extractTextFromPdfStream(arrayBuffer) [pdfExtractor.ts:118]
  │     └── returns "" (0 native text stream)
  │
  └── OCR Fallback Branch [pdfExtractor.ts:247]
        ├── extractJpegImagesFromPdf(arrayBuffer) [pdfExtractor.ts:161]
        │     └── returns [] (0 images found due to /FlateDecode)
        │
        └── ocrService.extractText(file) [pdfExtractor.ts:262]
              └── worker.recognize(application/pdf File) [ocrService.ts:33]
                    └── Throws OCR_WORKER_FAILURE ("Error attempting to read image")
```

---

## 6. FIXTURE FORENSICS (`scanned_page_001.pdf`)

- **File Path**: `tests/fixtures/ingestion/scanned_page_001.pdf`
- **File Size**: `2,300 bytes`
- **SHA256 Hash**: `f7652b0efb0f20f3661f0d1e7414de59cf5a06c3848697460bba711f69bbd226`
- **PDF Header**: `%PDF-1.4`
- **Binary Structure**:
  - `/Font` objects: `false`
  - PDF Text operators (`Tj` / `TJ`): `false`
  - `/Image` XObjects: `true`
  - `/DCTDecode` (JPEG) Filter: `false`
  - `/FlateDecode` (Deflate) Filter: `true`
  - Raw JPEG `FF D8 FF` SOI Count: `0`
- **Ground Truth Containment in Raw PDF**: `FALSE` (Literal phrase `HOEOS_KNOWN_PHRASE_7F3A9C` is absent from raw bytes).

---

## 7. OCR PAYLOAD FORENSICS

When `extractDocumentText()` executes for `scanned_page_001.pdf`:
1. `extractJpegImagesFromPdf()` scans for raw `0xFF 0xD8 0xFF` markers and finds **0 images**.
2. The pipeline branches to `ocrService.extractText(file)`.
3. **Payload Type Passed**: `File` object (`name: "scanned_page_001.pdf"`, `type: "application/pdf"`, `size: 2300`).
4. **Tesseract.js Result**: Tesseract.js (v7.0.0) worker attempts to read the raw PDF stream as a raster image format, failing with:
   ```text
   Error in findFileFormatStream: truncated file
   ❌ OCR Error: Error: Error attempting to read image.
   ```

---

## 8. OCR ENGINE ISOLATION (`known-text.jpg`)

To verify that Tesseract.js itself is functioning correctly:
- **Test Image**: `scratch/g1_ocr/known-text.jpg`
- **Image SHA256**: `9f40c168469692c4154bdcb760c1e43e11b277a32ac99c250836a933e371beca`
- **Execution Command**: `ocrService.extractText('scratch/g1_ocr/known-text.jpg')`
- **Result**: **SUCCESS**
  - Confidence: `92%`
  - Extracted Text: `"HOEOS KNOWN PHRASE 7F3A9C\n"`
  - Phrase Recovery: **CONFIRMED**

*Conclusion*: The Tesseract OCR engine itself is fully operational when supplied with a valid raster image. The defect lies entirely in the PDF image extraction layer.

---

## 9. RUNTIME EVIDENCE

Empirical output from running `npx tsx scratch/g1_ocr/run_g1_forensics.ts`:

```text
--- ingestDocument() UNIVERSAL RESULT FOR SCANNED PDF ---
Success: false
Format: pdf
Extraction Method: pdf_stream_extractor
OCR Used: false
OCR Status: NOT_AVAILABLE
Warnings: ["Text extraction unavailable. PDF contains no legible text or OCR failed."]
Error: {"code":"TEXT_EXTRACTION_UNAVAILABLE","message":"Text extraction unavailable. PDF contains no legible text or OCR failed."}
Extracted Text Length: 0
Canonical Document Ready: false
```

---

## 10. FAILURE ANALYSIS & CONCLUSIVE BROKEN INVARIANT

### The First Broken Invariant
> **`PDF Image Object Extraction & Page Rasterization Boundary (pdfExtractor.ts:161-191)`**

`extractJpegImagesFromPdf()` assumes that embedded images in PDFs are stored as raw, uncompressed JPEG byte streams containing `0xFF 0xD8 0xFF` markers. In standard PDF generators (such as Playwright, Chromium, or Adobe), embedded images are compressed using `/FlateDecode` or stored inside PDF object streams.

Because `extractJpegImagesFromPdf()` returns 0 images:
1. It passes the raw PDF file directly to Tesseract.
2. Tesseract crashes with `Error attempting to read image`.
3. Ingestion fails closed.

---

## 11. METADATA / PROVENANCE ANALYSIS

When the OCR fallback execution fails due to the unhandled PDF file format, `extractPdfAdapter`'s outer `catch` block catches the exception and returns:
```typescript
{
  success: false,
  extractionMethod: 'pdf_stream_extractor',
  ocrUsed: false,
  ocrStatus: 'NOT_AVAILABLE'
}
```
This is a **runtime provenance defect**. The system executed the OCR fallback path, but reports `ocrUsed: false` and `ocrStatus: NOT_AVAILABLE`, concealing the actual attempted execution state.

---

## 12. FABRICATION / SUBSTITUTION ANALYSIS

A comprehensive search of `src/`, `tests/`, and `scratch/` for `HOEOS_KNOWN_PHRASE_7F3A9C`, `ocr_tesseract`, `OCR_SUCCESS`, and `OCR_TEXT` established:
- **Hardcoded OCR Text in Production**: `NONE`
- **Synthetic Return Values in Ingestion**: `NONE`
- **Mocked OCR Engine in Universal Ingestion**: `NONE`

The system fails closed honestly; it does not fake results.

---

## 13. NEGATIVE PROOF

Ground-truth verification confirmed that `HOEOS_KNOWN_PHRASE_7F3A9C` is **absent** from the raw bytes of `scanned_page_001.pdf`. The phrase exists only in the source JPEG image pixels (`known-text.jpg`) and requires genuine OCR rasterization for recovery.

---

## 14. REPRODUCIBILITY

An independent investigator can reproduce all findings from a clean repository state:

```powershell
Set-Location C:\Projects\Gradifi
git rev-parse HEAD
# HEAD must be 9a59897599d11d5f812f0800c6764b2d01eeb93b
npx tsx scratch/g1_ocr/run_g1_forensics.ts
```

All raw evidence files are preserved in:
`C:\Projects\Gradifi\scratch\g1_ocr\forensic\`

---

## 15. CERTIFICATION DECISION

**STATUS**: **`G1 CERTIFICATION = WITHHELD`**

**Primary Reason**: Scanned PDFs with deflated image objects (`/FlateDecode`) cannot be converted to raster images by `extractJpegImagesFromPdf()`, causing Tesseract.js to receive an unparseable PDF file payload and fail closed with inaccurate provenance metadata.
