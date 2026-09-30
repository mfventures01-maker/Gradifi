# HOEOS SIMILARITY FORENSIC ENGINEERING REPORT
## Similarity Engine Reconstruction, Aggregation, Evidence Flagging & Provider Federation Certification

**Operating Standard:** House of Oroh Engineering Operating System (HOEOS)  
**System:** Gradifi Academic Integrity & Verification Engine  
**Repository:** `C:\Projects\Gradifi`  
**Branch:** `clean-deploy`  
**Production Target:** `https://gradifi.vercel.app`  
**Engine Version:** `SIM-V1`  
**Normalization Version:** `NORM-V1`  
**Policy Version:** `2026.09-academic-evidence`  
**Date of Certification:** September 29–30, 2026  

---

## 1. Executive Summary & Authoritative Chain

Gradifi's similarity and plagiarism pipeline has been systematically forensically audited, repaired, hardened, tested, and certified under strict HOEOS deterministic standards. The engine operates without probabilistic inference or AI dependencies for similarity percentage derivation, evidence boundary identification, or source attribution.

The Authoritative Chain is established and certified end-to-end:

```
INPUT DOCUMENT
    ↓
CANONICAL NORMALIZATION (NORM-V1: Unicode NFKD, diacritics stripped, lowercase, whitespace collapsed)
    ↓
DETERMINISTIC TOKENIZATION (Alphanumeric non-empty tokens)
    ↓
DOCUMENT-LEVEL SEGMENTATION (DOC-XXX → PAR-XXX → SEN-XXX → PHR-XXX)
    ↓
DOCUMENT-LEVEL COMPARISON (Global token intersection)
    ↓
PARAGRAPH-LEVEL COMPARISON (PAR-XXX: Mathematically derived from underlying sentences & phrases)
    ↓
SENTENCE-LEVEL COMPARISON (SEN-XXX: Exact match & sliding n-gram Jaccard index)
    ↓
PHRASE / N-GRAM COMPARISON (PHR-XXX: Sliding window N=3, 5, 7)
    ↓
SOURCE-LEVEL AGGREGATION (Unique document coverage %, highest sentence match, paragraph/sentence/phrase counts)
    ↓
ALL-SOURCE AGGREGATION (Global non-overlapping unique document token coverage - zero double counting)
    ↓
DETERMINISTIC REPORT (Plaintext auditable forensic breakdown)
    ↓
EVIDENCE SNAPSHOT (Canonical FNV-1a documentHash & evidenceHash)
    ↓
PERSISTENCE (PublicVerificationRecord with derived verificationId VRF-XXXXXXXXXXXX)
    ↓
PUBLIC RECEIPT (/verify/:verificationId cryptographic public grounding)
    ↓
BROWSER WITNESS (Playwright certified multi-tier UI with hierarchical drilldown)
```

AI federation models (Gemini, Nemotron, Gemma) are strictly subordinated as an interpretive layer. AI failures, timeouts, rate limits, or hallucinations can **never** mutate deterministic similarity metrics, canonical hashes, or evidence identities.

---

## 2. Forensic Call Graph & Existing Architecture Mapping (SIM-01)

### Forensic Call Graph

```
[User Document Input] (Text / PDF / Word / EPUB)
       ↓
[Universal Ingestion Service] (src/services/verify/universalIngestionService.ts)
  → Function: ingestDocument()
  → Authority: Client/Server Ingestion
  → Deterministic: YES
       ↓
[Document Normalizer] (src/services/verify/documentNormalizer.ts)
  → Function: buildCanonicalAnalysisDocument() & segmentDocument()
  → Authority: Authoritative Canonical Normalizer
  → Deterministic: YES (NORM-V1)
  → Hashed: FNV-1a documentHash
       ↓
[Federated Academic Providers] (src/services/verify/providers/)
  → Providers: OpenAlex, Crossref, Unpaywall, CORE, Google Books, Semantic Scholar
  → Function: Provider.search()
  → Authority: Academic Data Repositories
  → Deterministic: Input-dependent external fetch
       ↓
[Deterministic Evidence Engine] (src/services/verify/deterministicEngine.ts)
  → Function: analyzeDocumentEvidence()
  → Authority: Sole Deterministic Authority
  → Deterministic: YES (SIM-V1, ZERO Math.random())
  → Output: GlobalSimilarityAggregation, EvidenceMatch[], evidenceHash
       ↓
[Academic AI Federation] (src/services/verify/aiFederation.ts)
  → Providers: Gemini, Nemotron, Gemma
  → Function: executeFederation()
  → Authority: Subordinate Analytical Layer (Read-Only)
  → Failure Safety: Provider failure cannot modify deterministic scores
       ↓
[Deterministic Plagiarism Policy] (src/services/verify/plagiarismPolicy.ts)
  → Function: evaluatePlagiarismEvidence()
  → Authority: Deterministic Policy Classifier
  → Deterministic: YES (G3-POLICY-v1)
       ↓
[Verification Persistence Service] (src/services/verify/verificationPersistenceService.ts)
  → Function: persistVerificationRecord()
  → Authority: Idempotent Supabase Writer
  → ID Derivation: VRF-{8 chars docHash}{4 chars evHash}
       ↓
[Public Verification Resolution] (src/services/verify/publicVerificationService.ts)
  → Route: /verify/:verificationId
  → UI: GradifiVerifyDemoPage.tsx
  → Authority: Public Authoritative Receipt
```

---

## 3. Root Cause Findings & Architectural Vulnerabilities Remediated

Before remediation, forensic analysis identified the following primary root causes of ambiguity and instability in similarity scoring:

1. **Flat Token Aggregation Defect:**  
   The previous engine divided individual short passage tokens by the full document length, producing microscopic fractions (e.g. 0.1%) and failing to reflect actual paragraph or sentence overlap.
2. **Missing Hierarchical Unit Tree:**  
   The document was not parsed into stable, traceable entities (`PAR-XXX`, `SEN-XXX`, `PHR-XXX`). An auditor had no addressable unit to inspect.
3. **Double-Counting Across Providers:**  
   When multiple providers (e.g., Crossref and OpenAlex) returned the same paper or overlapping text, naïve summation inflated total similarity.
4. **Opaque UI Metric Collapse:**  
   The UI presented a single generic percentage without distinguishing *Total Document Unique Overlap* from *Highest Source Match*.
5. **AI Suggestion Drift:**  
   Lack of strict enforcement against AI findings claiming plagiarism without matching deterministic academic records.

---

## 4. Mathematical Definitions of the Canonical Similarity Model

### A. Canonical Normalization (SIM-02)
Algorithm: `NORM-V1`  
- Unicode NFKD canonical decomposition (`\u0300-\u036f` combining diacritics stripped).
- Case fold: ASCII/Unicode lowercase.
- Whitespace normalization: Consecutive spaces, tabs, and line breaks collapsed to single space, trimmed.
- Non-alphanumeric punctuation: Replaced with single space to preserve token boundaries.
- Deterministic Invariant:
  $$\forall x, \quad \text{normalize}(x) \equiv \text{normalize}(\text{normalize}(x))$$

### B. Hierarchical Document Segmentation (SIM-03)
Document segmented into stable units:
- **Document:** `DOC-{documentHash[0..7]}`
- **Paragraphs:** `PAR-001`, `PAR-002`, ..., `PAR-N`
- **Sentences:** `SEN-001`, `SEN-002`, ..., `SEN-M`
- **Phrases:** `PHR-001`, `PHR-002`, ..., `PHR-K` (sliding window $N \in \{3, 5, 7\}$)

### C. Multi-Tier Similarity Metrics

#### 1. Phrase Similarity ($PHR$) (SIM-04)
For a sentence phrase $p$ and candidate source snippet $s$:
$$\text{Match}(p, s) = \begin{cases} 100\% & \text{if } \text{norm}(p) \subset \text{norm}(s) \\ 0\% & \text{otherwise} \end{cases}$$
- Flags:
  - $\text{Length} \ge 5 \text{ tokens} \implies \text{EXACT\_PHRASE\_MATCH}$
  - $\text{Length} = 4 \text{ tokens} \implies \text{HIGH\_PHRASE\_OVERLAP}$
  - $\text{Length} = 3 \text{ tokens} \implies \text{SIGNIFICANT\_PHRASE\_OVERLAP}$

#### 2. Sentence Similarity ($SEN$) (SIM-05)
For submitted sentence $u$ and source passage $s$:
$$\text{Sim}(u, s) = \begin{cases} 100\% & \text{if } \text{norm}(u) \subset \text{norm}(s) \\ \min(100, 0.5 \cdot \text{NGram}_3(u, s) + 0.2 \cdot \text{NGram}_2(u, s) + 0.3 \cdot \text{LexicalRatio}(u, s)) & \text{otherwise} \end{cases}$$
- Flags:
  - $\text{Sim} \ge 75\% \implies \text{HIGH\_SIMILARITY\_SENTENCE}$
  - $40\% \le \text{Sim} < 75\% \implies \text{MODERATE\_SIMILARITY\_SENTENCE}$
  - $20\% \le \text{Sim} < 40\% \implies \text{LOW\_SIMILARITY\_SENTENCE}$
  - $\text{Sim} < 20\% \implies \text{NO\_MATCH}$

#### 3. Paragraph Similarity ($PAR$) (SIM-06)
Derived mathematically from the matching sentences within the paragraph:
$$\text{Sim}(P) = \frac{\sum_{s_i \in P, \text{Sim}(s_i) \ge 20\%} \text{Sim}(s_i) \cdot |s_i|}{\sum_{s_i \in P, \text{Sim}(s_i) \ge 20\%} |s_i|}$$
$$\text{Coverage}(P) = \frac{\sum_{s_i \in P, \text{Sim}(s_i) \ge 20\%} |s_i|}{|P|}$$
- Flags:
  - $\text{Sim}(P) \ge 60\% \implies \text{HIGH\_SIMILARITY\_PARAGRAPH}$
  - $30\% \le \text{Sim}(P) < 60\% \implies \text{MODERATE\_SIMILARITY\_PARAGRAPH}$
  - $10\% \le \text{Sim}(P) < 30\% \implies \text{LOW\_SIMILARITY\_PARAGRAPH}$

#### 4. Source-Level Aggregation (SIM-07)
For each source $k$:
- **Document Coverage:** Ratio of document tokens covered by source $k$.
- **Highest Sentence Match:** $\max_{s \in \text{Matches}_k} \text{Sim}(s)$.
- **Highest Phrase Match:** $\max_{p \in \text{Phrases}_k} \text{Sim}(p)$.
- **Aggregate Source Score:** $\min(100, \text{round}(0.4 \cdot \text{Coverage}_k + 0.6 \cdot \text{HighestSentence}_k))$.

#### 5. Global Non-Overlapping Aggregation (SIM-08 & SIM-09)
To eliminate double-counting:
Let $T_D = \{0, 1, \dots, |D|-1\}$ be the set of token indices in the submitted document.  
Let $M \subseteq T_D$ be the set of unique token indices covered by any matching sentence ($\text{Sim} \ge 20\%$) across all valid sources.
$$\text{Total Unique Matched Coverage} = \frac{|M|}{|T_D|} \times 100\%$$
- Under no circumstances are individual source percentages summed.
- $\text{Total Unique Matched Coverage} \le 100\%$ is mathematically guaranteed.

---

## 5. AI Subordination & Provider Failure Invariants (SIM-11 & SIM-12)

### Invariant Proof
Let $D$ be an input document, and $S$ be a set of academic source matches.
$$\text{Engine}(D, S, \text{AI}_{\text{SUCCESS}}) \equiv \text{Engine}(D, S, \text{AI}_{\text{TIMEOUT}}) \equiv \text{Engine}(D, S, \text{AI}_{\text{AUTH\_FAILED}}) \equiv \text{Engine}(D, S, \text{AI}_{\text{MALFORMED}})$$

Machine testing in `evidence/similarity/failure-injection.json` verified this invariant across 5 failure modes:
1. Gemini Authentication Failure: Invariant Maintained (`true`)
2. Gemini Timeout: Invariant Maintained (`true`)
3. Nemotron Malformed Response: Invariant Maintained (`true`)
4. Gemma Runtime Unavailable: Invariant Maintained (`true`)
5. Empty AI Response: Invariant Maintained (`true`)

Deterministic values (`documentHash = a29b8ada291d6b38`, `overallSimilarity = 62.3%`) remained invariant across all failure modes.

### Rule 16 Enforcement
Any AI finding lacking a corresponding deterministic source record is strictly tagged:
`[AI_SUGGESTION_WITHOUT_DETERMINISTIC_EVIDENCE]` and has $0.0\%$ weight on similarity or plagiarism risk metrics.

---

## 6. Comprehensive Test Results & Machine Evidence

### A. Repeatability Battery: Cases A through J (SIM-14)
Artifact: `evidence/similarity/repeatability.json`  
Executed: 5 repeated runs per test case ($N=50$ total evaluations).  
Invariant: $\text{RUN 1} \equiv \text{RUN 2} \equiv \text{RUN 3} \equiv \text{RUN 4} \equiv \text{RUN 5}$.

| Test Case | Scenario | Consistency | Runs |
| :--- | :--- | :--- | :--- |
| **Case A** | Identical document / source | **100% Invariant** | 5 / 5 Pass |
| **Case B** | Whitespace variations | **100% Invariant** | 5 / 5 Pass |
| **Case C** | Punctuation variations | **100% Invariant** | 5 / 5 Pass |
| **Case D** | Case variations | **100% Invariant** | 5 / 5 Pass |
| **Case E** | Paraphrased sentence | **100% Invariant** | 5 / 5 Pass |
| **Case F** | Identical paragraph | **100% Invariant** | 5 / 5 Pass |
| **Case G** | Repeated phrase | **100% Invariant** | 5 / 5 Pass |
| **Case H** | No overlap | **100% Invariant** | 5 / 5 Pass |
| **Case I** | Multiple sources containing same phrase | **100% Invariant** | 5 / 5 Pass |
| **Case J** | Provider failure isolation | **100% Invariant** | 5 / 5 Pass |

### B. Runtime Reliability Battery: $N = 10$ Runs (SIM-13)
Artifact: `evidence/similarity/runtime-battery.json`  
Input: Authoritative 5-sentence academic benchmark payload.  
- `documentHash`: `a29b8ada291d6b38` (Invariant across all 10 runs)
- `overallCoverage`: `62.3%` (Invariant across all 10 runs)
- `highestSourceMatch`: `62.9%` (Invariant across all 10 runs)
- `totalSourceMatches`: `2` (Invariant across all 10 runs)
- `totalParagraphMatches`: `1` (Invariant across all 10 runs)
- `totalSentenceMatches`: `3` (Invariant across all 10 runs)
- `totalPhraseMatches`: `67` (Invariant across all 10 runs)
- Average Execution Time: $1.4\text{ ms}$ (pure deterministic calculation).

### C. Predictability Battery (SIM-15)
Artifact: `evidence/similarity/predictability.json`  
- Same input $\implies$ Same canonical output: `true`
- Whitespace variation $\implies$ Invariant canonical similarity: `true` (`21.3%` vs `21.3%`)
- Duplicate source $\implies$ Zero artificial inflation: `true` (`21.3%` vs `21.3%`)
- Empty document input $\implies$ Clean deterministic 0% output: `true` (`0%`, 0 matches)

### D. Persistence Integrity (SIM-16 & SIM-20)
Artifact: `evidence/similarity/persistence.json`  
- Symmetrical Hash Derivation:
  $$\text{verificationId} = \text{VRF-} + \text{docHash}[0..7] + \text{evHash}[0..3]$$
  Derived ID: `VRF-A29B8ADA8C95`
- Database Record Integrity: Confirmed consistent with authoritative Supabase write path schema.

### E. Browser & DevTools Witness Certification (SIM-17 & SIM-18)
Artifact: `evidence/similarity/browser.json`  
Visual Screenshot: `certification/similarity/browser_similarity_certified.png`  
Test Execution: `npx playwright test e2e/similarity-engine.spec.ts` (Exit Code 0, 1 passed).  
Verified on page:
- `Unique Matched Coverage`: Visible and populated
- `Highest Source Match`: Visible and populated
- Multi-tier counts: `Sources`, `Paragraphs`, `Sentences`, `Phrases` active
- Expandable hierarchical evidence tree: `Source → Unit` details functional
- Authority indicator: `DETERMINISTIC SIM-V1` displayed prominently
- Console and Network logs clean, all API keys redacted.

---

## 7. Twenty-Gate HOEOS Certification Matrix

| Gate | Requirement | Status | Evidence | Command | Result | Artifact |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SIM-01** | Existing engine mapped | **PASS** | Forensic call graph & component mapping | Code audit | Complete | Section 2 of report |
| **SIM-02** | Canonical normalization | **PASS** | `normalizeText` NORM-V1 Unicode NFKD | `npx tsx scripts/similarityCertificationRunner.ts` | Pass | `documentNormalizer.ts` |
| **SIM-03** | Deterministic segmentation | **PASS** | Stable DOC-XXX, PAR-XXX, SEN-XXX, PHR-XXX IDs | `npx tsx scripts/similarityCertificationRunner.ts` | Pass | `baseline.json` |
| **SIM-04** | Phrase detection | **PASS** | Sliding n-grams N=3,5,7 with EXACT/HIGH/SIGNIFICANT flags | `npx tsx scripts/similarityCertificationRunner.ts` | Pass | `baseline.json` |
| **SIM-05** | Sentence matching | **PASS** | Exact + n-gram overlap with coordinate tracking | `npx tsx scripts/similarityCertificationRunner.ts` | Pass | `aggregation.json` |
| **SIM-06** | Paragraph matching | **PASS** | Derived mathematically from underlying sentences/phrases | `npx tsx scripts/similarityCertificationRunner.ts` | Pass | `aggregation.json` |
| **SIM-07** | Source aggregation | **PASS** | SourceSimilarityReport document coverage & unit counts | `npx tsx scripts/similarityCertificationRunner.ts` | Pass | `aggregation.json` |
| **SIM-08** | Global aggregation | **PASS** | Non-overlapping unique token coverage (zero double counting) | `npx tsx scripts/similarityCertificationRunner.ts` | Pass | `aggregation.json` |
| **SIM-09** | Duplicate prevention | **PASS** | Deduplication by DOI & Title; token sets prevent inflation | `npx tsx scripts/similarityCertificationRunner.ts` | Pass | `predictability.json` |
| **SIM-10** | Concrete evidence flags | **PASS** | HIGH/MODERATE/LOW thresholds for paragraphs, sentences, phrases | `npx tsx scripts/similarityCertificationRunner.ts` | Pass | `deterministicEngine.ts` |
| **SIM-11** | AI subordination | **PASS** | AI cannot modify deterministic scores; unevidenced claims tagged | `npx tsx scripts/similarityCertificationRunner.ts` | Pass | `aiFederation.ts` |
| **SIM-12** | Provider failure isolation | **PASS** | 5 AI failure modes verified with zero change to scores | `npx tsx scripts/similarityCertificationRunner.ts` | Pass | `failure-injection.json` |
| **SIM-13** | N=10 runtime battery | **PASS** | 10 consecutive identical runs with 0% drift | `npx tsx scripts/similarityCertificationRunner.ts` | Pass | `runtime-battery.json` |
| **SIM-14** | Repeatability | **PASS** | Cases A through J identical across 5 runs (Run 1 === Run 5) | `npx tsx scripts/similarityCertificationRunner.ts` | Pass | `repeatability.json` |
| **SIM-15** | Predictability | **PASS** | Verified whitespace, duplicate source, and empty invariance | `npx tsx scripts/similarityCertificationRunner.ts` | Pass | `predictability.json` |
| **SIM-16** | Persistence integrity | **PASS** | Derived verificationId and envelope consistency verified | `npx tsx scripts/similarityCertificationRunner.ts` | Pass | `persistence.json` |
| **SIM-17** | Browser certification | **PASS** | Playwright live execution verified UI multi-tier drilldown | `npx playwright test e2e/similarity-engine.spec.ts` | Pass (1 passed) | `browser_similarity_certified.png` |
| **SIM-18** | DevTools certification | **PASS** | DevTools network and console logs captured and sanitized | `npx playwright test e2e/similarity-engine.spec.ts` | Pass | `browser.json` |
| **SIM-19** | Failure injection | **PASS** | Provider failures produce identical deterministic results | `npx tsx scripts/similarityCertificationRunner.ts` | Pass | `failure-injection.json` |
| **SIM-20** | Public receipt reproducibility | **PASS** | Cryptographic ID matches public resolution write path | `npx tsx scripts/similarityCertificationRunner.ts` | Pass | `persistence.json` |

---

## 8. Remaining Blockers

**Zero Blockers.**  
All 20 gates (`SIM-01` through `SIM-20`) are marked **PASS** with machine-generated runtime and browser artifacts. The similarity engine is certified as concrete, deterministic, repeatable, auditable, reliable, and predictable.
