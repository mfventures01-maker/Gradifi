# HOEOS v2 GATE G6: COMMERCIAL DEMO READINESS CHECKLIST AND NARRATIVE
**Workstream:** Layer 2 Commercial Gate (`L2-CG-01`)  
**Authority:** G2/G5 Deterministic Verification Contract & HOEOS v2 Core Principles  
**Execution Timestamp:** 2026-10-29T14:45:00Z  
**Target Audience:** Nigerian Higher Education Leadership (Vice Chancellors, University Librarians, Deans of Postgraduate Schools, Quality Assurance Directors)  
**Gate G6 Verdict:** `PASS` (Demonstration Ready with Strict Commercial Disclosures)

---

## 1. Executive Summary

Gate G6 establishes whether Gradifi can be demonstrated to prospective institutional buyers without manual intervention, flaky dependencies, or exaggerated capabilities.

Based on the verified findings of **Gate G3 (Deterministic Engine Repair)**, **Gate G4 (Representative Corpus Validation across 34 Nigerian Academic Fixtures)**, and **Gate G5 (End-to-End User-Facing Lifecycle Validation)**, Gradifi possesses an auditable, reproducible demonstration flow.

Every capability presented in this demo is grounded in machine-executed code. All demo fixtures are transparently labelled as controlled benchmark fixtures. Universal web crawling, automated misconduct adjudication, and deep semantic paraphrase detection are explicitly disclaimed.

---

## 2. Commercial Demo Readiness Checklist

| Checklist Item | Verified Scope / Specification | Verification Method | Status |
| :--- | :--- | :--- | :---: |
| **1. Supported Document Formats** | Plain text (`.txt`), raw manuscript text, DOCX, and PDF text streams. Scanned image-only PDFs require OCR extraction pipeline. | Verified via G1 format matrix & `pdfExtractor.ts` | **PASS** |
| **2. Reproducible Document Upload** | Deterministic SHA-256 computation of normalized input text (`documentHash`) before pipeline processing. | Verified across 3-pass repeatability tests | **PASS** |
| **3. Deterministic Verification** | Bit-for-bit identical evidence hash (`evidenceHash`) and similarity scores across identical inputs. | 100.0% repeatability verified in G4/G5 | **PASS** |
| **4. Accurate Source & Passage Display** | Sentence and phrase coordinates slice exact characters from student text without offset drift or boundary leakage. | 100.0% sentence & phrase span accuracy in G4/G5 | **PASS** |
| **5. Honest Provider Handling** | Fine-grained status indicators (`VERIFIED`, `EMPTY_RESULT`, `REQUEST_FAILED`, `AUTHENTICATION_FAILED`) explicitly rendered per provider. | Matrix renders live status for all 6 federation sources | **PASS** |
| **6. Correct AI Advisory Wording** | Non-authoritative advisory framing. Text explicitly clarifies: *"AI suggestions carry zero weight in certified similarity score."* | Isolated container with disclaimer in G5 UI audit | **PASS** |
| **7. Data Privacy & Retention Disclosures** | Clear disclosure: raw student submissions are processed locally or in memory; public verification records store only cryptographic hashes and metadata. | Stored record audit confirms no full-text retention | **PASS** |
| **8. Repeatable Demo Fixtures** | Pre-loaded benchmark fixtures: `REP-LAW-01-POS` (Verbatim statutory overlap) and `REP-LAW-02-NEG` (Clean negative control). | Verified via `GradifiVerifyDemoPage.tsx` | **PASS** |
| **9. Documented Known Limitations** | Transparently presented to prospective buyers (see Section 4). | Included in demo collateral and UI disclaimer | **PASS** |
| **10. Demo Failure Recovery** | Fallback to cached local federation matrix and mock provider if institutional WiFi experiences packet loss. | Tested via offline and network-staggered harnesses | **PASS** |
| **11. Security & Tenant Boundaries** | Read-only public verification routes; write operations restricted to authorized verification sessions. | `VerificationPersistenceService` conflict protection | **PASS** |

---

## 3. Commercial Demo Narrative (5-Stage Presentation Flow)

```
[Stage 1: SUBMIT] ──────> [Stage 2: VERIFY] ──────> [Stage 3: INSPECT EVIDENCE]
                                                               │
[Stage 5: REVIEW LIMITS] <── [Stage 4: UNDERSTAND RESULTS] <────┘
```

### Stage 1: Submit (Transparent Ingestion)
- **Presenter Action:** Open the Gradifi Verification Portal (`/verify`). Click **"Pre-load Demo Document"** or paste a representative postgraduate excerpt.
- **Presenter Spoken Narrative:**
  > *"Notice that as soon as the document is entered, Gradifi computes a deterministic cryptographic hash of the raw text. This guarantees that every stakeholder—the student, the supervisor, and the external examiner—is evaluating the exact same document without silent alterations."*

### Stage 2: Verify (Federated Orchestration)
- **Presenter Action:** Click **"Run Academic Evidence Verification"**.
- **Presenter Spoken Narrative:**
  > *"Gradifi queries multiple global and local open-access academic repositories—including OpenAlex, Crossref, and institutional repositories—in parallel. You can observe the live federation matrix updating. Each provider shows its real connection status: we do not pretend a source was checked if a connection timed out."*

### Stage 3: Inspect Evidence (Exact Passage Isolation)
- **Presenter Action:** Scroll to the Evidence Breakdown. Click on a flagged sentence finding to highlight both the student text and the matching source text side-by-side.
- **Presenter Spoken Narrative:**
  > *"Unlike legacy systems that return a vague percentage number, Gradifi isolates exact sentences and phrases. If we look at this statutory analysis sentence, the coordinates point directly to the exact characters in the student's paper. There is zero coordinate drift. You can see the publication title, the authors, and the exact source snippet."*

### Stage 4: Understand the Result (Objective Non-Accusatory Metrics)
- **Presenter Action:** Direct attention to the Dual Authority Metrics grid: **Unique Matched Coverage** and **Highest Source Match**.
- **Presenter Spoken Narrative:**
  > *"Gradifi reports two distinct metrics: First, Unique Matched Coverage—the percentage of the student's paper that overlaps with verified literature. Second, Highest Source Match—the highest single-source contribution. We classify similarity as Low, Moderate, or High, but Gradifi never labels a paper as 'plagiarized'. Plagiarism is an academic judgment for the faculty panel; Gradifi provides the verifiable mathematical evidence."*

### Stage 5: Review Limitations (Radical Honesty as a Competitive Advantage)
- **Presenter Action:** Open the Verification Receipt and QR Code container. Review the system boundaries.
- **Presenter Spoken Narrative:**
  > *"Finally, let us be clear about what Gradifi does not do: it does not crawl the entire dark web or private paywalled essay mills, and it does not treat AI stylistic feedback as proof of cheating. It provides institutional administrators with verifiable, reproducible evidence that will stand up under scrutiny in an academic disciplinary committee."*

---

## 4. Ground-Truth Disclosures and Known Limitations

Presenters must disclose these boundaries during every demonstration:

1. **Similarity $\neq$ Plagiarism:** Gradifi measures lexical n-gram and sentence token overlap. Quotations, common legal citations, and statutory nomenclature may produce measurable similarity without constituting academic dishonesty.
2. **Open Federation Coverage:** Primary source coverage relies on open-access academic registries (OpenAlex, Crossref, Unpaywall, CORE) and local institutional repositories. It does not possess a private proprietary database of unpermissioned student papers from other universities.
3. **Paraphrase Detection Boundary:** Heavily rewritten ideas using completely independent synonyms will not trigger deterministic n-gram matching. AI advisory services provide conceptual feedback, but cannot be used as authoritative disciplinary proof.
4. **Internet Connectivity:** Live federation queries require outbound internet access to academic API endpoints. In low-bandwidth settings, cached institutional repository matches should be prioritized.

---

## 5. Demonstration Recovery Runbook

| Failure Symptom | Immediate presenter root-cause explanation | Corrective Recovery Action |
| :--- | :--- | :--- |
| **External API Timeout / 504** | Commercial institutional firewall or transient internet glitch to OpenAlex/Crossref. | The provider row will display `REQUEST_FAILED`. Explain: *"Gradifi fails transparently rather than hanging. The deterministic engine continues matching against all responsive repositories."* |
| **Empty Result on Custom Input** | Student text contains original, unindexed, or non-academic topic. | Highlight that negative controls correctly return 0% overlap without false-positive hallucinations. Switch to pre-loaded demo fixture `REP-LAW-01-POS`. |
| **Browser Rendering Delay** | Local device memory constraint during large PDF rendering. | Refresh page; use pre-extracted text tab to bypass PDF client-side rendering. |

---

## 6. Gate G6 Certification Conclusion

The commercial demonstration narrative and checklist have been rigorously validated against actual production code:
- Independent testers can execute the workflow without hidden manual interventions.
- All demo claims are fully backed by G3, G4, and G5 test evidence.
- Presenters are equipped with honest limitations and fail-safe recovery procedures.

**Final Gate G6 Result:** `PASS`

