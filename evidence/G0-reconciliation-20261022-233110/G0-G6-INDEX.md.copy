# Gradifi Forensic Evidence Index (G0–G6)
**Standard:** HOEOS 2.0 Law 12 (Audit Trail Legibility & Navigation)  
**Maintained By:** Forensic Dispatch Agent  
**Last Updated:** 2026-10-22T14:50:00+01:00  

---

## 1. Directory Index

| Evidence Directory | Primary Gate / Subject | Disposition | Unresolved Findings / Notes |
| :--- | :--- | :--- | :--- |
| `baseline-20261020T225554Z/` | G0 Baseline | PASS | Historic freeze before G1/G2 investigations. |
| `G0-reverification-20261022-134800/` | G0 Baseline Reverification | PASS | Baseline manifest SHA-256 `9D36D0D8...` verified; drift recorded for 18 files. |
| `G1-root-cause-20261022-143800/` | G1 DOCX Extraction Fidelity | DIAGNOSED (FAIL) | Root-cause established: inter-run newline injection in legacy `officeZipAdapter.ts`. Modern `docxExtractor.ts` tested deterministic; seam in `universalIngestionService.ts` pending authorized repair. |
| `phase0/` | G0 Environment Audit | HISTORIC PASS | Initial environment and dependency lock. |
| `phase1/` | G1 Format Audit | PROVISIONAL | Early multi-format matrix audit. |
| `phase2/` | G1 Extractor Audit | PROVISIONAL | 17-format detector investigation. |
| `phase3/` | G5-M03 DOCX Extractor Contract | CERTIFIED (COMPONENT) | Standalone `docxExtractor.ts` unit certification (22/22 tests). |
| `phase4/` | G2/G3 Deterministic Engine Audit | PROVISIONAL | Early deterministic formula inspection. |
| `similarity/` | G2 Similarity Metric Engine | PROVISIONAL | Metric baseline calculations. |
| `provider-truth/` | G4 Federation & Provider Fallbacks | CERTIFIED | Offline/fallback invariant verification across 5 academic sources. |
| `g4-audit-20261016T1526Z/` | G4 Live Ingestion Audit | FAIL | Identified provider timeout and connection drops. |
| `g4-closure-20261016T1632Z/` | G4 Repair Validation | PROVISIONAL | Hardened provider timeouts and fallbacks. |
| `g4-deterministic-20261016T1415Z/` | G4 Determinism Check | PASS | Deterministic multi-tier scoring runs. |
| `g4-independent-20261017T232431/` | G4 Independent Oracle Verification | CERTIFIED | Oracle vs engine match alignment. |
| `g4-live-recertification-20261018T172500Z/` | G4 Live Provider Recertification | PASS | End-to-end browser execution on live web. |
| `g4-r6-engine-certification/` | G4/R6 Production Engine | CERTIFIED | Production engine build verification. |
| `g4-r6-trace-20261018/` | G4/R6 Runtime Tracing | PASS | DOM highlight trace logs. |
| `g4-r7-live-provider-20261018T154500Z/` | G4/R7 Live Provider Certification | PASS | Full provider federation run. |
| `g4-r7-unit-recheck-20261018T192836Z/` | G4/R7 Unit Regression Recheck | PASS | Unit regressions confirmed clean. |
| `g4-repair-20261017T1404Z/` | G4 Rejection Matrix (R1) | FAIL | Negative control boundary exploration. |
| `g4-repair-20261017T1415Z/` | G4 Rejection Matrix (R2) | FAIL | Boundary exploration. |
| `g4-repair-20261017T1430Z/` | G4 Rejection Matrix (R3-R5) | CERTIFIED | 21 adversarial rejection tests certified. |
| `g5_baseline/` | G5 Ingestion Baseline | PASS | Baseline specifications and sentinel collision checks. |
| `g9/` | G9 Commercial UI / Gemini | PROVISIONAL | UI rendering audits. |
| `gate-d1-20261021T001746/` | Gate D Ingestion Integrity | FAIL | DOM mark attribute discovery. |
| `gate-d-baseline-20261021T003326Z/` | Gate D Baseline Execution | FAIL | Highlight offset mismatch on live runs. |
| `gate-d-baseline-20261021T003702Z/` | Gate D Baseline Re-run | FAIL | Offset alignment defect confirmed. |
| `gate-d-fix-20261021T012009Z/` | Gate D Fix Validation | PROVISIONAL | Initial offset alignment patch. |
| `gate-d-20261021-095811/` | Gate D Preflight Snapshot | PASS | Snapshot prior to contract adjustment. |
| `gate-d-20261021-104050/` | Gate D Preflight Snapshot | PASS | Secondary snapshot. |
| `gate-d-20261021-113748/` | Gate D Contract Verdict | PASS | Build and typecheck certified. |
| `gate-d-runtime-20261021-105533/` | Gate D Runtime Certification | PASS | Runtime verification pass. |
| `gate-d-runtime-20261021-123517/` | Gate D Runtime Certification | PASS | 60 files hashed before/after. |
| `gate-d-source-id-20261021-132635/` | Gate D Source ID Alignment | PASS | Source ID propagation verified. |
| `gate-d-runtime-20261021-133117/` | Gate D Runtime Recheck | PASS | Deterministic tree confirmation. |
| `gate-d-runtime-20261021-133515/` | Gate D Runtime Recheck | PASS | Final runtime fingerprint match. |
| `gate-d-final-20261021-142520/` | Gate D Final Certification | FAIL | DOM mark vs finding count divergence. |
| `gate-d-final-20261021-142711/` | Gate D Final Certification Run 2 | FAIL | Repeated mark divergence. |
| `gate-d-final-20261021-143440/` | Gate D Final Certification Run 3 | FAIL | Exposed unrendered findings defect. |
| `gate-d-provenance-20261022-094100/` | D-Provenance Pre-Fix A Run | FAIL | `UNRENDERED_FINDING.json` captures 10 findings, 2 marks (8 orphaned findings with `sourceStart: undefined`). |
| `gate-d-provenance-20261022-105333/` | D-Provenance Fix A Implementation | BLOCKED | Typecheck failed due to `warnings` out of scope; revised to bare `continue;` (Option 2). |

---

## 2. Gate Status Summary

- **G0 (Baseline Freeze):** PASS. Hashed and re-verified.
- **G1 (DOCX Extraction Fidelity):** FAIL / DIAGNOSED. Root cause isolated to inter-run newline injection in legacy `officeZipAdapter.ts`; seam in `universalIngestionService.ts` isolated.
- **G2 (Canonical Identity & Score Authority):** FAIL / DIAGNOSED.
  - Sub-defect A: 16-character hash is custom FNV-1a-64, not SHA-256.
  - Sub-defect B: "4 ." admitted due to absence of token-length floor in `documentNormalizer.ts` / `deterministicEngine.ts`.
  - Sub-defect C: Orphaned findings suppressed via bare `continue` (Option 2 applied, Decision 1 pending).
- **G3 (Known-Positive Controlled Fixtures):** NOT STARTED (Blocked on G2).
- **G4 (Provenance End-to-End):** BLOCKED (Blocked on G2 close and fixture reproducibility).
- **G5 (Ingestion Hardening):** Standalone components certified, full integration pending G1 seam closure.
- **G6 (Production Deployment):** BLOCKED.
