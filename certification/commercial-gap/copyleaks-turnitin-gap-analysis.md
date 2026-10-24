# Commercial Capability Gap Analysis: Gradifi vs. Copyleaks & Turnitin
**Standard:** HOEOS 2.0 Law 12 & Commercial Verification Baseline  
**Nature of Document:** This analysis is based strictly on public claims, published technical whitepapers, patents, and publicly accessible marketing documentation of Turnitin and Copyleaks. It is NOT a licensed API reverse-engineering or benchmark comparison.  
**Date:** 2026-10-22  
**Status:** DRAFT / PROVISIONAL DISPATCH  

---

## 1. Architectural Model Comparison

| Dimension | Turnitin (Public Claims) | Copyleaks (Public Claims) | Gradifi (HOEOS 2.0 Standard) |
| :--- | :--- | :--- | :--- |
| **Scoring Authority** | Proprietary multi-model similarity index and proprietary database match algorithms. | Proprietary cloud-based AI and text comparison engine. | **Pure Deterministic Formula:** 100% algebraic, open-formula deterministic scoring engine. Zero proprietary black-box scoring. |
| **Auditability & Traceability** | Visual similarity report; matching database sources cited. Offsets internal. | Online visual report and API webhook response. Offsets internal. | **Cryptographic Byte-Offset Provenance:** Every finding specifies `sourceStart`, `sourceEnd`, and exact canonical slice with reproducible FNV/SHA hash. |
| **Academic Database Scope** | Comprehensive proprietary student paper repository, licensed Crossref, publisher journals. | Internet crawling, licensed journal repositories, Open Access aggregations. | **Federated Open Academic Infrastructure:** Live zero-storage federation across OpenAlex (250M+ works), Crossref, CORE, Unpaywall, and Google Books. |
| **Privacy & Storage Invariant** | Retains student submissions in institutional repository by default unless opt-out negotiated. | Stores submissions in cloud database unless specific privacy tier selected. | **Zero-Storage Privacy by Design:** Student text is analyzed in-memory; raw text is never retained without explicit cryptographic escrow. |
| **Receipts & Verification Proof** | Digital receipt containing submission ID, author, date, and page count. | Report download PDF / API record ID. | **Cryptographic QR Proof Receipt:** Tamper-evident receipt with canonical text hash, deterministic score fingerprint, and public resolution URL. |

---

## 2. Per-Capability Matrix & Certification Status

| Capability | Turnitin Public Claim | Copyleaks Public Claim | Gradifi Implementation | Gradifi Certification Status |
| :--- | :--- | :--- | :--- | :--- |
| **1. Multi-Format Extraction** | Supports PDF, Word, PowerPoint, RTF, HTML, TXT, ODT. | Supports PDF, Word, PPTX, TXT, HTML, ODT, EPUB. | 17-format universal ingestion (`universalIngestionService.ts`). | **G1 DIAGNOSED / IN REPAIR** (DOCX run-boundary fragmentation isolated; modern extractor certified in isolation). |
| **2. Exact Phrase Detection** | Highlights verbatim phrase matches across source database. | Highlights identical textual sequences. | `calculateExactPhraseMatch` + `EXACT_PHRASE` classification. | **G2 DIAGNOSED / IN REPAIR** (Requires minimum token floor to eliminate 2-character false positives). |
| **3. Paraphrase / N-Gram Overlap** | Flags paraphrased sentences and structural rewrites. | Multi-language paraphrase and structural detection. | Sliding window N-Gram overlap ($N=3, 5, 7$) with mathematical scoring. | **G2 FUNCTIONAL** (Algebraic scoring verified; finding offset containment certified). |
| **4. AI Advisory & Explanations** | Proprietary AI detection score (separate AI writing indicator). | Proprietary AI content detector (percentage AI written). | Non-authoritative AI advisory tier (Gemini, Nemotron) governed by Constitutional containment. | **G4 CERTIFIED / GOVERNED** (Law 10 degradation tested; fail-closed offline invariant proven). |
| **5. Independent Verification** | Institutional instructor login required to access full match source report. | Account / API token required to verify reports. | **Public Verification Firewall:** Anyone with the QR code or verification ID can verify receipt validity and authenticity. | **CERTIFIED** (`publicVerificationService.ts` presentation firewall certified). |
| **6. Reproducibility Guarantee** | Undisclosed algorithms; proprietary model updates may alter historic scores. | Cloud model updates may shift similarity scores over time. | **Strict HOEOS Invariant:** Given identical input text and corpus, engine yields identical finding IDs, scores, and hashes indefinitely. | **G0/G2 PENDING FINAL SEAL**. |

---

## 3. Citations & Public Claim Sources
1. **Turnitin:**
   - *Turnitin Similarity Report Guide & Technical Specifications* (Turnitin LLC Public Knowledge Base).
   - *Understanding the Turnitin Similarity Score and Match Matrix* (Public Documentation, 2024–2026).
2. **Copyleaks:**
   - *Copyleaks Plagiarism Detection API Documentation & Architecture Overview* (Copyleaks Technologies Inc. Public Developer Portal).
   - *AI Detection and Text Comparison Methodology Whitepaper* (Public Documentation, 2024–2026).
3. **Gradifi:**
   - Repository source code: `C:\Projects\Gradifi`.
   - Architectural standards: `evidence/phase1/phase1_corrected_certification_2026-10-06.txt`, `evidence/phase3/g5m03_spec.txt`.
