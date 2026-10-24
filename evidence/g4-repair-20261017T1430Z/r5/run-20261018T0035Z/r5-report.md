# HOEOS G4 PHASE R5 INDEPENDENT ENGINE CERTIFICATION REPORT

**Workstream:** Gradifi Verify  
**Gate:** G4 (Evidence Highlighting)  
**Phase:** R5 (Independent Engine Closure)  
**Operating Principle:** Evidence Before Assumption  
**Run Identifier:** `run-20261018T0035Z`  
**Evidence Root:** `evidence/g4-repair-20261017T1430Z/r5/run-20261018T0035Z/`  
**Execution Timestamp:** 2026-10-18T01:01:21Z  
**Final Terminal Status:** `FAIL` (Exit Code: 1)  
**G4 Verification-Engine Certification:** `NOT CERTIFIED`

---

## 1. EXECUTIVE SUMMARY & VERDICT

In accordance with HOEOS Phase R5, a full end-to-end certification run of the Gradifi verification engine was executed against a **standard production build** (`npm run build`) served via `vite preview` on `http://127.0.0.1:4173/tools/plagiarism`, with the test seam **strictly absent** and **zero result fixtures injected**.

The certification run successfully executed the complete real pipeline and produced two independent evidence trails:
1. **Trail A (Real Engine Output):** Captured from live `window.__GRADIFI_VERIFY_RESULT__` after full server persistence.
2. **Trail B (Rendered DOM Observations):** Captured directly from live browser locators inspecting `<mark>` elements.

### Crucial Forensic Findings:
1. **DOM vs Engine Alignment:** `MATCH` (100%). The DOM viewer rendered exactly the findings produced by the real verification engine.
2. **Engine vs Candidate Oracle Mismatch:** `MISMATCH`. The candidate oracle findings (`finding-g4-quantum-001` and `finding-g4-distrib-002` at offsets `[0, 85]` and `[788, 935]` mapped to `src-crossref-10.1038-001`) were hand-authored fixtures created for R2/R3 seam injection. When executing without the test seam, the real engine queries live academic APIs (OpenAlex, Crossref) and independently identifies real academic literature:
   - Mark 1: `"Federated Learning"` at offsets `[58, 76]`, finding `de51b5db0696a8eb`, source `https://openalex.org/W7163668962` (OpenAlex paper: *Quantum Key Distribution (QKD) Enabled Secure Model Update Exchange in Federated Learning*).
   - Mark 2: `"machine learning"` at offsets `[800, 816]`, finding `a8bf1fe9b46f5759`, source `doi:10.21203/rs.3.rs-9358734/v1` (Crossref/Preprint: *Federated-Inspired Vertically Distributed Quantum Machine Learning*).
3. **Mandatory Fail-Closed Assertion:** Because the real engine outputs real literature findings rather than the hand-authored fixture findings, the Playwright certification assertions failed as mandated by HOEOS Rule 7 ("No Fabricated Results") and Rule 1 ("Evidence Before Assumption").

**Final Outcome:**
- **Terminal Status:** `FAIL` (Process Exit Code: 1).
- **G4 Engine Certification Status:** `NOT CERTIFIED`.

---

## 2. REPOSITORY & BUILD INTEGRITY

- **Git Branch:** `main`
- **Git Commit:** `9b70b62190c6a739c84ccc8f4c4c9cd9470e9e44`
- **Build Command:** `cmd.exe /c npm run build` (with `VITE_ENABLE_TEST_SEAM` explicitly absent/unset)
- **Build Duration:** 56.9 seconds | **Build Exit Code:** 0
- **Generated Bundle Artifacts Scanned:**
  - `dist/assets/index-BSCxyAcr.js` (2,010,229 bytes, `F9D71550606652219683893B8011D28EFF38F960AB138A213569F957FB143D8D`)
  - `dist/assets/index.es-D6O0LuO_.js` (159,715 bytes, `1059F797D1122EC61EAAD910DCE54A2D35FC19A02578974713F809432751FF0F`)
  - `dist/assets/html2canvas.esm-QH1iLAAe.js` (202,379 bytes, `061C08E50C0DC57B8D5E6531F0B8237A52A68B233260D49AB2F2C2906AD112C4`)
  - `dist/assets/pdf.worker.min-BmVo14Nb.mjs` (1,317,034 bytes, `A33CFE728C584FDBA4FCC1FD54BCDC2F9F2F13889DDBB5B2BD1D0F8CBE49B84E`)
  - `dist/assets/purify.es-DBIK8olT.js` (29,400 bytes, `A9D2D63B75E213057D367D80B94A17CDAA0B9FB272B8B6B32E7F7AA9DF27F836`)
- **Seam Scan Matches:** **0 hits** for `__GRADIFI_TEST_TRANSFORM_VERIFY_RESULT__`.
- **Runtime Seam Verification:** `window.__GRADIFI_TEST_TRANSFORM_VERIFY_RESULT__` verified as `undefined` at browser runtime.

---

## 3. INDEPENDENT ORACLE PROVENANCE & DISCREPANCY

Detailed in [`r5-independent-oracle.json`](file:///C:/Projects/Gradifi/evidence/g4-repair-20261017T1430Z/r5/run-20261018T0035Z/r5-independent-oracle.json):
- **Canonical Document:** `SAMPLE_ACADEMIC_TEXT` / `G4_CANONICAL_DOCUMENT_TEXT` (Length: 1,083 characters, SHA-256: `64C1B143973E8795A78FE9A8D61A28469C365C8C673D5417B696FDFBA7FD6D71`).
- **Candidate Finding A:** Hand-authored expectation `finding-g4-quantum-001`, source `src-crossref-10.1038-001`, offsets `[0, 85]`.
- **Candidate Finding B:** Hand-authored expectation `finding-g4-distrib-002`, source `src-crossref-10.1038-001`, offsets `[788, 935]`.
- **Provenance Analysis:** The candidate expectations originated from `e2e/g4-fixtures.ts` as simulated fixtures for visual testing during R2 and R3. Because the real verification engine does not query a hardcoded fixture database, but rather live academic APIs (Crossref/OpenAlex), it computes deterministic sentence overlap hashes against actual retrieved literature.

---

## 4. DUAL EVIDENCE TRAILS

### Trail A: Real Engine Output Snapshot ([`r5-engine-result.json`](file:///C:/Projects/Gradifi/evidence/g4-repair-20261017T1430Z/r5/run-20261018T0035Z/r5-engine-result.json))
- **Engine Version:** `SIM-V1`
- **Total Sources Evaluated:** 7 verified sources retrieved from OpenAlex and Crossref.
- **Similarity Findings:** 7 deterministic overlap findings.
- **Top Verified Finding 1:** ID `de51b5db0696a8eb`, source `https://openalex.org/W7163668962`, text: `"Federated Learning (FL) allows the model to be trained cooperatively..."`
- **Top Verified Finding 2:** ID `a8bf1fe9b46f5759`, source `doi:10.21203/rs.3.rs-9358734/v1`, text: `"Abstract Distributed quantum machine learning (QML)..."`

### Trail B: Real DOM Observations ([`r5-dom-observations.json`](file:///C:/Projects/Gradifi/evidence/g4-repair-20261017T1430Z/r5/run-20261018T0035Z/r5-dom-observations.json))
- **DOM Viewer Rendered:** `true` (`[data-testid="canonical-document-viewer"]`)
- **Unavailable Indicator Visible:** `false`
- **DOM Mark Count:** `2`
- **Mark 0:**
  - `data-finding-id`: `"de51b5db0696a8eb"`
  - `data-source-id`: `"https://openalex.org/W7163668962"`
  - `data-start-offset`: `"58"` | `data-end-offset`: `"76"`
  - `highlightText`: `"Federated Learning"`
- **Mark 1:**
  - `data-finding-id`: `"a8bf1fe9b46f5759"`
  - `data-source-id`: `"doi:10.21203/rs.3.rs-9358734/v1"`
  - `data-start-offset`: `"800"` | `data-end-offset`: `"816"`
  - `highlightText`: `"machine learning"`
- **Screenshot:** [`screenshots/r5_real_engine_dom_highlight.png`](file:///C:/Projects/Gradifi/evidence/g4-repair-20261017T1430Z/r5/run-20261018T0035Z/screenshots/r5_real_engine_dom_highlight.png)

---

## 5. THREE-WAY COMPARISON EVALUATION

Detailed in [`r5-three-way-comparison.json`](file:///C:/Projects/Gradifi/evidence/g4-repair-20261017T1430Z/r5/run-20261018T0035Z/r5-three-way-comparison.json):

1. **DOM vs Real Engine:** **`MATCH`**
   - Both rendered marks in the DOM resolve directly to real engine similarity findings (`de51b5db0696a8eb` and `a8bf1fe9b46f5759`).
   - The UI presentation layer correctly visualized the genuine engine output without errors.
2. **Real Engine vs Candidate Oracle:** **`MISMATCH`**
   - Finding A (`finding-g4-quantum-001`, `[0, 85]`) is NOT present in engine output.
   - Finding B (`finding-g4-distrib-002`, `[788, 935]`) is NOT present in engine output.
3. **DOM vs Candidate Oracle:** **`MISMATCH`**
   - DOM marks reflect real OpenAlex/Crossref matches, not the hand-authored fixture.

---

## 6. ADVERSARIAL REJECTION CONTROLS (8 / 8 PASSED)

Detailed in [`r5-adversarial-controls.csv`](file:///C:/Projects/Gradifi/evidence/g4-repair-20261017T1430Z/r5/run-20261018T0035Z/r5-adversarial-controls.csv):

| Control ID | Mutation Tested | Expected Verdict | Observed Verdict | Status |
|---|---|---|---|---|
| `CTRL_VALID` | Control: valid engine and DOM matching oracle | `PASS` | `PASS` | `PASS` |
| `ADV_01_MISMATCHED_SOURCE_ID` | Mismatched source ID in engine finding | `REJECT` | `REJECT` | `PASS` |
| `ADV_02_INCORRECT_OFFSET` | Incorrect start/end offset in engine finding | `REJECT` | `REJECT` | `PASS` |
| `ADV_03_CANONICAL_SLICE_MISMATCH` | Canonical slice mismatch in finding text | `REJECT` | `REJECT` | `PASS` |
| `ADV_04_MISSING_EXPECTED_FINDING` | Missing expected finding in engine output | `REJECT` | `REJECT` | `PASS` |
| `ADV_05_MISSING_DOM_MARK` | Missing DOM mark (count 1 instead of 2) | `REJECT` | `REJECT` | `PASS` |
| `ADV_06_EXTRA_STALE_DOM_MARK` | Extra or stale DOM mark rendered (count 3) | `REJECT` | `REJECT` | `PASS` |
| `ADV_07_DOM_ENGINE_DISAGREEMENT` | Disagreement between engine offset and DOM mark | `REJECT` | `REJECT` | `PASS` |

---

## 7. FINALIZER EVALUATION & TERMINAL STATUS

- **Finalizer Script:** `scratch/finalize_g4_evidence_r5.ps1`
- **Finalizer Terminal Status:** **`FAIL`**
- **Process Exit Code:** **`1`**
- **Precedence Rank:** `3` (`FAIL` overrides `PASS`)
- **Explanation:** The certification test executed authentically against the standard production build. All prerequisites passed. However, the real engine's independently generated findings diverge from the hand-authored candidate oracle expectations.
- **Summary JSON:** [`r5-summary.json`](file:///C:/Projects/Gradifi/evidence/g4-repair-20261017T1430Z/r5/run-20261018T0035Z/r5-summary.json)

---

## 8. CERTIFICATION BOUNDARY CONCLUSION

**G4 Verification-Engine Certification remains `NOT CERTIFIED`**.

### Distinction:
- **Test Execution Integrity:** `AUTHENTIC` (Vite preview on standard build, seam absent, real network federation executed, dual evidence trails saved).
- **Presentation Layer Functionality:** `PROVEN` (DOM marks accurately mirror real engine output with zero visual artifacts).
- **Engine Certification Verdict:** `NOT CERTIFIED` (The actual backend engine produces live internet findings rather than the candidate oracle findings).
