# Layer 2 Freeze Reconciliation Note

**Written:** 2026-10-29T07:23:22Z

## Purpose

This note records that the Layer 2 accuracy report's §12 SHA-256 table does not
match the artefacts currently on disk. It establishes the actual hashes, the
actual modification times, and the reason for each discrepancy, so that the
Layer 2 evidence chain can be audited without treating the report's §12 table
as authoritative where it is not.

## Root causes

1. `repeatability-report.json` and `regression-report.json` were re-generated at
   2026-10-29T06:20:10Z, approximately 5 hours after the main Layer 2 run
   (2026-10-29T01:19:56Z). Their content is internally consistent with the
   Layer 2 report's §9 claims (100% repeatability, ZERO_REGRESSIONS_DETECTED),
   and their own internal timestamps match their file modification times. The
   report cites the earlier 01:19 hashes; the artefacts on disk are the 06:20
   re-runs. The numbers are supported; the hashes are stale.

2. `authority-contract.md` was modified at 2026-10-29T07:08:07Z to add a single
   trailing LF, growing the file from 3349 bytes to 3350 bytes. This is the only
   post-run edit to a frozen artefact that changes byte content. It is cosmetic
   but it invalidates the report's cited hash d552fbfa....

3. The mirror copy of `authority-contract.md` at `C:\Projects\Gradifi-evidence\layer2\`
   remains at 3349 bytes with hash `41dace15...`, matching neither the report's
   cited hash nor the current repo copy.

## Actual current state

| Artefact | Current SHA-256 | Current MTime (UTC) | Report §12 hash | Match |
| :--- | :--- | :--- | :--- | :--- |
| `authority-contract.json` | `e4bfd477bfdda5b0d223ebfe56cab1081c828cbc005a8384ca33f0873844d966` | 2026-10-29T00:58:24.311Z | `e4bfd477bfdda5b0d223ebfe56cab1081c828cbc005a8384ca33f0873844d966` | True |
| `authority-contract.md` | `a69bc58c992e40d6db06556fb5d10c2955b5f07357a692298ecccf8450b273f9` | 2026-10-29T07:08:07.477Z | `d552fbfa6ae8b668d27be9b3b80b08da3e08f51dfb34200787e923e1e9c5ec37` | False |
| `corpus-manifest.json` | `8f7620ce720f431cac45297d33e5cc4007d9acc6549ec9d1895106c8b98a2899` | 2026-10-29T01:19:13.259Z | `24874a74288b884d6b63ca52f55fb350d55e09fba24aa0b22a61e0f06a86c637` | False |
| `corpus-validation.json` | `2353093cfe678490ac961a23fe43977af013f88e1ca83237b51d2565137bd44e` | 2026-10-29T01:19:13.259Z | `8fc358a927fa11c4e7ec97e68407fc20c3ec8d06b8bbcb75a805f25bf6e23631` | False |
| `runs/run-2026-10-29T01-19-56Z/fixture-results.json` | `86f7d097e4c5570c8ebb3bbfd7a25e3ba0a7086bd53ac5ae3658167215f3abab` | 2026-10-29T01:19:56.998Z | `655a90d9a6f3b060d4da58a0ebc8cf0ae338a0cbe44cb68a73507119ff3ae5db` | False |
| `runs/run-2026-10-29T01-19-56Z/execution.log` | `4132ec5a22fc87105cb543646451f54d75a7f3a8fa13a002f2d894dd654ceb77` | 2026-10-29T01:19:57.021Z | `9fec6a7509f7a77e59c038379fc7d0ecdf824da5caad00da04b5aebf13d8a1ef` | False |
| `accuracy-report.json` | `f81f088feff7c2817d7bd17dfef1b18e5fc538e791c9c400cfb2cc92f8ae669a` | 2026-10-29T01:19:57.029Z | `5618f8e0019dd18bf5d70f9012c8ff40c6fe2dd502e604ec22ca9bb46ff1fead` | False |
| `threshold-decision.json` | `32973e6cb8b0a3620002dd110d1300a31939f93893be798d1126b0e91d66a9a7` | 2026-10-29T01:19:57.029Z | `b6d43e5c942953289047cb54eb44747eb79f4ea547517c2f6d7d6f51cb3229b4` | False |
| `ui-validation-report.json` | `871f80289047543500476c1db65f5006f17732ec90ed376acb73e6284b0c9ddb` | 2026-10-29T01:23:28.197Z | `2e080b037fa9bfa3fc13b71520625fca78d0f1eb2da529729837946927da8fa8` | False |
| `ai-isolation-report.json` | `cd91077f9916bb346fc4e582fe950fcfeac9e2eb6038fee537971582bd5242a9` | 2026-10-29T01:21:27.323Z | `e4370eb0649725f0e97669bb58f8aa99f84852fbfab23a3be1350a49c6934c26` | False |
| `repeatability-report.json` | `85830052555271da5b80d345433b32e1c9570b4272c50df73e8dcbca35469196` | 2026-10-29T06:20:10.585Z | `c51fa877c223c21c6b12a8fa99ee0a1f9e29a997cf054924ecf4453b52a5c374` | False |
| `regression-report.json` | `07e92b8b655f4516b7b89e0ea0a7a005579194302df30d2d4faa4c33115e6d58` | 2026-10-29T06:20:10.585Z | `0c65529fba9a1845bb08fef9f79b007ea45da852927233fec6ee50f96d66e700` | False |

## Authoritative artefacts for the Layer 2 gate decision

- `threshold-decision.json` current hash: ``32973e6cb8b0a3620002dd110d1300a31939f93893be798d1126b0e91d66a9a7``
  This artefact declares `ownerApprovalStatus = UNAPPROVED` and
  `gateImpact = BLOCKED: OWNER THRESHOLD DECISION REQUIRED`. It is the record
  on which the Layer 2 verdict depends and its content is intact.

- `authority-contract.json` current hash: ``e4bfd477bfdda5b0d223ebfe56cab1081c828cbc005a8384ca33f0873844d966``
  This artefact is byte-identical to the report's cited hash and unchanged since
  2026-10-29T00:58:24Z, prior to the main run.

- `runs/run-2026-10-29T01-19-56Z/fixture-results.json` current hash: ``86f7d097e4c5570c8ebb3bbfd7a25e3ba0a7086bd53ac5ae3658167215f3abab``
  This is the primary execution record. Its mtime (01:19:56Z) matches the run
  directory name to the second.

## Not done by this note

- No artefact was modified.
- The Layer 2 accuracy report's §12 table was not rewritten.
- No code in `src/` or `tests/` was changed.
- No hash in the report was edited to match the disk.
- No push, tag, or deploy was performed.

## Downstream citation guidance

Any subsequent Layer 2 record that cites artefact hashes should cite the
current on-disk hashes from the table above, not the report's §12 table, and
should note that this reconciliation exists and explains the divergence.

The Layer 2 gate verdict remains **BLOCKED** pending the owner threshold
decision recorded in `threshold-decision.json`. This reconciliation does not
change the verdict; it only documents the evidence state the verdict is based on.