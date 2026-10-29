# Fresh Execution Provenance — Closure

**Written:** 2026-10-29T18:02:50Z
**HEAD at write time:** `1545a4ca60b47f86816f2bf0ef30cadad9352e6e`

## Purpose

This note closes the Layer 2 provenance chain. It records the source commit, the evidence commit, the tag, the runner tracking decision, and the four bit-identical executions that establish the evidence is reproducible from committed artifacts.

It also records what is **not** claimed: the threshold decision remains `PENDING_OWNER_APPROVAL`, the 25-fixture corpus is synthetic ground truth, and passing it is not the same as passing against live academic sources.

## Citation chain

| Item | Value |
| :--- | :--- |
| Source commit | `9ee57c353163e58c18459c1c0efb114c9e7456a8` |
| Evidence commit | `123e999d61f994360717ccaaed6fdeabc3fc27d1` |
| Tag | `hoeos-l2-mvp-v1` — object `39eb752b8cb3e820fa7f4ca91bbbad419a39c4dc` |
| Tag target | `123e999d61f994360717ccaaed6fdeabc3fc27d1` |
| Runner move commit | `017be6467fee1d8b00aa9ec21719d6d26fa22e3c` |
| Runner import-fix commit | `1545a4ca60b47f86816f2bf0ef30cadad9352e6e` |
| Runner tracked path | `scripts/hoeos/layer2/run_layer2_suite.ts` |
| Runner SHA-256 | `5fa105d7c22615c50e08e385d58183de73e17fc2890c91809582e2617ed08672` |
| POSTREPAIR decision | `70c7a72fd66a65bd85b0893ccac50e2688b4e2e54c3680687710c2f6d743456f` |
| PREREPAIR reconstruction | `4b714cfe81f5cc705605790a9e91a6a849cc204e24f347eaf43c1ed50fddaa31` |
| Corpus chronology | `5dd087063ddff980eee61da41d041bb50a795d119c17f057d070a2ad3c34f629` |
| Reconciliation manifest | `e6d89b93fd9204925173e85e21b7880429f8593652875376d88eddc64913ba81` |

## Four bit-identical executions

All four executions ran `analyzeDocumentEvidence` against the 25 frozen Layer 2 fixtures and produced `fixture-results.json` at:

    SHA-256: 16479564ec8bd479543333732069cc2a3c86c89143e0a28e3ec05291bd39bf16

| Execution | Source state | Runner | Result |
| :--- | :--- | :--- | :--- |
| `run-2026-10-29T11-13-35Z` | `123e999d` | committed at `123e999d` | 25/25, 15 TP, 10 TN, 0 FP, 0 FN |
| `run-2026-10-29T17-28-48Z` | `123e999d` | `scratch/` pre-fix | 25/25, identical |
| `run-2026-10-29T17-45-23Z` | `123e999d` | `scratch/` post-fix | 25/25, identical |
| `run-2026-10-29T18-01-15Z` | `123e999d` | `scripts/hoeos/layer2/` post-fix (tracked) | 25/25, identical |

Three runner locations, two runner hashes, one engine state, one output hash. Determinism holds across the runner move and the import adjustment.

## What the runner produces per execution

Each execution creates a self-contained `evidence/layer2/runs/run-<stamp>/` directory:

- `fixture-results.json` — 25 per-fixture verdicts with confusion counts
- `accuracy-report.json` — aggregate metrics
- `threshold-decision.json` — the per-run threshold decision record
- `execution.log` — full per-fixture execution log
- `actual-results/*.json` — 25 per-fixture `analyzeDocumentEvidence` outputs

Nothing outside the run directory is written. The committed `evidence/layer2/accuracy-report.json` at `HEAD` is not modified. The freed path `evidence/layer2/threshold-decision.json` is not regenerated.

## Threshold decision status

The `18-01-15Z` run's `threshold-decision.json`:

- `recordId: THRESHOLD-DECISION-L2-CG-01`
- `decisionStatus: PENDING_OWNER_APPROVAL`
- `gateImpact: BLOCKED: OWNER THRESHOLD DECISION REQUIRED`
- `ownerApprovalStatus: UNAPPROVED`
- Observed values: precision `1`, recall `1`, FPR `0`, span accuracy `1`, AI isolation `1`

The engine meets every proposed threshold. **The thresholds are not approved.** The tag's `L2_CERTIFICATION=PASS` documents "the engine passes its own corpus and every pre-declared threshold," not "the owner has approved the thresholds for commercial acceptance."

That distinction survives into the demo narrative.

## Synthetic corpus vs live-source verification

The 25-fixture corpus is synthetic ground truth. It exercises segmentation, matching, scoring, span attribution, and confusion-matrix logic against hand-labelled fixtures.

Passing the corpus proves the engine behaves as specified on those fixtures. It does **not** prove the engine performs correctly against live academic sources. That is the Crossrail `.docx` test and any subsequent live-source evaluation.

The two are separate evidence. A corpus PASS is one claim; a live-source PASS is another. Neither substitutes for the other.

## What this note does not claim

- **Owner threshold approval.** `PENDING_OWNER_APPROVAL`.
- **Commercial acceptance.** `BLOCKED: OWNER THRESHOLD DECISION REQUIRED`.
- **Live-source verification.** The corpus is synthetic.
- **Layer 3.** Not started.
- **Production release.** `HARD_HOLD`.
- **AI-authorship detection.** The engine is a deterministic lexical-similarity detector with AI advisory isolation. It does not classify text as AI-generated or human-generated.

## Reproduction

A fresh clone at commit `1545a4c` can reproduce the Layer 2 execution:

    git checkout 1545a4ca60b47f86816f2bf0ef30cadad9352e6e
    npm ci
    node_modules/.bin/tsx scripts/hoeos/layer2/run_layer2_suite.ts

Expected result: `evidence/layer2/runs/run-<new-stamp>/fixture-results.json` at `16479564…`.

If the hash differs, the engine, corpus, or runner has been modified in a way that changes the classification. That would be a finding, not a reproduction failure.