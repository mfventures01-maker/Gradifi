# Gradifi Verify Gemini Agent Browser Acceptance

**Disposition: NOT RUN**

**Target:** Authenticated student result experience on \`/verify\`  
**Implementation branch:** \`integration/gradifi-primary-2026-11-20\`

## Preconditions

- A real individual user has completed signup and email confirmation.
- The user has an active identity actor and personal workspace.
- A real verification receipt is persisted and integrity-valid.
- The server has a valid \`GEMINI_API_KEY\`.
- The browser is using the current integration-branch build.

## Browser scenarios

| ID | Scenario | Expected behavior | Status |
|---|---|---|---|
| GA-01 | Open a persisted verification result while signed in | Gemini Evidence Assistant appears below the correction guidance | NOT RUN |
| GA-02 | Open the result without a session | Assistant requests sign-in; private receipt context is not returned | NOT RUN |
| GA-03 | Ask why a finding was flagged | Answer references the supplied student/source passages and finding | NOT RUN |
| GA-04 | Ask for a passage comparison | Answer distinguishes student wording from source wording | NOT RUN |
| GA-05 | Ask how to correct a citation issue | Guidance recommends attribution, quotation or genuine paraphrasing | NOT RUN |
| GA-06 | Ask for a disguised rewrite or evasion method | Agent refuses evasion and explains responsible academic practice | NOT RUN |
| GA-07 | Ask about before/after results after a corrected receipt exists | Agent explains only the metrics from the two authorized receipts | NOT RUN |
| GA-08 | Ask Gemini to change a score or receipt | Agent states it cannot change authoritative verification records | NOT RUN |
| GA-09 | Use another user's receipt ID | Server rejects access | NOT RUN |
| GA-10 | Use an invalid or tampered receipt | Server rejects context retrieval | NOT RUN |
| GA-11 | Simulate Gemini authentication failure | UI reports authentication failure without changing G5 result | NOT RUN |
| GA-12 | Simulate HTTP 429, timeout and provider outage | UI reports the corresponding provider status; G5 result remains available | NOT RUN |
| GA-13 | Refresh the page after chat | Original verification result and receipt remain unchanged | NOT RUN |
| GA-14 | Inspect browser network requests | No Gemini API key or service-role credential appears in browser requests | NOT RUN |

## Evidence to capture

For each passing scenario, retain:
- Browser test name and result.
- Verification ID used (synthetic or authorized test record).
- Request correlation/time and returned provider status.
- Requested and actual model identifiers.
- Screenshot or Playwright trace for the visible assistant.
- Before/after snapshots of deterministic score, finding IDs, document hash, evidence hash and receipt ID proving no mutation.

## Certification rule

Browser acceptance is not complete from a screenshot of the panel alone. The authenticated receipt lookup, actual Gemini response, ownership rejection, provider failure states and unchanged deterministic result must all be demonstrated in a real browser run.
