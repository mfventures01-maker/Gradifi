# Gate D Correction Design

## Contract Verdict
C (The global `window.__GRADIFI_VERIFY_RESULT__` is never written by any production source file or test helper).

## Root Cause
The base certification spec at `e2e/g4-live-provider-certification.spec.ts:104-109` expects `window.__GRADIFI_VERIFY_RESULT__` to be populated with the engine result object, but production application code never assigns this global, causing `appResult === null`.

## Correction Class
**Spec-DOM**
- **Change:** Rewrite the spec's result acquisition from DOM evidence only.
- **Justification:** Spec's stated intent is rendered-evidence certification ("HOEOS P4 Standard: Evidence Before Assumption, Production Is Sacred").

## What the spec will still prove after the change
- Viewer visibility (`[data-testid="canonical-document-viewer"]`).
- Human Academic Review Boundary disclaimer visibility.
- Absence of forbidden verdict strings (`PLAGIARIZED`, `GUILTY`, `PROVEN PLAGIARISM`).
- Canonical document text extraction from the rendered viewer DOM (>500 chars).
- Provenance non-fixture invariant on derived findings against `FORBIDDEN_FIXTURE_IDS`.
- Rendered highlight mark count > 0.
- Integer validity and bounds of mark start/end offsets.
- Strict slice equality between mark text and canonical document text slice.
- Attribution correspondence between marks and findings.
- Absence of test seams throughout execution.

## What the spec will no longer prove
- Engine result object's structural internals published on `window.__GRADIFI_VERIFY_RESULT__` beyond what is rendered in the DOM.

## Synthesis Disclaimer
No synthesized engine result is being presented; the spec asserts against rendered DOM output only.
