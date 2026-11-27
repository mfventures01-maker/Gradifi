# Gradifi Verify Gemini Agent Runtime Test Report

**Disposition: NOT RUN / RUNTIME CERTIFICATION OPEN**

**Branch:** \`integration/gradifi-primary-2026-11-20\`  
**Implementation commit:** \`70dce928273e0e2bc13703b7c803fe365f6c7fba\`

| Test | Expected result | Evidence status |
|---|---|---|
| Gemini server credential present | Server reads \`GEMINI_API_KEY\` without exposing it | STATIC path present; actual runtime secret unavailable |
| Actual model invocation | Successful request to \`gemini-3.5-flash\` | NOT RUN |
| Invalid API key | \`AUTHENTICATION_FAILED\` | Classification logic implemented; live test NOT RUN |
| HTTP 429 | \`RATE_LIMITED\` | Classification logic implemented; live test NOT RUN |
| HTTP 504 / timeout | \`TIMEOUT\` | Classification logic implemented; live test NOT RUN |
| HTTP 502/503 | \`RUNTIME_UNAVAILABLE\` | Classification logic implemented; live test NOT RUN |
| Network failure | \`NETWORK_ERROR\` | Classification logic implemented; live test NOT RUN |
| Malformed response | \`SCHEMA_INVALID\` or \`INFERENCE_FAILED\` | Classification logic implemented; live test NOT RUN |
| Receipt ownership | Cross-user receipt access rejected | STRUCTURAL checks present; adversarial runtime test NOT RUN |
| Receipt integrity | Invalid receipt rejected before context is sent to Gemini | STRUCTURAL check present; runtime test NOT RUN |
| Before/after lineage | Unrelated receipts rejected | STRUCTURAL check present; runtime test NOT RUN |
| Ten repeated fixed-input requests | Ten real provider responses with model trace | NOT RUN |
| G5 authority isolation | Agent cannot modify deterministic result or receipt | STRUCTURAL: agent endpoint is read-only and returns text/metadata only; adversarial runtime test NOT RUN |

## Unit tests added

\`tests/geminiAgentServerHandler.test.ts\` covers:
- Authentication, rate-limit, timeout, provider-unavailable and inference-failure classification.
- Invalid API-key classification.
- Extraction of bounded G5 passages and source identity from a persisted deterministic envelope.
- Absence of mutation-oriented fields in the extracted agent context.

These tests have been authored but were **not executed in this session**.

## Runtime blocker

The GitHub connection does not expose Vercel environment secret values or a live Vercel function invocation facility. The actual configured \`GEMINI_API_KEY\` was not inspected, copied, changed or tested. A configured variable name is not proof of a valid credential.

No GitHub Actions workflow run was observed for the implementation commit at the time this report was written. The Vercel status check was pending. No deployment was initiated intentionally.

## Certification rule

Do not mark Gemini active until a real server-side request authenticates, reports the actual model, returns an evidence-grounded answer, and the ten-request and failure-path tests pass.
