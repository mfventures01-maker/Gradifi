# Layer 2 Corpus and Decision Chronology

**Written:** 2026-10-29T17:15:59Z

## Purpose

This note records every hash transition in the Layer 2 evidence chain that the
current state depends on, with the mtime and reason for each transition.
It exists because the following artefacts were modified after the runs that
cited them: the frozen corpus manifest, the frozen corpus validation, two
fixture expectations, and the threshold decision record. A reader who encounters
any of the pre-transition hashes in an older report needs to be able to find
the current state and why it differs.

## Authoritative source state

- Source commit: `9ee57c353163e58c18459c1c0efb114c9e7456a8`
- Commit subject: `L2-CG-01: coverage threshold 20->40, mapTokenSpans + paragraph leading-whitespace offset, candidateMatches routing`
- Branch: `clean-deploy`

## Threshold decision record chain

| State | Path | SHA-256 | MTime (UTC) | Status |
| :--- | :--- | :--- | :--- | :--- |
| Pre-repair (reconstructed) | `threshold-decision-2026-10-29T01-19-57Z-PREREPAIR.json` | `4b714cfe81f5cc705605790a9e91a6a849cc204e24f347eaf43c1ed50fddaa31` | reconstructed | Content reconstructed from amendment `393fbf8a...`; original hash `32973e6c...` is not on disk |
| Overwriting file (preserved) | `threshold-decision.json.overwritten-at-2026-10-29T11-13-35Z` | `c5bbe8a369b46d5f8ae80aa19a2b6acdfdb9752e5b715f42963e05a7faff3b1e` | 2026-10-29T11:13:35Z | The file that replaced the pre-repair record at the same path |
| Post-repair (authoritative) | `threshold-decision-2026-10-29T11-13-35Z-POSTREPAIR.json` | `70c7a72fd66a65bd85b0893ccac50e2688b4e2e54c3680687710c2f6d743456f` | 2026-10-29T11:13:35Z | Current decision record: `gateImpact=PASS: ALL_PROPOSED_THRESHOLDS_MET`, `sourceCommit=9ee57c3` |
| Amendment | `threshold-decision-amendment-20261029T072434Z.json` | `393fbf8a25729fd0f87378e32e13e99f95b4dd530b44bc74a67510d03e6d67be` | 2026-10-29T07:24:34Z | The owner decision that approved the proposed thresholds and recorded the pre-repair misses |

**Chain:** amendment `393fbf8a` → pre-repair `32973e6c` (now reconstructed as `4b714cfe`) → overwritten at `11:13:35Z` by `c5bbe8a3` (preserved) → authoritative post-repair record `70c7a72f` citing source commit `9ee57c3`.

## Corpus manifest chain (`corpus-manifest.json`)

| State | SHA-256 | MTime (UTC) | Reason |
| :--- | :--- | :--- | :--- |
| Original frozen | `24874a74288b884d6b63ca52f55fb350d55e09fba24aa0b22a61e0f06a86c637` | 2026-10-29T01:19:13Z | Cited by Layer 2 accuracy report §12 |
| Middle | `8f7620ce720f431cac45297d33e5cc4007d9acc6549ec9d1895106c8b98a2899` | 2026-10-29T01:19:13Z | Cited by the reconciliation manifest `4c8844bf...` and the freeze reconciliation note `6bc0ba60...` |
| Current | `7ede27b624061e26c30cefa0f3a7763026d6818278fe77afcbd3a865e095325d` | (mtime from current file) | Regenerated after the L2-CAT-C-03 and L2-CAT-H-02 expectation edits |

## Corpus validation chain (`corpus-validation.json`)

| State | SHA-256 | Reason |
| :--- | :--- | :--- |
| Original frozen | `8fc358a927fa11c4e7ec97e68407fc20c3ec8d06b8bbcb75a805f25bf6e23631` | Cited by Layer 2 accuracy report §12 |
| Current | `cec0d918e1c214f5ac98b7a273ef2b4311c7129a7bcaf06f1e2f0692731c7d44` | Regenerated alongside the current corpus manifest |

## Fixture expectation changes

| Fixture | Original SHA-256 | Current SHA-256 | Reason |
| :--- | :--- | :--- | :--- |
| `L2-CAT-C-03.json` | `734b97721356965a66cf23905ada567c2db25840b4c0ac6c3c5a6a66d580a581` | `e3664cdc84b23ce66aea641c3b8910f1a0234a52c16fb58f0985a48ab796e75c` | Expected score range revised from post-repair observed `0` (was `1` false positive at score `100` pre-repair). The `>=40%` coverage gate in `deterministicEngine.ts` changed the semantics of a single-sentence submission. |
| `L2-CAT-H-02.json` | `d7b18ca489b93ef0d3465d74ffb75bfd3c63185633ec23be91258e5d39036808` | `4f02fa5d8f8a3bb31c42d7575b803e208a8cbba8ab926d9135cd1493ea1ba1a4` | Expected score revised. Post-repair observed `87.5` vs pre-repair `100`. The `mapTokenSpans` + leading-whitespace offset correction changed the span assignment. |

## Run directories and their `fixture-results.json` hashes

| Run directory | `fixture-results.json` SHA-256 | Status |
| :--- | :--- | :--- |
| `run-2026-10-29T01-13-37Z` | `43d2ee163724d8bcb348d1ae71fe3ab4456b53c306349903e5e8a06f45abaee2` | Pre-repair |
| `run-2026-10-29T01-19-56Z` | `86f7d097e4c5570c8ebb3bbfd7a25e3ba0a7086bd53ac5ae3658167215f3abab` | Pre-repair (the run the original accuracy report was written against) |
| `run-2026-10-29T11-04-00Z` | `52ca8490953c03bf93b322cc9df617371b298c36bcdfee8e577fe8934c1df876` | Intermediate post-repair |
| `run-2026-10-29T11-13-35Z` | `16479564ec8bd479543333732069cc2a3c86c89143e0a28e3ec05291bd39bf16` | Post-repair (the run the POSTREPAIR decision record cites) |
| `rep-run-2026-10-29T13-26-17Z` | (see file) | Representative corpus run |
| `rep-run-2026-10-29T14-15-01Z` | (see file) | Representative corpus run |

## Reconciliation manifest

- `reconciliation-manifest-20261029T080000Z.json` at `4c8844bfa2727097944f4d8d8f47261629a0375d8ff8e4f20cd91d00824d5b41`.
  This manifest self-declares an aggregate hash `d2060b720ec52003baefa4acf59fd679bd6e5c4ceacb19e1d3f295d62b5a64db` that does **not** match its own file hash. That is a self-declared-value defect in the manifest, not a content defect. A fresh manifest will be generated against the current state and will declare its own actual hash.

## Downstream citation guidance

- Cite the **post-repair** decision record `70c7a72f...` for the current `L2-CG-01 = PASS`.
- Cite the **pre-repair reconstruction** `4b714cfe...` for the pre-repair state, and note that its content is reconstructed from amendment `393fbf8a...`, not the original bitstream.
- Cite the source commit `9ee57c3` for the engine state that the PASS applies to.
- Do **not** cite `32973e6c...` as a hash of a file on disk — it is a hash of a file that no longer exists, preserved only in the amendment and the reconciliation manifest.
- Do **not** cite the pre-transition corpus manifest hashes (`24874a74...`, `8f7620ce...`) as current. Cite `7ede27b6...` for the current corpus.

## What this note does not do

- No file was modified.
- No hash was rewritten.
- No run was re-executed.
- No push, tag, or deploy was performed.
- The Layer 2 verdict on the source at `9ee57c3` is `PASS` per the POSTREPAIR record `70c7a72f...`, pending the fresh reconciliation manifest and the tag.