# Gradifi AI Governance Constitution
**Standard:** HOEOS 2.0 Law 10 (AI Containment & Graceful Degradation)
**Status:** RATIFIED BASELINE
**Security Classification:** Level 1 Canonical System Artifact

---

## I. Core AI Governance Principles

1. **Advisory Containment (Law 10):**
   Large Language Models (LLMs) and generative AI systems (Gemini, Nemotron, Gemma) operate strictly within an **advisory and explanatory tier**. They have **zero authority** over similarity percentages, byte offset allocations, or verification receipts.

2. **Deterministic Isolation:**
   No AI inference output may be interpolated into `SimilarityAnalysisResult.overallSimilarity`, `uniqueMatchedCoverage`, or `highestSourceMatch`. The deterministic engine alone computes these values.

3. **Total Transparency & Provenance:**
   Every AI-generated explanation, summary, or suggestion must carry an explicit provenance tag (`AI_ADVISORY`), identifying the provider model, temperature ($0.0$ required), prompt hash, and timestamp.

---

## II. Multi-Model Federation & Degradation Policies

Gradifi utilizes a tiered AI federation strategy:
- **Tier 1 (Synthesis & Analysis):** Google Gemini 1.5 Pro / Flash
- **Tier 2 (Academic Domain Reasoning & Structural Synthesis):** NVIDIA Nemotron-4-340B-Instruct
- **Tier 3 (Local Edge / Privacy Preservation):** Google Gemma 2B/9B (Client/Local runtime)

### 1. Gemini Degradation Policy
- **Role:** Deep semantic summarization of matched academic passages.
- **Timeout Budget:** $6000\text{ ms}$.
- **Rate Limit (`429`) / Outage (`503` / `500`):**
  - Instant fallback to cached semantic summaries if available.
  - If unavailable, degradation directly to Tier 2 (Nemotron).
  - If Nemotron unavailable, falls back to raw deterministic snippet rendering with typed warning:
    `GEMINI_UNAVAILABLE: Semantic synthesis omitted; displaying deterministic lexical match.`
- **Test Harness:** Governed by `evidence/provider-truth/gemini-status-tests.json` and `tests/pipeline/pipelineAuditFailClosed.test.ts`.

### 2. Nemotron Degradation Policy
- **Role:** Cross-disciplinary citation synthesis and structural argument overlap analysis.
- **Timeout Budget:** $8000\text{ ms}$.
- **Failure Behavior:**
  - On timeout or non-200 response, immediately fall back to Tier 3 (Gemma) or fallback invariant.
  - Zero disruption to deterministic score calculation.
  - Emits warning:
    `NEMOTRON_DEGRADED: Argument synthesis skipped; deterministic evidence preserved.`
- **Test Harness:** Governed by `evidence/provider-truth/nemotron-status-tests.json`.

### 3. Gemma Degradation Policy
- **Role:** Lightweight on-device offline analysis and prompt classification.
- **Resource Constraints:** WebGPU / WASM execution bounded to $\le 512\text{ MB}$ allocation.
- **Failure Behavior:**
  - If WebGPU device is unavailable or memory allocation fails, Gemma disengages entirely.
  - Ingestion proceeds with zero client-side AI advisory; fallback to pure algorithmic regex/n-gram parsing.
  - Emits warning:
    `GEMMA_INACTIVE: Local AI acceleration unavailable; defaulting to CPU deterministic parsing.`

---

## III. AI Invariant Test Suite Requirements

1. **Offline Invariant Test:** When all network connections are disconnected or all AI API keys are nullified, `verifyCoreService` must still return a complete, valid `EvidenceEngineResult` with 100% accurate deterministic scores.
2. **Determinism Invariant Test:** The same prompt sent to the AI layer with temperature $0.0$ must return deterministic output or fall back fail-closed into structured errors.
3. **Receipt Sealing:** Public verification receipts and QR codes must never embed AI model outputs as proof tokens. Receipts hash only canonical document text and deterministic findings.
