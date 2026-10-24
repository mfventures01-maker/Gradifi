# Gradifi System Constitution
**Standard:** HOEOS 2.0 Law 2 & Part IX
**Status:** RATIFIED BASELINE
**Security Classification:** Level 1 Canonical System Artifact

---

## I. Preamble & Core Mandate
Gradifi is an autonomous, deterministic academic integrity and document verification engine. Its mandate is to provide cryptographically verifiable, mathematically reproducible evidence of similarity, provenance, and academic authenticity.

Under the HOEOS (High-Order Engineering Operating Standard) 2.0 principles:
1. **The Deterministic Engine is the Sole Authority:** No heuristic, AI provider, or bibliographic API may override the mathematical evidence calculation.
2. **Absolute Reproducibility:** Given identical input text and corpus state, the engine must produce byte-for-byte identical findings, scores, and receipts. Zero `Math.random()`.
3. **No Phantom Evidence:** Every highlighted visual mark in the presentation layer must correspond exactly to an underlying engine finding, and every engine finding must slice the canonical text cleanly.
4. **Failure-Closed Architecture:** Network partitions, provider timeouts, or format corruptions must degrade fail-closed into explicit typed warnings or errors, never into silent omissions or false assertions.

---

## II. Fundamental Engineering Laws (HOEOS 2.0)
- **Law 1 (Evidence Precedence):** Physical runtime observation overrules static code inference, documentation, or historical transcripts.
- **Law 2 (Constitutional Governance):** System behavior is bounded by explicit invariant contracts documented in this Constitution.
- **Law 3 (Forensic Independence):** Verification oracles must evaluate independently of the production pipeline.
- **Law 4 (Deterministic Containment):** AI model non-determinism is quarantined to advisory commentary; match scoring is 100% algebraic.
- **Law 5 (One Migration, One Responsibility):** Every commit diff must address precisely one architectural change.

---

## III. Verification Engine Targets Appendix

### 1. Latency & Responsiveness
- **P50 Document Extraction:** $\le 350\text{ ms}$ for standard DOCX/PDF ($\le 20\text{ pages}$).
- **P95 Document Extraction:** $\le 1200\text{ ms}$ for complex structured documents ($\le 50\text{ MB}$).
- **P95 Deterministic Matching:** $\le 800\text{ ms}$ across 50 candidate passages against a 10,000-token student text.
- **P95 End-to-End Federated Run:** $\le 8.5\text{ s}$ across 5 live academic providers (OpenAlex, Crossref, CORE, Unpaywall, Google Books) with concurrent timeout budgets.

### 2. Throughput & Scalability
- **Node Engine Core:** $\ge 45\text{ complete document verifications / min / core}$ in headless execution.
- **Browser Presentation Render:** $\le 100\text{ ms}$ DOM re-render time for $\le 250$ active highlighted `<mark>` evidence spans.

### 3. Reliability & Availability
- **Deterministic Pipeline Availability:** $99.95\%$ uptime.
- **Extraction Determinism:** $100.000\%$ identical output on consecutive runs of the same input bytes.
- **False-Positive Bound:** $\le 0.01\%$ on negative control corpora; zero findings admitted with $< 3$ tokens or $< 10$ non-whitespace characters.

### 4. Storage & State Growth
- **Receipt Payload Limit:** Verification proof receipt JSON $\le 64\text{ KB}$.
- **Canonical Ingestion Limit:** Ingestion text stream capped at $1.0\text{ MB}$ ($1,048,576\text{ bytes}$) per document; rejects oversized text fail-closed.
- **Transient Memory Footprint:** Max worker heap allocated per verification process $\le 256\text{ MB}$; aggressive buffer reclamation on run termination.

### 5. Recovery & Degradation Invariants
- **Provider Timeout Policy:** Maximum wait per external provider is $5000\text{ ms}$. Upon timeout, provider degrades gracefully to typed warning without halting deterministic analysis of remaining sources.
- **Crash Recovery:** Zero unhandled promise rejections; any fatal adapter panic returns a typed `ExtractionFailure` (`CORRUPT_PACKAGE`, `INVALID_DOCX`, etc.) rather than an uncaught exception.
