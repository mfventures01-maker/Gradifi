# HOEOS v2 GATE G4: REPRESENTATIVE CORPUS METHODOLOGY AND RESULTS
**Workstream:** Layer 2 Commercial Gate (`L2-CG-01`)  
**Authority:** G2/G5 Deterministic Verification Contract & Owner Amendment `20261029T072434Z`  
**Execution Timestamp:** 2026-10-29T14:15:01Z  
**Engine Version:** `SIM-V1`  
**Document Normalization Version:** `NORM-V1`  
**Policy Version:** `2026.09-academic-evidence`  
**Corpus Version:** `2.0.0-NIGERIAN-ACADEMIC`  
**Gate G4 Verdict:** `PASS`

---

## 1. Executive Summary

Gate G4 establishes, through machine execution against an independently constructed, multi-disciplinary representative academic corpus, whether the repaired deterministic similarity engine (`SIM-V1` / `NORM-V1`) performs reliably beyond the initial hand-crafted 25-fixture suite.

The evaluation corpus comprises **34 versioned, cryptographically hashed fixtures** specifically reflecting Nigerian higher education across 8 primary academic faculties. The corpus is partitioned into a **Held-Out Evaluation Split (25 fixtures)** and a **Development Split (9 fixtures)**.

All pre-registered acceptance criteria met or exceeded the approved thresholds:
- **Document Precision:** **100.0%** (Approved Threshold: $\ge 95.0\%$) — `PASS`
- **Document Recall:** **100.0%** (Approved Threshold: $\ge 90.0\%$) — `PASS`
- **False Positive Rate (FPR):** **0.0%** (Approved Threshold: $\le 5.0\%$) — `PASS`
- **Sentence Span Accuracy:** **100.0%** (Approved Threshold: $\ge 95.0\%$) — `PASS`
- **Phrase Span Accuracy:** **100.0%** — `PASS`
- **Source Attribution Accuracy:** **100.0%** — `PASS`
- **3-Pass Repeatability:** **100.0%** bit-for-bit invariance — `PASS`
- **AI Advisory Isolation:** **1.00** (Zero leakage to authoritative scoring) — `PASS`

---

## 2. Corpus Design and Provenance

### 2.1 Target Population & Academic Disciplines
The corpus targets Nigerian universities (Federal, State, Private) and Polytechnics, addressing common submission types across eight faculties:

| Faculty / Discipline | Key Curricular Themes Covered in Corpus | Total Fixtures |
| :--- | :--- | :---: |
| **Law** | Petroleum Industry Act (PIA 2021), Constitutional Supremacy, CAMA 2020, Evidence Law, Case Law (Fawehinmi v Akilu) | 5 |
| **Medicine & Pharmacy** | Sickle Cell Anemia / Hydroxyurea, Lassa Mammarenavirus, Maternal Mortality in Kano, Antimalarial ACT Efficacy, Meningococcal Meningitis | 5 |
| **Agriculture & Food Science**| Cassava Cyanogenic Glucoside Detoxification, Yam Tuber Rot, Intensive Catfish Aquaculture, Ultisol Soil Fertility | 4 |
| **Economics & Business** | CBN Payment Service Banks (PSBs), Currency Devaluation & Cost-Push Inflation, NBS Informal Economy Statistics, Sovereign Debt | 6 |
| **Computer Science** | Offline-First Edge Architectures, Blockchain Consensus & Smart Contracts, African NLP (Igbo/Yoruba Morphology) | 3 |
| **Humanities & Literature** | Chinua Achebe (*Things Fall Apart*), Wole Soyinka, Flora Nwapa, Niyi Osundare Eco-criticism, Benin 1897 Expedition | 4 |
| **Engineering** | Black Cotton Soil Stabilization, Highway Distress (Borno State), 330kV National Grid Stability, Solar PV MPPT Mini-Grids | 3 |
| **Education & Pedagogy** | Universal Basic Education (UBE Act 2004), Teacher Professional Development, NUC BMAS Accreditation Norms, STEM Pedagogy | 4 |
| **Total** | | **34** |

### 2.2 Text Variation & Reuse Typology
To ensure rigorous validation against real-world plagiarism modes in West African institutions, the corpus includes:
1. **Verbatim Single/Multi-Sentence Duplication:** Exact clones of published papers and statutory standards.
2. **Lightly Modified Copying:** Insertions of adjectives, minor word substitutions, and local phrasing while retaining substantial n-gram structures.
3. **Partial Reuse & Embedded Borrowing:** Legitimate original framing paragraphs embedding plagiarized core sections.
4. **Multi-Source Composition:** Splicing sentences from multiple independent academic publications into a single student submission.
5. **Clean Negative Controls:** Original student writing on specialized academic topics with zero source overlap.
6. **Legitimate Paraphrases:** Independent expression of shared scientific concepts with completely original vocabulary.
7. **Statutory & Standard Academic Citations:** Shared statutory citations and technical jargon (e.g. "Companies and Allied Matters Act 2020", "cation exchange capacity") ensuring zero false-positive triggering.

### 2.3 Split Methodology & Manifest Integrity
- **Held-Out Evaluation Split:** 25 fixtures (73.5%) — strictly reserved for final blind validation.
- **Development Split:** 9 fixtures (26.5%) — used during regression baseline verification.
- **Corpus Manifest:** `evidence/layer2/representative-corpus-manifest.json`
- **Aggregate Corpus SHA-256:** `1de09b1d14929ca26a8ba00cbc92a9366ca010603edaa13d0463b0cc5b9815ea`
- **Mirror Location:** `C:\Projects\Gradifi-evidence\layer2\representative-corpus-manifest.json`

---

## 3. Pre-Registered Evaluation Metrics and Results

### 3.1 Primary Document-Level Metrics

$$\text{Precision} = \frac{\text{TP}}{\text{TP} + \text{FP}} = \frac{17}{17 + 0} = 1.000\quad (100.0\%)$$

$$\text{Recall} = \frac{\text{TP}}{\text{TP} + \text{FN}} = \frac{17}{17 + 0} = 1.000\quad (100.0\%)$$

$$\text{False Positive Rate (FPR)} = \frac{\text{FP}}{\text{FP} + \text{TN}} = \frac{0}{0 + 17} = 0.000\quad (0.0\%)$$

$$\text{False Negative Rate (FNR)} = \frac{\text{FN}}{\text{TP} + \text{FN}} = \frac{0}{17 + 0} = 0.000\quad (0.0\%)$$

| Metric | Approved Threshold | Observed Actual | Margin | Status |
| :--- | :---: | :---: | :---: | :---: |
| **Precision** | $\ge 0.95$ | **1.00** (100.0%) | +5.0% | **PASS** |
| **Recall** | $\ge 0.90$ | **1.00** (100.0%) | +10.0% | **PASS** |
| **False Positive Rate** | $\le 0.05$ | **0.00** (0.0%) | -5.0% | **PASS** |
| **Sentence Span Accuracy** | $\ge 0.95$ | **1.00** (100.0%) | +5.0% | **PASS** |
| **AI Advisory Isolation** | $= 1.00$ | **1.00** (100.0%) | 0.0% | **PASS** |

### 3.2 Document-Level Confusion Matrix
```
                       Actual Condition
                   Plagiarized      Clean
Predicted  Match       17 (TP)       0 (FP)     Precision = 100.0%
           No Match     0 (FN)      17 (TN)     NPV       = 100.0%
                   Sensitivity=100%  Specificity=100%
```

### 3.3 Subgroup Performance: Held-Out Split vs Development Split
- **Held-Out Split (25 fixtures):**
  - True Positives: 12
  - False Positives: 0
  - True Negatives: 13
  - False Negatives: 0
  - **Held-Out Precision:** **100.0%**
  - **Held-Out Recall:** **100.0%**
  - **Held-Out FPR:** **0.0%**
- **Development Split (9 fixtures):**
  - True Positives: 5
  - False Positives: 0
  - True Negatives: 4
  - False Negatives: 0
  - **Development Precision:** **100.0%**
  - **Development Recall:** **100.0%**

---

## 4. Span Fidelity and Attribution Verification

| Fidelity Check | Evaluated | Correct | Accuracy | Status |
| :--- | :---: | :---: | :---: | :---: |
| **Sentence Spans Checked** | 22 | 22 | **100.0%** | **PASS** |
| **Sentence Span Mismatches** | 0 | 0 | **0.0%** | **PASS** |
| **Phrase Spans Checked** | 563 | 563 | **100.0%** | **PASS** |
| **Phrase Span Drifts** | 0 | 0 | **0.0%** | **PASS** |
| **Source Attribution Checks**| 17 | 17 | **100.0%** | **PASS** |

- **Exact Coordinate Slicing:** Every sentence `rawText.slice(startChar, endChar)` strictly matches `studentText`.
- **Zero Coordinate Drift:** Every phrase flag coordinate correctly aligns with the normalized phrase token span within raw student text.

---

## 5. Breakdown by Document Length and Discipline

| Dimension | Category | Fixtures | TP | FP | TN | FN | Precision | Recall |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Length** | Short (< 250 words) | 20 | 9 | 0 | 11 | 0 | 100.0% | 100.0% |
| | Medium (250-800 words) | 12 | 6 | 0 | 6 | 0 | 100.0% | 100.0% |
| | Long (> 800 words) | 2 | 2 | 0 | 0 | 0 | 100.0% | 100.0% |
| **Discipline** | Law | 5 | 2 | 0 | 3 | 0 | 100.0% | 100.0% |
| | Medicine & Pharmacy | 5 | 3 | 0 | 2 | 0 | 100.0% | 100.0% |
| | Agriculture & Food Science | 4 | 2 | 0 | 2 | 0 | 100.0% | 100.0% |
| | Economics & Business | 6 | 3 | 0 | 3 | 0 | 100.0% | 100.0% |
| | Computer Science | 3 | 1 | 0 | 2 | 0 | 100.0% | 100.0% |
| | Humanities & Literature | 4 | 2 | 0 | 2 | 0 | 100.0% | 100.0% |
| | Engineering | 3 | 2 | 0 | 1 | 0 | 100.0% | 100.0% |
| | Education & Pedagogy | 4 | 2 | 0 | 2 | 0 | 100.0% | 100.0% |

---

## 6. Repeatability and AI Isolation Invariants

1. **3-Pass Repeatability Verification:**
   All 34 fixtures were executed across 3 consecutive independent evaluation passes. Authoritative payloads (`documentHash`, `overallSimilarity`, `uniqueMatchedCoverage`, `highestSourceMatch`, `evidenceHash`, `sentenceFlags`, `phraseFlags`, `paragraphFlags`) exhibited **zero bitwise variance across all 3 runs (100.0% repeatability)**.
2. **AI Advisory Isolation Invariant:**
   The deterministic verification core operates completely decoupled from LLM/AI advisory generation. Mocking, removing, or corrupting AI advisory inputs produces identical deterministic similarity scores and identical evidence hashes. Advisory isolation is verified at **1.00**.

---

## 7. Gate G4 Certification Conclusion

Gate G4 has achieved **100% compliance** with all constitutional and contractual requirements:
- Repaired engine demonstrates **100% precision and 100% recall** on a 34-fixture Nigerian academic corpus.
- Zero false positives on negative controls, common legal titles, or scientific jargon.
- Exact sentence and phrase span fidelity maintained without coordinate drift.
- Bit-for-bit reproducible across repeated executions.

**Final Gate G4 Result:** `PASS`

