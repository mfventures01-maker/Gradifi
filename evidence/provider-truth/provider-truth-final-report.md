# Provider Truth Certification

## 1. Exact Source
- **Branch**: `clean-deploy`
- **Commit SHA**: `0cd6485eb6a3b4c2d86d8e6d2817ca36ebbe7cf5`
- **Working Tree State**:
  - The 4 certified files were cleanly staged and committed in commit `0cd6485eb6a3b4c2d86d8e6d2817ca36ebbe7cf5`:
    - `src/services/verify/types.ts`
    - `src/services/verify/server/geminiServerHandler.ts`
    - `src/services/verify/server/nemotronServerHandler.ts`
    - `src/services/verify/aiFederation.ts`
  - Staging integrity verified with `git diff --cached --check` and `git diff --cached --stat`.
  - Zero unintended modifications introduced.

## 2. Semantic Repairs
- **Canonical ProviderTruthStatus**:
  Established the single authoritative vocabulary in `src/services/verify/types.ts`:
  ```typescript
  export type ProviderTruthStatus =
    | 'VERIFIED'
    | 'EMPTY_RESULT'
    | 'AUTHENTICATION_FAILED'
    | 'TIMEOUT'
    | 'NETWORK_ERROR'
    | 'RUNTIME_UNAVAILABLE'
    | 'INFERENCE_FAILED'
    | 'SCHEMA_INVALID';
  ```
  Legacy statuses (`INFERENCE_VERIFIED`, `REQUEST_FAILED`, `SCHEMA_FAILED`) were eliminated from the server and federation contract.
- **Gemini**:
  - Bound credential resolution strictly to `GEMINI_SERVICE_ACCOUNT_JSON` via server-side GoogleAuth JWT client.
  - Strict finding validation using `validateAIFindingSchema()`.
  - Empty findings array `[]` deterministically produces `status: 'EMPTY_RESULT'`, `findings: []`, and `fallback_used: false`.
  - Parsing errors produce `status: 'INFERENCE_FAILED'`.
  - Schema violations produce `status: 'SCHEMA_INVALID'`.
  - HTTP 401/403 map to `AUTHENTICATION_FAILED`.
  - Timeouts and AbortErrors map to `TIMEOUT`.
  - Network connection failures map to `NETWORK_ERROR`.
  - HTTP 429/502/503/504 map to `RUNTIME_UNAVAILABLE`.
- **Nemotron**:
  - Configured with identical `ProviderTruthStatus` mapping and schema validation.
  - Upstream NVIDIA API errors (e.g., HTTP 503 Service Unavailable) are preserved as `RUNTIME_UNAVAILABLE` without masking.
  - Empty results return `EMPTY_RESULT` without invoking fallback.
- **Fallback Provenance**:
  - Fallback is strictly provenance-visible. Both `fallback_used` (snake_case) and `fallbackUsed` (camelCase) are explicitly emitted.
  - When fallback is invoked, `modelProvider` is marked as `'deterministic_fallback'`, and `status` retains the genuine underlying provider failure (`AUTHENTICATION_FAILED`, `TIMEOUT`, `NETWORK_ERROR`, `RUNTIME_UNAVAILABLE`, `INFERENCE_FAILED`, or `SCHEMA_INVALID`).
  - Fallback findings never carry `modelProvider = 'gemini'` or `'nemotron'`, preventing any masquerading.
- **Empty-Result Semantics**:
  - A successful provider execution returning `[]` is recognized as a valid negative inference (`EMPTY_RESULT`).
  - `EMPTY_RESULT` suppresses fallback invocation and preserves `findings: []`.
- **Federation Semantics**:
  - `aiFederation.ts` aggregates provider truth states without reinterpreting failures or empty results as `VERIFIED`.
  - Deterministic authority boundary is preserved: provider outputs remain advisory and cannot mutate document hashes, evidence hashes, or verification identifiers.

## 3. Static Evidence
- **TypeScript Server Compilation**:
  - Command: `npx tsc --noEmit -p tsconfig.server.json`
  - Output: Exit code 0 (0 errors).
- **Client & Server Typecheck**:
  - Command: `npm run typecheck` (`typecheck:client` && `typecheck:server`)
  - Output: Exit code 0 (0 errors).
- **Targeted Semantic Test Battery (PT-01 through PT-20)**:
  - Command: `npx tsx scripts/providerTruthSuite.ts`
  - Results:
    - `PT-01`: Valid Gemini findings -> `VERIFIED`, `gemini`, `fallback_used: false` [PASS]
    - `PT-02`: Gemini empty array -> `EMPTY_RESULT`, `findings: []`, `fallback_used: false` [PASS]
    - `PT-03`: Gemini malformed JSON -> `INFERENCE_FAILED` [PASS]
    - `PT-04`: Gemini invalid schema -> `SCHEMA_INVALID` [PASS]
    - `PT-05`: Gemini 401/403 -> `AUTHENTICATION_FAILED` [PASS]
    - `PT-06`: Gemini timeout -> `TIMEOUT` [PASS]
    - `PT-07`: Gemini network failure -> `NETWORK_ERROR` [PASS]
    - `PT-08`: Gemini runtime unavailable (429/503) -> `RUNTIME_UNAVAILABLE` [PASS]
    - `PT-09`: Valid Nemotron findings -> `VERIFIED`, `nemotron`, `fallback_used: false` [PASS]
    - `PT-10`: Nemotron empty array -> `EMPTY_RESULT`, `findings: []`, `fallback_used: false` [PASS]
    - `PT-11`: Nemotron malformed JSON -> `INFERENCE_FAILED` [PASS]
    - `PT-12`: Nemotron invalid schema -> `SCHEMA_INVALID` [PASS]
    - `PT-13`: Nemotron 401/403 -> `AUTHENTICATION_FAILED` [PASS]
    - `PT-14`: Nemotron timeout -> `TIMEOUT` [PASS]
    - `PT-15`: Nemotron network failure -> `NETWORK_ERROR` [PASS]
    - `PT-16`: Nemotron unavailable -> `RUNTIME_UNAVAILABLE` [PASS]
    - `PT-17`: Fallback preserves underlying failure -> `RUNTIME_UNAVAILABLE`, `deterministic_fallback`, `fallback_used: true` [PASS]
    - `PT-18`: Provider failure cannot become VERIFIED -> Verified across all failure modes [PASS]
    - `PT-19`: Provider empty result cannot trigger fallback -> `EMPTY_RESULT` preserved [PASS]
    - `PT-20`: Federation preserves independent provider truth -> Gemini + Nemotron truth intact [PASS]
  - Overall battery result: 20/20 PASS (100%).
- **Production Build**:
  - Command: `npm run build`
  - Output: Exit code 0 (`dist/` and `runtime/` built successfully).

## 4. Fresh Runtime Evidence
- **Runtime Build Command**: `npm run build:server`
- **Inspected Artifacts**:
  - `runtime/src/services/verify/server/geminiServerHandler.js`
  - `runtime/src/services/verify/server/nemotronServerHandler.js`
  - `runtime/src/services/verify/types.js`
- **Runtime Inspection Confirmation**:
  - Verified strings: `VERIFIED`, `EMPTY_RESULT`, `AUTHENTICATION_FAILED`, `TIMEOUT`, `NETWORK_ERROR`, `RUNTIME_UNAVAILABLE`, `INFERENCE_FAILED`, `SCHEMA_INVALID`.
  - Verified fallback flags: `fallback_used`, `fallbackUsed`, and `deterministic_fallback`.
  - Verified schema tokens: `sourcePassage`, `studentPassage`.
  - Verified zero occurrences of legacy `INFERENCE_VERIFIED` fallback conversion.

## 5. Deployment Evidence
- **Deployment Command**: `npx vercel --prod --yes`
- **Deployment ID**: `dpl_6e72Mzm54igyycpCGzeEcd6w6Hfs`
- **Deployment URL**: `https://gradifi-222abe1o8-raphael-taires-projects.vercel.app`
- **Production Alias**: `https://gradifi.vercel.app`
- **Ready State**: `READY`
- **Exact Source SHA**: `0cd6485eb6a3b4c2d86d8e6d2817ca36ebbe7cf5`
- **Source Correlation**: Source commit pushed to `origin clean-deploy` prior to Vercel production deployment.

## 6. Production Gemini Probe
- **Probe A (Empty Matches Payload)**:
  - Endpoint: `POST https://gradifi.vercel.app/api/verify/gemini`
  - HTTP Status: `200`
  - Response Body:
    ```json
    {
      "status": "EMPTY_RESULT",
      "findings": [],
      "fallback_used": false,
      "fallbackUsed": false,
      "modelProvider": "gemini"
    }
    ```
  - Provider Truth Status: `EMPTY_RESULT`
  - Model Provider: `gemini`
  - Fallback State: `fallback_used: false`, `fallbackUsed: false`
  - Interpretation: Verified that clean negative query yields `EMPTY_RESULT` without invoking fallback.
- **Probe B (Positive Verbatim Match Payload)**:
  - Endpoint: `POST https://gradifi.vercel.app/api/verify/gemini`
  - HTTP Status: `200`
  - Response Body:
    ```json
    {
      "status": "VERIFIED",
      "findings": [
        {
          "type": "exact_overlap",
          "severity": "high",
          "confidence": 100,
          "studentPassage": "Glycolysis is the metabolic pathway that converts glucose into pyruvate, generating adenosine triphosphate (ATP) in the cytoplasm.",
          "sourcePassage": "Glycolysis is the metabolic pathway that converts glucose into pyruvate, generating adenosine triphosphate (ATP) in the cytoplasm.",
          "explanation": "The student text matches the source text verbatim.",
          "sourceId": "SRC-PROD-001",
          "requiresHumanReview": true,
          "modelProvider": "gemini"
        }
      ],
      "fallback_used": false,
      "fallbackUsed": false,
      "modelProvider": "gemini"
    }
    ```
  - Provider Truth Status: `VERIFIED`
  - Model Provider: `gemini`
  - Fallback State: `fallback_used: false`, `fallbackUsed: false`
  - Interpretation: Live production Gemini service account authenticates, infers verbatim overlap, validates finding schema, and outputs genuine `VERIFIED` status without fallback.

## 7. Production Nemotron Probe
- **Probe (Live Endpoint Invocation)**:
  - Endpoint: `POST https://gradifi.vercel.app/api/verify/nemotron`
  - HTTP Status: `200`
  - Response Body:
    ```json
    {
      "status": "RUNTIME_UNAVAILABLE",
      "findings": [],
      "fallback_used": false,
      "fallbackUsed": false,
      "errorMessage": "NVIDIA API unavailable: HTTP 503",
      "modelProvider": "nemotron"
    }
    ```
  - Provider Truth Status: `RUNTIME_UNAVAILABLE`
  - Model Provider: `nemotron`
  - Fallback State: `fallback_used: false`, `fallbackUsed: false`
  - Interpretation: Upstream NVIDIA API returned HTTP 503 Service Unavailable. The repaired production handler preserved the exact provider failure `RUNTIME_UNAVAILABLE` with `fallback_used: false`, rather than masking the 503 as `VERIFIED` or generating fallback findings masquerading as Nemotron inference.

## 8. Negative/Fallback Semantics
- **Provider Failure Preservation**: In both local runtime and live production, upstream provider failures (`HTTP 503`, authentication errors, timeouts) remain explicitly reported under their true semantic status (`RUNTIME_UNAVAILABLE`, `AUTHENTICATION_FAILED`, `TIMEOUT`).
- **Fallback Provenance**: When deterministic fallback is enabled, `fallback_used: true`, `modelProvider: 'deterministic_fallback'`, and `status` reflects the underlying failure cause.
- **No False VERIFIED State**: Proved under all 20 test battery conditions and live production probes that provider failures and empty results never produce `VERIFIED` or `INFERENCE_VERIFIED`.

## 9. Certification Matrix

| Gate | Evidence | Status |
|------|----------|--------|
| Source | Git SHA `0cd6485eb6a3b4c2d86d8e6d2817ca36ebbe7cf5` | PASS |
| TypeScript | `npx tsc --noEmit -p tsconfig.server.json` (0 errors) | PASS |
| Tests | `npx tsx scripts/providerTruthSuite.ts` (20/20 PASS) | PASS |
| Build | `npm run build` && `npm run build:server` | PASS |
| Fresh Runtime | `runtime/` inspection confirmed clean tokens & types | PASS |
| Exact Commit | Commit `0cd6485eb6a3b4c2d86d8e6d2817ca36ebbe7cf5` verified | PASS |
| Deployment | `dpl_6e72Mzm54igyycpCGzeEcd6w6Hfs` on Vercel READY | PASS |
| Gemini Production Probe | Live `VERIFIED` (positive) & `EMPTY_RESULT` (negative) | PASS |
| Nemotron Production Probe | Live `RUNTIME_UNAVAILABLE` on 503 preserved, 0 fallback masking | PASS |
| Provider Truth | Canonical `ProviderTruthStatus` invariant satisfied | PASS |
| Fallback Provenance | Explicit flags (`fallback_used: false`, etc.) verified | PASS |
| Certification | Full evidence chain machine-verified | PASS |

## 10. Final Disposition

CERTIFIED
