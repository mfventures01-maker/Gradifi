# G2/G5 Deterministic Verification Contract: Layer 2 Commercial Gate (`L2-CG-01`)

**Document ID:** `evidence/layer2/authority-contract.md`  
**JSON Contract Path:** `evidence/layer2/authority-contract.json`  
**JSON Contract SHA-256:** `e4bfd477bfdda5b0d223ebfe56cab1081c828cbc005a8384ca33f0873844d966`  
**Governing Standard:** HOEOS v2 (Articles 1–6), G2/G5 Authority Contract  
**Production Status:** HARD HOLD  
**Certification Mode:** Forensic Baseline → Ground-Truth Certification → Evidence-Based Verdict  

---

## 1. Executive Summary & Engine Identity
This contract establishes the formal machine-readable specification and invariants governing Gradifi's deterministic detection accuracy certification for **Layer 2 Commercial Gate (`L2-CG-01`)**.

- **Authoritative Engine ID:** `GRADIFI-DETERMINISTIC-SIMILARITY-ENGINE`
- **Engine Version:** `SIM-V1`
- **Normalization Version:** `NORM-V1`
- **Policy Version:** `2026.09-academic-evidence`
- **Plagiarism Policy Version:** `G3-POLICY-v1`
- **Source Paths:**
  - `src/services/verify/deterministicEngine.ts`
  - `src/services/verify/documentNormalizer.ts`
  - `src/services/verify/verifyCoreService.ts`
  - `src/services/verify/plagiarismPolicy.ts`

---

## 2. Invariants & Authority Boundaries
1. **Zero AI Ingress on Authority:** AI services (Gemini, Gemma, Nemotron) are strictly advisory. The authoritative similarity engine `analyzeDocumentEvidence()` and `evaluateDocumentSimilarityInternal()` make 0 AI calls.
2. **Deterministic Score Integrity:** AI responses, timeouts, malformed payloads, or non-deterministic advice CANNOT alter `overallSimilarity`, `uniqueMatchedCoverage`, `highestSourceMatch`, or deterministic findings.
3. **Pure Reconstructed Coordinates:** Offsets `startChar` and `endChar` are strictly 0-based character indices into the canonical raw text such that `rawText.slice(startChar, endChar) === segmentText`.
4. **Display Fidelity:** The UI (`src/pages/verify/GradifiVerifyDemoPage.tsx`) consumes the exact verification result; it does not fabricate scores or synthetic findings.

---

## 3. Mathematical Score Semantics
- **Unique Matched Coverage:**
  $$\text{uniqueMatchedCoverage} = \frac{|\bigcup \text{MatchedTokenIndices}|}{\text{TotalDocumentTokens}} \times 100$$
  Formula: `totalDocumentTokens > 0 ? Math.min(100, Math.round((totalUniqueMatchedTokens / totalDocumentTokens) * 1000) / 10) : 0`
- **Overall Similarity:**
  $$\text{overallSimilarity} = \text{uniqueMatchedCoverage}$$
- **Highest Source Match:**
  $$\text{highestSourceMatch} = \max_{s \in \text{Sources}} (\text{aggregateSourceScore}_s)$$

---

## 4. Normalization Pipeline (`NORM-V1`)
1. Canonical Unicode normalization (NFKD).
2. Diacritic stripping (`replace(/[\u0300-\u036f]/g, '')`).
3. Lowercasing.
4. Non-alphanumeric punctuation removal (`replace(/[^\w\s]/g, ' ')`).
5. Whitespace collapsing and trimming (`replace(/\s+/g, ' ').trim()`).

---

## 5. Governance and Misconduct Thresholds
- A similarity score represents objective lexical and syntactic overlap. It DOES NOT constitute an automated finding of plagiarism or academic misconduct without institutional review.
- Commercial acceptance thresholds require explicit owner sign-off. In the absence of an approved threshold record, the gate verdict must fail closed to `BLOCKED: OWNER THRESHOLD DECISION REQUIRED`.

