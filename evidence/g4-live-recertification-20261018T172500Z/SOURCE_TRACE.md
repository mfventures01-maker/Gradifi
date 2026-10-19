# HOEOS Phase 1 Source Trace: Real Application Execution Path

**Gate:** G4 (Canonical Text Highlighting & Visual Evidence Boundary)  
**Repository:** `C:\Projects\Gradifi`  
**HEAD Commit:** `9b70b62190c6a739c84ccc8f4c4c9cd9470e9e44`  
**Audit Date:** 2026-10-18T17:25:00Z  

---

## 1. Demo Document Selection & Canonicalization

* **Source File:** `src/pages/verify/GradifiVerifyDemoPage.tsx`
* **Pre-load Handler:** Lines 649–653
  ```tsx
  onClick={() => {
    setDocumentText(SAMPLE_ACADEMIC_TEXT);
    parseNormalizedMetadata(SAMPLE_ACADEMIC_TEXT, true);
  }}
  ```
* **Sample Text Source:** Lines 157–180 (`SAMPLE_ACADEMIC_TEXT`, 1,808 characters, title *"Quantum Entanglement and Decoupled Neural Architecture in Federated Learning Networks"*).
* **Canonicalization:** Lines 182–194:
  ```tsx
  const canonical = buildCanonicalAnalysisDocument({
    rawText: text,
    isFixture
  });
  setCanonicalDoc(canonical);
  ```
  Calls `buildCanonicalAnalysisDocument` (`src/services/verify/documentNormalizer.ts`) to produce immutable canonical document representation, normalize line endings, parse metadata (title, authors, DOI, ISBN, abstract), and calculate `inputHash`.

---

## 2. Verification Request Initiation

* **Source File:** `src/pages/verify/GradifiVerifyDemoPage.tsx`
* **Trigger:** Lines 700–705 (button labeled *"Run Academic Evidence Verification"*).
* **Execution Function:** Lines 264–330 (`handleExecuteVerification`):
  ```tsx
  setVerifying(true);
  setCurrentStep('federation');
  let res = await verifyCoreService.executeVerifyRun(documentText);
  ```

---

## 3. Live Provider Execution & Query Dispatch

* **Source File:** `src/services/verify/verifyCoreService.ts`
* **Function:** `executeVerifyRun` (Lines 69–245)
* **Keyword & Query Construction:** Lines 89–96 (`buildProviderQuery` extracts top discriminating terms).
* **Parallel Staggered Dispatch:** Lines 117–132
  - `OpenAlexProvider.search(...)` -> `POST /api/verify/openalex`
  - `CrossrefProvider.search(...)` -> `POST /api/verify/crossref`
  - `UnpaywallProvider.search(...)` -> `POST /api/verify/unpaywall`
  - `CoreProvider.search(...)` -> `POST /api/verify/core`
  - `GoogleBooksProvider.search(...)` -> `POST /api/verify/googlebooks`
  - `SemanticScholarProvider.search(...)` -> `POST /api/verify/semanticscholar`
* **Server Middleware Handlers:** `src/services/verify/server/verifyServerPlugin.ts` (lines 157–163)
  - `handleOpenAlexServerSearch` (`src/services/verify/server/openAlexServerHandler.ts`) -> calls `https://api.openalex.org/works`
  - `handleCrossrefServerSearch` (`src/services/verify/server/crossrefServerHandler.ts`) -> calls `https://api.crossref.org/works`

---

## 4. Provider Response Parsing & Source Attribution

* **Source Files:**
  - `src/services/verify/server/openAlexServerHandler.ts` (lines 65–170)
  - `src/services/verify/server/crossrefServerHandler.ts` (lines 65–150)
* **Contract:** Providers parse raw API JSON into structured `EvidenceMatch` objects with:
  - `sourceId`: Authoritative URI or DOI (e.g. `https://openalex.org/W7163668962` or `doi:10.21203/rs.3.rs-9358734/v1`)
  - `title`, `authors`, `doi`
  - `matchedText`, `originalSnippet`
  - `provenance.provenanceState`: `'VERIFIED'`

---

## 5. Finding Creation & Offset Resolution

* **Source File:** `src/services/verify/deterministicEngine.ts`
* **Function:** `evaluateDocumentSimilarityInternal` / `extractSimilarityFindingsFromEvidenceMatches`
* **Mapping:**
  - `findingId`: Deterministic SHA-256 slice (16 hex chars)
  - `matchedDocumentId`: Mapped to `EvidenceMatch.sourceId`
  - `sourceStart`: Character offset in `canonicalDoc.rawText`
  - `sourceEnd`: End character offset in `canonicalDoc.rawText`
  - `matchMethod`: `'EXACT_PHRASE'` | `'NGRAM'` | `'TOKEN_OVERLAP'`

---

## 6. Test-Only Fixture Seam Hook & Activation Conditions

* **Source File:** `src/pages/verify/GradifiVerifyDemoPage.tsx`
* **Location:** Lines 275–280
  ```tsx
  if ((import.meta.env.DEV || import.meta.env.VITE_ENABLE_TEST_SEAM === 'true') && typeof window !== 'undefined') {
    const hook = (window as any).__GRADIFI_TEST_TRANSFORM_VERIFY_RESULT__;
    if (typeof hook === 'function') {
      res = hook(res);
    }
  }
  ```
* **Forensic Finding:**
  - The seam ONLY intercepts if `window.__GRADIFI_TEST_TRANSFORM_VERIFY_RESULT__` is explicitly set to a callable function in the browser context.
  - If a test never defines `window.__GRADIFI_TEST_TRANSFORM_VERIFY_RESULT__`, the condition evaluates `false`, and `res` remains the pure, untransformed output of the live verification engine.

---

## 7. Persistence Execution & Awaiting Boundary

* **Source File:** `src/pages/verify/GradifiVerifyDemoPage.tsx`
* **Location:** Lines 282–308
  ```tsx
  const { record } = await verificationPersistenceService.persistVerificationRecord(
    persistResult as any,
    persistEnvelope as any
  );

  if (!record?.verification_id) {
    throw new Error('Persistence returned no verification_id');
  }
  ```
* **Forensic Finding:**
  - `persistVerificationRecord` is strictly `await`ed before setting state.
  - If persistence throws or fails to return a `verification_id`, execution enters the `catch` block (lines 316–327), calling `setResult(null)`, setting `window.__GRADIFI_VERIFY_RESULT__ = null`, and preventing the transition to `currentStep = 'result'`.
  - The Canonical Document Viewer is ONLY rendered when `currentStep === 'result'` and `result !== null`.

---

## 8. State Transition & Global Exposure Timing

* **Source File:** `src/pages/verify/GradifiVerifyDemoPage.tsx`
* **Location:** Lines 310–315
  ```tsx
  setVerificationId(record.verification_id);
  setResult(res);
  if (typeof window !== 'undefined') {
    (window as any).__GRADIFI_VERIFY_RESULT__ = res;
  }
  setCurrentStep('result');
  ```
* **Timing:** `window.__GRADIFI_VERIFY_RESULT__` is assigned only after persistence succeeds and synchronously with `setResult(res)`.

---

## 9. DOM Mark Generation & Highlighting Rendering

* **Source Files:**
  - `src/pages/verify/GradifiVerifyDemoPage.tsx` (lines 121–123)
  - `src/services/verify/matchedTextHighlightingService.ts` (`resolveMatchedEvidenceSpans`, `buildRenderedSegments`)
  - `src/components/verify/CanonicalDocumentViewer.tsx`
* **Invariant:**
  - `resolveMatchedEvidenceSpans` validates `0 <= start < end <= canonicalText.length` and checks `verifyOffsetSlice(canonicalText, { startOffset, endOffset, text: matchedText })`.
  - Invalid offsets are dropped.
  - Overlapping spans are merged by `buildRenderedSegments` preserving the stronger match method.
  - `<mark>` elements are rendered in DOM with attributes:
    `data-finding-id`, `data-source-id`, `data-start-offset`, `data-end-offset`, `data-method`.
  - Core round-trip invariant: `stripHighlightingMarkup(renderHighlightedHtml(canonicalText, spans)) === canonicalText`.
