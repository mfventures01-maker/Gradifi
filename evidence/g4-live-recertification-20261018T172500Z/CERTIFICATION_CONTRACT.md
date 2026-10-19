# HOEOS G4 Live-Provider Certification Contract

**Specification Under Test:** `e2e/g4-live-provider-certification.spec.ts`  
**Target Environment:** Local development server (`http://127.0.0.1:5173`)  
**Target Gate:** Gate 4 (Canonical Text Highlighting & Visual Evidence Invariants)  
**Evidence Directory:** `evidence/g4-live-recertification-20261018T172500Z`  
**Contract Version:** 1.0 (Pre-Execution Baseline)  

---

## 1. Positive Path Invariants (Mandatory for PASS)

1. **Document Identity & Canonicalization:**
   - The document loaded via `"Pre-load Demo Document"` must have text length > 1,000 characters and contain `"Quantum Entanglement and Decoupled Neural Architecture"`.
   - Canonical text captured from `canonicalDocument.rawText` must match the demo document textarea input.

2. **Genuine Application & Provider Flow (Zero Seam Injection):**
   - At page load and throughout execution, `typeof window.__GRADIFI_TEST_TRANSFORM_VERIFY_RESULT__` must strictly equal `'undefined'`.
   - The test must NEVER define or invoke `window.__GRADIFI_TEST_TRANSFORM_VERIFY_RESULT__`.
   - Outbound network requests to `/api/verify/openalex` and `/api/verify/crossref` must be observed by Playwright network listeners and must return HTTP status 200.

3. **Provider Attribution & Non-Fixture Provenance:**
   - Findings in the application result must originate from actual provider matches, NOT from `e2e/g4-fixtures.ts`.
   - `matchedDocumentId` must NOT equal fixture identifiers (e.g., must NOT be `src-crossref-10.1038-001`, `finding-g4-quantum-001`, or `doi:10.9999/gradifi-r6-a`).
   - Every certified finding must carry authentic provider provenance (`sourceId` matching an authoritative URI or DOI, e.g., `https://openalex.org/...` or `doi:...`).

4. **Persistence Authority:**
   - A valid verification ID starting with `VRF-` must be assigned to the result.
   - The application must successfully transition to `currentStep = 'result'`, proving that `persistVerificationRecord` completed without error.

5. **DOM Mark Correspondence & Slice Integrity:**
   - The Canonical Document Viewer (`[data-testid="canonical-document-viewer"]`) must be visible in the DOM.
   - At least 1 `<mark data-finding-id>` must be rendered.
   - For every rendered `<mark>`:
     - `data-finding-id` must match a finding in `similarityAnalysis.findings`.
     - `data-source-id` must match the finding's `matchedDocumentId`.
     - `data-start-offset` and `data-end-offset` must parse to valid integers satisfying `0 <= start < end <= canonicalText.length`.
     - The rendered text inside the mark must strictly equal `canonicalText.slice(start, end)`.

6. **Review Boundary Disclaimers & Forbidden Verdict Words:**
   - The container must display `"Human Academic Review Boundary"`.
   - The container HTML must NOT contain forbidden conclusive verdict words: `PLAGIARIZED`, `GUILTY`, or `PROVEN PLAGIARISM`.

---

## 2. Negative & Integrity Safeguards

- If provider responses fail or are empty, no synthetic marks may be manufactured.
- If persistence fails, the viewer must NOT be displayed.
- If any mark's text does not match the canonical slice, the test must immediately FAIL.
- A test exit code of 0 without meeting all above criteria shall be classified as INCONCLUSIVE or FAIL, never PASS.
