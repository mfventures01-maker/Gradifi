# Gate G2: Root-Cause Analysis and Repair Plan

**Document ID:** `G2-ROOT-CAUSE-AND-REPAIR-PLAN-20261029T083000Z`  
**Timestamp (UTC):** 2026-10-29T08:30:00Z  
**Governing Standard:** HOEOS v2 (Articles 1–6)  
**Project:** Gradifi  
**Workstream:** Layer 2 Commercial Gate (`L2-CG-01`)  
**Repository Path:** `C:\Projects\Gradifi`  
**Git Branch:** `clean-deploy`  
**HEAD Commit:** `2f5af78f77995f2a681b910b0665a671a2e33ff6`  
**Production Status:** **`HARD HOLD`**  
**Gate Verdict:** **`PASS`**  

---

## 1. Executive Summary & Defect Ledger

Forensic investigation into the three documented Layer 2 defects has isolated their exact causal mechanisms in the production verification path:

| Defect ID | Target Artifact | Symptom | Exact Failure Mechanism | Minimal Repair |
| :--- | :--- | :--- | :--- | :--- |
| **Defect A** | `deterministicEngine.ts` (line 529) | `L2-CAT-C-03` Document-level False Positive (100% score) | Gating sentence token coverage at `similarityPercentage >= 20` admitted `LOW_SIMILARITY_SENTENCE` (20–39.9%), causing a single sentence with 25.1% incidental overlap to trigger 100% document coverage. | Gate token coverage at `similarityPercentage >= 40` (requiring `MODERATE_SIMILARITY_SENTENCE` or higher). Preserves `ACCEPT_WHOLE_SENTENCE_COVERAGE`. |
| **Defect B** | `documentNormalizer.ts` (lines 118–180) | `L2-CAT-H-02` Sentence-span Offset Misalignment (3-char shift) | `match[0].trim()` stripped paragraph leading whitespace, but `pStart` was assigned `match.index` without adding the leading whitespace offset. | Account for paragraph leading whitespace: `pStart = match.index + (match[0].length - match[0].trimStart().length)`. |
| **Defect C** | `documentNormalizer.ts` (lines 190–215) | Phrase-span Coordinate Drift across hyphens and punctuation | Phrase coordinates were approximated by searching `phraseText` in normalized sentence text (`normSent`) and adding the offset directly to raw `sStart`. | Map each token to its exact raw character span in `sText`. Phrase start/end is `spans[i].start` and `spans[i + n - 1].end`. |

---

## 2. Defect A: `L2-CAT-C-03` Document-Level False Positive

### 2.1 Observed Behavior
- **Fixture:** `L2-CAT-C-03` (Paraphrase hybrid with short 3-gram anchor).
- **Student Text:** `"International bodies enforce economic sanctions to compel sovereign governments toward altering their disputed foreign policies."` (15 tokens, 1 sentence).
- **Source Text:** `"Economic sanctions impose targeted commercial restrictions designed to compel sovereign foreign governments to alter disputed geopolitical policies."`
- **Observed Result:** `overallSimilarity = 100.0%`, `uniqueMatchedCoverage = 100.0%`.
- **Classification Impact:** Because document-level plagiarism is evaluated at threshold $\ge 20.0\%$, the document was classified as plagiarized (`FP`), reducing Document Precision to 93.8% and inflating FPR to 10.0%.

### 2.2 Root Cause & Causal Path
In `src/services/verify/deterministicEngine.ts` (lines 529–541):
```typescript
// Track token coverage for this sentence if matched
if (sentenceMatch.similarityPercentage >= 20) {
  const sentTokens = tokenize(sentence.text);
  const docTokenOffset = tokenize(input.documentText.slice(0, sentence.startChar)).length;
  for (let i = 0; i < sentTokens.length; i++) {
    const tokenIdx = docTokenOffset + i;
    if (tokenIdx < docTokens.length) {
      sourceMatchedTokenIndices.add(tokenIdx);
      globalMatchedTokenIndices.add(tokenIdx);
    }
  }
}
```
1. In `evaluateSentenceMatch()`, a sentence with $20.0\% \le \text{score} < 40.0\%$ is flagged as `LOW_SIMILARITY_SENTENCE`. In C-03, 2-gram overlap and shared common terms resulted in a score of $25.1\%$.
2. The coverage accumulation condition `if (sentenceMatch.similarityPercentage >= 20)` treated this low incidental overlap as sufficient to add **100% of the sentence's tokens** to `globalMatchedTokenIndices`.
3. In a single-sentence document, adding all 15 tokens resulted in `totalUniqueMatchedTokens = 15 = totalDocumentTokens`, producing $100.0\%$ document coverage.

### 2.3 Proposed Minimal Repair
- In `deterministicEngine.ts`, update the coverage gate to require substantive similarity:
  `if (sentenceMatch.similarityPercentage >= 40)`
- Sentences with $20\% \le \text{score} < 40\%$ continue to be recorded as `LOW_SIMILARITY_SENTENCE` in `sentenceFlags` for informational inspection, but do not claim whole-sentence plagiarism coverage.
- Sentences with $\ge 40\%$ (`MODERATE_SIMILARITY_SENTENCE`, `HIGH_SIMILARITY_SENTENCE`, `exact_match`) retain full whole-sentence token coverage, strictly honoring the owner's `ACCEPT_WHOLE_SENTENCE_COVERAGE` policy.

---

## 3. Defect B: `L2-CAT-H-02` Passage-Span Offset Misalignment

### 3.1 Observed Behavior
- **Fixture:** `L2-CAT-H-02` (Adversarial whitespace and newline injection).
- **Student Text:** Starts with three leading spaces: `"   Mitochondrial    oxidative\n\n..."`.
- **Observed Result:** Sentence flag document location was `[0, 26]`, slicing `"   Mitochondrial    oxidat"` instead of `"Mitochondrial    oxidative"`.

### 3.2 Root Cause & Causal Path
In `src/services/verify/documentNormalizer.ts`:
```typescript
while ((match = paragraphRegex.exec(rawText)) !== null) {
  const pText = match[0].trim();
  if (!pText) continue;
  pIdx++;
  const pStart = match.index; // <-- BUG: ignores leading whitespace in match[0]!
```
1. `match[0]` matched `"   Mitochondrial    oxidative"`. `match.index` was 0.
2. `pText = match[0].trim()` stripped the 3 leading spaces.
3. Sentence segmentation was run on `protectedText = pText`. Sentence index in `protectedText` was 0.
4. `sStart = pStart + sMatch.index = 0 + 0 = 0`.
5. Because `pStart` did not account for the 3 stripped spaces, `sStart` pointed 3 characters too early in `rawText`.

### 3.3 Proposed Minimal Repair
Compute the leading whitespace of the matched paragraph:
```typescript
const pLeading = match[0].length - match[0].trimStart().length;
const pStart = match.index + pLeading;
const pEnd = pStart + pText.length;
```
Now `pStart` points directly to the first character of `pText` in `rawText`, guaranteeing exact coordinate alignment.

---

## 4. Defect C: Phrase-Span Coordinate Drift

### 4.1 Observed Behavior
In fixtures containing hyphens or punctuation (e.g. `L2-CAT-B-01` with `CRISPR-Cas9`, `L2-CAT-G-01`), phrase start and end character offsets in raw text drifted by 1 to 2 characters, resulting in sliced strings missing trailing characters (e.g. `"resolv"` instead of `"resolve"`).

### 4.2 Root Cause & Causal Path
In `documentNormalizer.ts` (lines 201–206):
```typescript
const normSent = normalizeText(sText);
const charIdx = normSent.indexOf(phraseText);
const startChar = charIdx !== -1 ? sStart + charIdx : sStart;
const endChar = startChar + phraseText.length;
```
1. `normSent` removes all punctuation, converts hyphens to spaces, and collapses whitespace.
2. `charIdx` in `normSent` diverges from character positions in `sText` whenever `sText` contains hyphens, commas, or uppercase letters.
3. `phraseText.length` is the length of the normalized token string, not the raw character substring length.

### 4.3 Proposed Minimal Repair
Implement a deterministic token-to-raw-span mapper `mapTokenSpans(sText, sTokens)`:
- Maps each token in `sTokens` to its exact `[start, end]` character range inside `sText`.
- For any n-gram phrase spanning tokens from index $i$ to $i + n - 1$:
  `phrase.startChar = sStart + tokenSpans[i].start`
  `phrase.endChar = sStart + tokenSpans[i + n - 1].end`
- Text slice invariant: `rawText.slice(phrase.startChar, phrase.endChar)` produces the exact verbatim raw text of the phrase.

---

## 5. Regression Test Specification & Verification Plan

1. **Targeted Fixture Tests:**
   - Verify `L2-CAT-C-03`: `overallSimilarity` changes from 100% to 0.0% (below 20% threshold $\rightarrow$ `TN`).
   - Verify `L2-CAT-H-02`: sentence slice is exactly `"Mitochondrial    oxidative"` (`PASS`).
   - Verify `L2-CAT-B-01`, `L2-CAT-G-01`, `L2-CAT-G-02`: phrase slice matches verbatim text (`PASS`).
2. **Whole Suite Re-Evaluation:**
   - Execute all 25 fixtures.
   - Assert: Total Passed = 25 / 25 (100.0%).
   - Assert: Document Precision = 100.0% ($\ge 95\%$), Recall = 100.0% ($\ge 90\%$), FPR = 0.0% ($\le 5\%$).
   - Assert: Sentence Span Accuracy = 100.0% ($\ge 95\%$).
3. **Historical Golden Regression Suite:**
   - Run `npx vitest run tests/deterministicSimilarityEvidence.test.ts` (all 10 tests must pass).
4. **Safety & Invariant Checks:**
   - AI isolation invariant preserved.
   - Repeatability across 3 passes verified.

---

## 6. Gate G2 Verdict

`PASS`. Root causes are fully diagnosed, minimal repairs are identified, affected interfaces are bounded, and regression criteria are established.

Authorization to proceed to **Gate G3 (Deterministic Engine Repair)** is granted.

