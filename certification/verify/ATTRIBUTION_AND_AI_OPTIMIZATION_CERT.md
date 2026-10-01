# HOEOS Certification Report: Similarity Attribution, Plagiarism Report & AI Provider Optimization

## 1. Executive Summary & Repository Metadata
- **Governing Standard**: House of Oroh Engineering Operating System (HOEOS)
- **Repository**: `C:\Projects\Gradifi`
- **Branch**: `clean-deploy`
- **Baseline Commit**: `f08db42`
- **Certification Commit SHA**: `e87610563f65ee11f5c5690dfcf96987a624cc18`
- **Production Target**: `https://gradifi.vercel.app`
- **Vercel Deployment ID**: `dpl_3GW6akzeEv2nwsHfNU6a9dMuC3CH`
- **Execution Timestamp**: `2026-10-01T12:40:00Z`
- **Certification Disposition**: **CERTIFIED**

---

## 2. Certification Gates & Machine-Readable Evidence

| Gate | Requirement | Evidence Path | Status |
|---|---|---|---|
| **G-A** | All six provider handlers validate `originalSnippet` (min 200 chars, abstract-only, sentence boundary truncation) & 120-char extractor guard | [`evidence/verify/provider-snippet-validation.txt`](file:///C:/Projects/Gradifi/evidence/verify/provider-snippet-validation.txt) | **PASS** |
| **G-B** | Orchestrator deduplicates matches on `(sourceId, matchedText[:80])` before deterministic engine scoring | [`evidence/verify/dedup-counts.json`](file:///C:/Projects/Gradifi/evidence/verify/dedup-counts.json) | **PASS** |
| **G-C** | Every `EvidenceMatch` carries `matchCharacter` from the four-state enum (`EXACT`, `NEAR_EXACT`, `STRUCTURAL`, `SEMANTIC`) | [`evidence/verify/match-classification.json`](file:///C:/Projects/Gradifi/evidence/verify/match-classification.json) | **PASS** |
| **G-D** | Nemotron retry budget capped under 20s (max 2 attempts, 8s timeout, zero raw 504s) | [`evidence/ai/nemotron-retry-budget.txt`](file:///C:/Projects/Gradifi/evidence/ai/nemotron-retry-budget.txt) | **PASS** |
| **G-E** | Gemini in-memory response cache accelerates identical requests to < 100ms server execution time | [`evidence/ai/gemini-cache.json`](file:///C:/Projects/Gradifi/evidence/ai/gemini-cache.json) | **PASS** |
| **G-F** | Client-side payload trimming guarantees requests to `/api/verify/gemini` and `/api/verify/nemotron` remain under 6 KB | [`evidence/ai/payload-sizes.json`](file:///C:/Projects/Gradifi/evidence/ai/payload-sizes.json) | **PASS** |

---

## 3. Before vs. After Defect Comparison

### Defect A — False-Positive Passage Attribution
- **Before**: Provider handlers (`semanticScholar`, `openAlex`, `unpaywall`, `crossref`, `core`, `googleBooks`) fell back to paper title or tiny fragments when an abstract was absent. `passageExtractor.extractStudentPassage` matched the title verbatim inside the student document's bibliography section or matched short citation tails (e.g., `"and Yusuf, A."`), falsely producing a 23.1% match on source `s2:fd5eff1105d2b95f44d7c95e5c59e07e10ab3630`.
- **After**: All 6 provider handlers enforce abstract-only / evidence-only text validation requiring a strict 200-character minimum (`rawSnippet.trim().length >= 200`), followed by sentence-boundary trimming after character 300. `passageExtractor` guards exact-substring shortcuts with `MIN_EXACT_SNIPPET_LENGTH = 120`. Candidates lacking real abstracts are skipped, completely eliminating bibliography false positives.

### Defect B — Duplicate Matched Passages
- **Before**: When multiple academic providers returned the same record (e.g. Semantic Scholar and Crossref) or when canonical and raw texts were processed, redundant match entries were created for the same passage span. The SEFAES verification produced 10 matched passages that reduced to 5 unique spans.
- **After**: `VerifyCoreService` deduplicates candidate matches using key `${m.sourceId}::${(m.matchedText || m.originalSnippet || '').slice(0, 80)}`. Redundant cross-provider entries are collapsed while preserving genuinely distinct passages from the same source.

### Defect C — Plagiarism Report Semantics & Evidence Characterization
- **Before**: Similarity percentages were conflated with plagiarism claims, producing inflated summary metrics without classifying the character of each textual overlap.
- **After**: Implemented `MatchCharacter` (`EXACT`, `NEAR_EXACT`, `STRUCTURAL`, `SEMANTIC`) and `AttributionStatus` in `types.ts`. `deterministicEngine.analyzeDocumentEvidence` computes `matchCharacter` mathematically for every candidate match using byte-for-byte token comparison and n-gram overlap indices. Every match carries its deterministic classification without mutating core similarity scores.

### Optimization D — AI Provider Timeout Amplification & Cold Starts
- **Before**: Nemotron handler attempted 3 retries with 45s timeouts (up to 138s theoretical worst case), causing Vercel's 30s gateway to cut with raw HTTP 504. Gemini experienced cold-start latencies up to 8.99s. Clients transmitted unbounded payloads (up to 55 KB).
- **After**: 
  - Reduced Nemotron retries to `MAX_ATTEMPTS = 2`, `BACKOFF_MS = [500]`, and `PER_ATTEMPT_TIMEOUT_MS = 8000`, keeping worst-case duration under 17 seconds (measured p50: 0.43s, max: 4.34s, zero 504s).
  - Added in-memory response caching (60s TTL, 20 max entries) for `EMPTY_RESULT` and `VERIFIED` on both Gemini and Nemotron handlers.
  - Implemented client-side payload trimming in `aiFederation.ts` (`matches.slice(0, 5)` and `documentText.slice(0, 3000)`), constraining request sizes to ~4.33 KB (36.8% - 88.3% reduction).

---

## 4. Non-Negotiable Invariants Verification

1. **Deterministic Engine Purity**:
   - `analyzeDocumentEvidence` and `evaluateDocumentSimilarity` remain 100% pure mathematical functions free of `Math.random()`, `Date.now()` in scoring calculations, and network I/O.
2. **AI Advisory Boundary**:
   - Gemini and Nemotron outputs are strictly confined to advisory `findings`, `modelProvider`, and the AI federation panel. Neither model can mutate `documentHash`, `evidenceHash`, `matchPercentage`, or `relevanceScore`.
3. **Truth-State Integrity**:
   - Handlers never return `VERIFIED` while `fallback_used = true`. Responses with zero findings return `EMPTY_RESULT` with `findings: []` and `fallback_used = false`.
4. **Persistence Slim DTO**:
   - Verified `/api/verify/persist` accepts sub-1 KB payloads and returns `IDEMPOTENT_EXISTS` with summary envelope intact.
5. **Public Verification Resolution**:
   - Verified `e2e/public-verification-g7.spec.ts` against production: 2/2 tests passed (6.4s authoritative valid resolution and 4.7s non-existent record rejection).

---

## 5. Open Items & Caveats
- Semantic Scholar upstream occasionally emits HTTP 429 when public rate limits are exceeded; the handler faithfully returns `fineGrainedStatus: 'RATE_LIMITED'` without crashing or falsifying truth state.
- In-memory response caches are scoped to the running serverless function container instance; cross-region or newly spun containers initialize clean and warm immediately after first invocation.

---

## 6. Final Disposition
All gates (G-A through G-F) are verified with machine evidence. All five non-negotiable invariants hold.

**FINAL STATUS: CERTIFIED**
