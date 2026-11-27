# Gradifi Verify Gemini Agent Activation Report

**Disposition: CONNECTED BUT NOT CERTIFIED**

**Target branch:** \`integration/gradifi-primary-2026-11-20\`  
**Latest implementation commit:** \`70dce928273e0e2bc13703b7c803fe365f6c7fba\`  
**PR #35:** Must remain open and draft.

## Objective

Activate Gemini as the Evidence Interpretation and Student Guidance Agent while preserving G5-DETERMINISTIC-v1 as the sole authority for deterministic verification evidence.

## STATIC evidence

- Existing \`POST /api/verify/gemini\` endpoint retained.
- Canonical server credential path is \`GEMINI_API_KEY\`.
- Legacy \`GEMINI_SERVICE_ACCOUNT_JSON\` fallback path removed from the canonical handler to prevent two competing authentication paths.
- API-key adapter selects \`gemini-3.5-flash\`.
- Google model documentation currently lists \`gemini-3.5-flash\` as generally available. Model lifecycle documentation lists its release on 19 May 2026 and retirement no earlier than 19 May 2027:
  https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/model-versions
- \`.env.example\` contains a placeholder, not a usable credential. The actual Vercel secret value was not available through the connected GitHub tools and was not read or exposed.

## STRUCTURAL evidence

- \`api/verify/gemini.ts\` preserves the existing provider-federation request and adds the authenticated \`agent_chat\` action.
- Agent chat requires a Supabase bearer session.
- The server validates the session, resolves an active \`identity_actors\` record, retrieves the receipt server-side, validates receipt integrity, and verifies the associated completed \`verification_runs\` row.
- Individual receipt access is checked against the authenticated creator; institutional access is checked against the actor's institution and school scope.
- Before/after context is loaded from two authorized receipts and requires the corrected run to be a child of the original run.
- Gemini receives bounded evidence context: G5 findings, student/source passages, source identifiers, selected source metadata, hashes/version metadata, and optional verified before/after metrics.
- The agent endpoint has no database write, receipt mutation, score mutation, hash mutation, or verification-status mutation path.
- The agent returns advisory text and model metadata only.
- The student-facing \`GeminiEvidenceAgentPanel\` is wired into the existing Gradifi Verify result page and requires an authenticated session.
- G5 score calculation, deterministic findings, evidence hashes, and receipt persistence contracts were not changed.
- Provider error classification now distinguishes authentication failure, rate limiting, timeout, network failure, runtime unavailability, schema failure and inference failure.
- The existing Gemini reasoning cache now keys on the complete serialized input rather than a short text prefix and match count.

## RUNTIME evidence

**Not executed.** The actual deployed \`GEMINI_API_KEY\` could not be inspected or exercised from the available GitHub connection. No claim of successful provider authentication is made.

## CERTIFICATION

Not certified. Runtime authentication, repeated fixed-input requests, live receipt authorization, provider outage handling and browser acceptance remain open.

## Change boundary

- No production credential changes.
- No production database writes.
- No deployment command.
- No merge.
- PR #35 remains open and draft.
