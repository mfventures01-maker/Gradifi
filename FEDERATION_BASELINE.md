# FEDERATION BASELINE REPORT
**REPOSITORY:** `C:\Projects\Gradifi`  
**SCOPE:** Academic & AI Provider Federation Baseline Audit  
**DATE:** September 12, 2026  

---

## 1. Executive Summary

This document establishes the verified architectural baseline of the Gradifi Academic & AI Evidence Federation system prior to optimization.

---

## 2. Federation Architecture Overview

### Components & Entry Points
- **Primary Orchestrator:** `VerifyCoreService` ([`src/services/verify/verifyCoreService.ts`](file:///C:/Projects/Gradifi/src/services/verify/verifyCoreService.ts#L43))
- **AI Federation Orchestrator:** `AIFederationService` ([`src/services/verify/aiFederation.ts`](file:///C:/Projects/Gradifi/src/services/verify/aiFederation.ts#L22))
- **Academic Provider Adapters:**
  1. OpenAlex: `OpenAlexProvider` ([`src/services/verify/providers/openAlexProvider.ts`](file:///C:/Projects/Gradifi/src/services/verify/providers/openAlexProvider.ts))
  2. Crossref: `CrossrefProvider` ([`src/services/verify/providers/crossrefProvider.ts`](file:///C:/Projects/Gradifi/src/services/verify/providers/crossrefProvider.ts))
  3. Unpaywall: `UnpaywallProvider` ([`src/services/verify/providers/unpaywallProvider.ts`](file:///C:/Projects/Gradifi/src/services/verify/providers/unpaywallProvider.ts))
  4. CORE: `CoreProvider` -> `handleCoreServerSearch()` ([`src/services/verify/server/coreServerHandler.ts`](file:///C:/Projects/Gradifi/src/services/verify/server/coreServerHandler.ts))
  5. Google Books: `GoogleBooksProvider` -> `handleGoogleBooksServerSearch()` ([`src/services/verify/server/googleBooksServerHandler.ts`](file:///C:/Projects/Gradifi/src/services/verify/server/googleBooksServerHandler.ts))
- **AI Reasoning Handlers:**
  6. NVIDIA Nemotron: `handleNemotronServerReasoning()` ([`src/services/verify/server/nemotronServerHandler.ts`](file:///C:/Projects/Gradifi/src/services/verify/server/nemotronServerHandler.ts))
  7. Google Gemini: `handleGeminiServerReasoning()` ([`src/services/verify/server/geminiServerHandler.ts`](file:///C:/Projects/Gradifi/src/services/verify/server/geminiServerHandler.ts))
  8. Ollama / Gemma: `handleGemmaServerReasoning()` ([`src/services/verify/server/gemmaServerHandler.ts`](file:///C:/Projects/Gradifi/src/services/verify/server/gemmaServerHandler.ts))

---

## 3. Verified Baseline Findings

### A. Execution Order
1. **Input Normalization:** Raw text resolved into G5.1 `CanonicalAnalysisDocument`.
2. **Academic Provider Federation:** 5 academic providers (OpenAlex, Crossref, Unpaywall, CORE, Google Books) executed in parallel.
3. **Deterministic Evidence Analysis:** G2 similarity engine (`analyzeDocumentEvidence()`) computes SHA-256 document and evidence hashes and overall similarity score over retrieved matches.
4. **AI Federation Execution:** `AIFederationService.executeFederation()` queries Gemma, Nemotron, and Gemini.
5. **G3 Evidence Policy Evaluation:** `evaluatePlagiarismEvidence()` evaluates risk level and exact phrase counts over deterministic similarity findings.

### B. Sequential vs. Parallel Execution
- **Academic Discovery:** Uses `Promise.allSettled()` across OpenAlex, Crossref, Unpaywall, CORE, Google Books.
- **AI Federation:** Runs sequentially within `executeFederation()`: `probeLocalGemma()`, then `runGemmaReasoning()`, then `runNemotronReasoning()`, then `runGeminiReasoning()`.

### C. Timeout Behavior
- Academic providers use native `fetch()` without explicit `AbortController` timeouts.
- `probeLocalGemma()` uses a 1200ms `AbortController` timeout.
- Unbounded fetch calls can hang if an external API is unresponsive.

### D. Retry Behavior
- `googleBooksServerHandler.ts` retries once on HTTP 429 after 600ms delay.
- All other providers (OpenAlex, Crossref, Unpaywall, CORE, Nemotron, Gemini) have ZERO retry logic.

### E. Error Classification
- Provider responses are classified into `status` (`success`, `partial`, `unavailable`, `error`) and `fineGrainedStatus` (`VERIFIED`, `AUTHENTICATION_FAILED`, `REQUEST_FAILED`, `EMPTY_RESULT`, `INFERENCE_VERIFIED`, `INFERENCE_FAILED`, `RUNTIME_UNAVAILABLE`).

### F. Deduplication
- Performed downstream in `deterministicEngine.ts` by matching DOI and source ID.

### G. Caching
- Currently NO L1/L2/L3 request or evidence caching exists.

### H. Provider Result Normalization
- All providers map raw API items into `EvidenceMatch` with `ProviderProvenance`.

### I. Provenance Preservation
- Every match carries complete `ProviderProvenance` including provider ID, record ID, retrieved timestamp, source URL, title, authors, DOI, ISBN, published year, and correlation ID.

### J. AI / Non-AI Authority Boundaries
- Strictly enforced. AI Federation results are marked `NON-AUTHORITATIVE` and returned only in `findings: AIFinding[]`. Deterministic similarity scores and G3 risk policy are calculated purely by G2/G3/G5 algorithms before AI runs.

### K. Bulk Request Behavior
- No batching or concurrency control pools currently exist for multi-document workloads.

### L. Rate-Limit Handling
- Google Books handles HTTP 429 with 1 retry. Other providers return `REQUEST_FAILED` or `EMPTY_RESULT`.

### M. Failure Resilience
- `Promise.allSettled()` ensures that a single provider failure or timeout does NOT cancel or fail the remaining provider requests.

---
*Generated as part of HOEOS Phase A Baseline Discovery.*
