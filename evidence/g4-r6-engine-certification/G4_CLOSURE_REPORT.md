# HOEOS G4 Closure Report: Dual-Pillar Certification

## 1. Verdict

**G4_STATUS: PASS**, based on the preserved live-provider runtime artifact and the R6 hermetic engine certification. This closure records the evidence on disk; it does not claim that live providers were re-run during R6.

## 2. Gate contract

Contract source: `G4_FORENSIC_CERTIFICATION_REPORT.md` (historical contract artifact; recorded source HEAD `9a59897599d11d5f812f0800c6764b2d01eeb93b`).

Relevant contract statements:
- Line 22: exact corresponding passage(s), with no alteration, substitution, loss, or identity confusion.
- Line 24: deterministic positional slicing.
- Line 74: rendered segments cover 100% of canonical characters without loss or duplication.
- Line 117: overlapping spans are flattened into non-overlapping contiguous slice segments.
- Line 204: `G4_STATUS=CERTIFIED_PASS`.

## 3. Evidence pillars

### Pillar A: Live-provider G4 run

- Artifact: `evidence/g4-closure-20261016T1632Z/G4_RESULT.json`
- Recorded evaluation: `2026-10-16T17:37:31.1436282+01:00`
- Repository HEAD: `9b70b62190c6a739c84ccc8f4c4c9cd9470e9e44`
- Working tree: `DIRTY (pre-existing modifications preserved + G4 minimal repair)`
- Result: **PASS**
- Findings / marks: **2 / 2**
- Finding 1: `de51b5db0696a8eb`; source `https://openalex.org/W7163668962`; offsets `[58,76)`; canonical slice `Federated Learning`.
- Finding 2: `a8bf1fe9b46f5759`; source `doi:10.21203/rs.3.rs-9358734/v1`; offsets `[800,816)`; canonical slice `machine learning`.
- Playwright exit: `0`; unit assertions: `33/33`; negative-boundary exit: `0`.
- Evidence classification: **C+D**, as recorded in the supplied audit. This is a historical live-provider run, not a live-provider re-run performed by this closure-writing script.

### Pillar B: R6 hermetic engine run

- Summary: `evidence/g4-r6-engine-certification/r6-summary.json`
- Trace: `evidence/g4-r6-engine-certification/r6-trace.json`
- Engine result: `evidence/g4-r6-engine-certification/r6-engine-result.json`
- Run ID: `r6-run-20261018`
- Timestamp: `2026-10-18T15:02:46.3942105Z`
- Command recorded: `npx playwright test e2e/g4-engine-certification.spec.ts --config=playwright.r6.config.ts`
- Exit code / test result: `0` / `PASS`
- Findings / marks: **7 / 3**
- Merge behavior: `True`
- Coverage: `True`
- Text/slice verification: `True`
- Seam absent at load / after run: `True` / `True`
- Synthetic provenance: `True`
- Evidence classification: **C**. The test uses controlled synthetic provider stubs; it certifies engine behavior for this controlled input, not live API availability.

R6 finding-to-mark mapping recorded by the run:
| Finding ID | Source offsets | DOM mark |
|---|---:|---:|
| `e42c8ca2ff0a9bd8` | `[0,93)` | 0 |
| `502190ab66add8c7` | `[93,112)` | 0 |
| `974e54fc0a4f71a2` | `[112,135)` | 0 |
| `40d3ffdd3e45d531` | `[135,228)` | 0 |
| `207e76876bf14241` | `[618,698)` | 1 |
| `4e4ee35f498f1dcf` | `[698,772)` | 1 |
| `984af705a1605c73` | `[774,936)` | 2 |

DOM mark ranges recorded for R6:
- Mark 0: `[0,228)` on `doi:10.9999/gradifi-r6-a`.
- Mark 1: `[618,772)` on `doi:10.9999/gradifi-r6-b`.
- Mark 2: `[774,936)` on `doi:10.9999/gradifi-r6-b`.

## 4. Reconciliation

The live-provider run records one-to-one rendering (2 findings to 2 marks). R6 records merged-mark coverage (7 findings to 3 marks), extending the tested surface to the overlap/merge path. The gate contract does not impose one DOM mark per finding; the acceptance question is whether every finding is faithfully represented by rendered canonical text with identity preserved and no loss, substitution, or confusion.

## 5. Scope and limitations

- This record combines two preserved evidence runs; it does not represent one combined execution.
- R6 is synthetic and does not certify live-provider availability.
- The 2026-10-16 live-provider artifact records HEAD `9b70b62190c6a739c84ccc8f4c4c9cd9470e9e44`. The current checkout HEAD at report-generation time was `9b70b62190c6a739c84ccc8f4c4c9cd9470e9e44`.
- **R7 remains a recommended regression re-check** to reconfirm the live-provider path against the current checkout. It is not new certification of the already-preserved run.
- Other gates and production cutover restrictions are not changed by this G4 report.

## 6. Commands and exit evidence

- Live artifact records Playwright exit `0`, unit assertions `33/33`, and negative-boundary exit `0`.
- R6 command: `npx playwright test e2e/g4-engine-certification.spec.ts --config=playwright.r6.config.ts`
- R6 exit code: `0`; result: `PASS`.

## 7. SHA-256 inventory

| Artifact | SHA-256 |
|---|---|
| Live-provider G4 result | `3A4381D39BFA19DA96E04F12C98A460F77BEFB325AEF53A9D6258B9D5B9215AA` |
| R6 trace | `066BDCC3E6E7047C862731A7A4BACA05691FEA0166305ADDCF3FD76B5DF90439` |
| R6 engine result | `066BDCC3E6E7047C862731A7A4BACA05691FEA0166305ADDCF3FD76B5DF90439` |
| Updated R6 summary | `CF862551196498D470E108EC74570F7F47F8B379385FE29FF5CC846FC249A6AB` |
| Gate contract report | `309870E8C60661E859406E39E3A3D290E8E0F2FF5D51BF2E5E02BAB9E43BC9C9` |

## 8. Closure statement

**G4 is recorded PASS under the dual-pillar evidence interpretation.** This is a documentation and evidence reconciliation action only. It does not modify application source, rerun tests, certify G12, certify the write boundary, close the tenant-contract gap, or authorize production cutover.
