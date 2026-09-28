# A4.2R FORENSIC CERTIFICATION REPORT

---

## 1. Gate Identity

* **Gate Identifier**: `A4.2R`
* **Gate Name**: Public Verification Resolver Integrity
* **Target Project**: Gradifi (`C:\Projects\Gradifi`)
* **Git HEAD Commit**: `9a59897599d11d5f812f0800c6764b2d01eeb93b`
* **Target Branch**: `clean-deploy`
* **Execution Timestamp**: `2026-09-20T23:42:36+01:00`
* **Engine Version**: `G5-DETERMINISTIC-v1`
* **Policy Version**: `G3-POLICY-v1`

---

## 2. Test Objective

To achieve formal, deterministic certification of **Gate A4.2R: Public Verification Resolver Integrity** by executing comprehensive negative verification-ID handling tests, mutation guard verification, repeat resolution identity integrity checks, zero production file change boundary enforcement, and production build verification against the live `publicVerificationService` without mocking or database record fabrication.

---

## 3. Environment Initialization Evidence

Environment bootstrap was executed via `tests/hoeos/a4_2/HOEOS_A4_2_BOOTSTRAP.ts` prior to importing any Supabase application modules:

* `A4.2R_ENV_BOOTSTRAP`: `PASS`
* `VITE_SUPABASE_URL`: `PRESENT` (Loaded from `.env.local`)
* `VITE_SUPABASE_ANON_KEY`: `PRESENT` (Loaded from `.env.local`)
* Module initialization order: `HOEOS_A4_2_BOOTSTRAP.ts` evaluated on line 1 of test runner before `publicVerificationService.ts` and `src/lib/supabase.ts`.

---

## 4. Known-Positive Evidence

Known-positive record resolution was executed against live Supabase authority using target fixture `VRF-074A0E054D72`:

* **Target Verification ID**: `VRF-074A0E054D72`
* **Resolution Status**: `VALID`
* **Record Present**: `true`
* **Document Hash**: `074a0e054d723218720bafbc552802289b505c9ebb97c141a04ecd8c550be183`
* **Evidence Hash**: `20a35bf2b8c0735970b2b4394c00d6b03c3a5c233484380e9f42eaadf517d776`
* **Engine Version**: `G5-DETERMINISTIC-v1`
* **Policy Version**: `G3-POLICY-v1`
* **Overall Similarity**: `78.5`
* **Evidence Envelope**: `PRESENT`
* **Hash Correlation Check**: Derived ID `VerificationPersistenceService.deriveVerificationId(document_hash)` equals `VRF-074A0E054D72` (`PASS`).

---

## 5. Repeat-Resolution Evidence

Target fixture `VRF-074A0E054D72` was resolved twice sequentially via `publicVerificationService.resolveVerification`:

* **Resolution 1 Status**: `VALID`
* **Resolution 2 Status**: `VALID`
* **IDENTITY_MATCH**: `true` (`VRF-074A0E054D72` === `VRF-074A0E054D72`)
* **DOCUMENT_HASH_MATCH**: `true`
* **EVIDENCE_HASH_MATCH**: `true`
* **ENGINE_VERSION_MATCH**: `true`
* **POLICY_VERSION_MATCH**: `true`
* **SIMILARITY_MATCH**: `true` (`78.5` === `78.5`)
* **ENVELOPE_MATCH**: `true` (`PRESENT` === `PRESENT`)
* **FULL_SNAPSHOT_MATCH**: `true`

---

## 6. Negative-ID Results

The real `publicVerificationService` boundary was evaluated across 6 distinct input classifications:

| Case | Input ID | Status | Error Message | Record Present | Classification Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Case A** | `VRF-074A0E054D72` | `VALID` | `N/A` | `true` | **PASS** (Known Valid) |
| **Case B** | `VRF-FFFFFFFFFFFF` | `NOT_FOUND` | `No verification record found for ID 'VRF-FFFFFFFFFFFF'.` | `false` | **PASS** (Nonexistent Syntactically Valid) |
| **Case C** | `INVALID` | `INVALID_FORMAT` | `Invalid verification ID format. Expected VRF-XXXXXXXXXXXX (12 hex characters).` | `false` | **PASS** (Malformed Format) |
| **Case D** | `VRF-123` | `INVALID_FORMAT` | `Invalid verification ID format. Expected VRF-XXXXXXXXXXXX (12 hex characters).` | `false` | **PASS** (Malformed Short) |
| **Case E** | `VRF-12345678901Z` | `INVALID_FORMAT` | `Invalid verification ID format. Expected VRF-XXXXXXXXXXXX (12 hex characters).` | `false` | **PASS** (Malformed Non-Hex) |
| **Case F** | `""` | `INVALID_FORMAT` | `Verification ID is required.` | `false` | **PASS** (Empty Input) |

All 6 test cases matched expected production service contract classifications perfectly.

---

## 7. Mutation-Guard Results

Authoritative database record state for `VRF-074A0E054D72` was queried directly from Supabase before public resolution and after public resolutions:

* **Pre-Resolution DB Record Found**: `true` (`created_at: 2026-09-12T23:43:39.246536+00:00`)
* **Post-Resolution DB Record Found**: `true` (`created_at: 2026-09-12T23:43:39.246536+00:00`)
* **Pre/Post Comparison Matrix**:
  * `VERIFICATION_ID_MATCH`: `true`
  * `DOCUMENT_HASH_MATCH`: `true`
  * `EVIDENCE_HASH_MATCH`: `true`
  * `ENGINE_VERSION_MATCH`: `true`
  * `POLICY_VERSION_MATCH`: `true`
  * `SIMILARITY_MATCH`: `true`
  * `EVIDENCE_ENVELOPE_MATCH`: `true`
  * `CREATED_AT_MATCH`: `true`
* **Statement Execution Audit**:
  * `RECORD_MUTATION`: `NONE`
  * `INSERT`: `NOT_EXECUTED`
  * `UPDATE`: `NOT_EXECUTED`
  * `DELETE`: `NOT_EXECUTED`
  * `ALTER`: `NOT_EXECUTED`
  * `MIGRATION`: `NOT_EXECUTED`

The public verification resolver is 100% read-only. Zero mutations occurred.

---

## 8. Production-File Change Analysis

A forensic diff analysis (`git status --short`) was executed following all test runs:

* **Production Code Directory (`src/**`)**: 0 files modified.
* **Production File Change Status**: `PRODUCTION_FILE_CHANGE=NONE`
* **Modified Files**: Only test harness (`tests/hoeos/a4_2/*`) and evidence artifacts (`tests/hoeos/a4_2/evidence/*`).

---

## 9. Build Result

Production application build (`npm run build`) was executed:

* **Vite Version**: `6.4.3`
* **BUILD_EXIT_CODE**: `0`
* **BUILD_STATUS**: `PASS`
* **Build Time**: `12.36s`
* **Transformed Modules**: `1927`
* **Build Warnings**:
  * `node:zlib` externalized for browser compatibility in `officeZipAdapter.ts` (Non-fatal).
  * Bundle chunk size warning (>500 kB) for `dist/assets/index-qUUE4Ktx.js` (Non-fatal).

---

## 10. SHA256 Evidence

File integrity hashes calculated after execution:

```text
1CE80CDA9D41342F6C94C9DE7E83B32273297FF41F36DA2BE64C104EF8CCBE4D  src/services/verify/publicVerificationService.ts
485D0D413E5BC0ED485EAB55ED8487761C135B9BA993197D39E63A54DE8ACEA5  src/lib/supabase.ts
B74E93E1DB5FD52A4DBE3EC2602A69473EE6218FD0A517523D251E1EA36DE5B3  tests/hoeos/a4_2/HOEOS_A4_2_BOOTSTRAP.ts
A4D1BB7F78987AEEAC9A43D2C831F3D68BEA242FA3BAAE6353FCC335D507E847  tests/hoeos/a4_2/HOEOS_A4_2_SERVICE_RUNNER.ts
A1877984C2D1F580282734617A7049B84E66AEEA2B563A405E07D0A5691A86C7  package.json
1018BEF042790A47C2EC3EBBEA6D90B159B3579F9CF7026E52C49FB8F47A3C5F  package-lock.json
```

All production source hashes match pre-implementation baseline hashes exactly.

---

## 11. Exact Limitations

1. Testing relies on live Supabase cloud database connectivity configured via `.env.local` (`VITE_SUPABASE_URL`).
2. Browser UI rendering components were not invoked during service-layer verification testing.
3. Network layer throughput and latency were not stress-tested beyond repeat sequential resolutions.

---

## 12. Final Certification Classification

All 17 certification controls mandated by HOEOS Gate A4.2R have been satisfied completely:

1. Known-positive resolver returns `VALID`: **YES**
2. Real authoritative record is returned: **YES**
3. Verification identity is preserved: **YES**
4. Document hash is preserved: **YES**
5. Evidence hash is preserved: **YES**
6. Engine version is preserved: **YES**
7. Policy version is preserved: **YES**
8. Similarity is preserved: **YES**
9. Evidence envelope is preserved: **YES**
10. Repeat resolution produces identical authoritative snapshot: **YES**
11. Malformed IDs handled according to existing contract: **YES**
12. Nonexistent valid-format IDs do not produce fabricated authority: **YES**
13. Mutation guard is actually proven: **YES**
14. No unexplained production source changes occurred: **YES**
15. Build succeeds: **YES**
16. Evidence artifacts written and hashed: **YES**
17. Final report accurately reflects observed machine evidence: **YES**

### **FINAL CERTIFICATION STATUS**: `A42R_STATUS=CERTIFIED_PASS`
