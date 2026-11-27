# Edge Function Source Reconciliation

**Target branch:** `integration/gradifi-primary-2026-11-20`  
**Baseline commit:** `86f21fc0b772e2e62a481804e93a32ec6d58d1b3`  
**Scope:** `actor-onboarding`, `verify`, `ocr-processor` and shared dependencies

## Findings

### actor-onboarding

The merged source imports and invokes `provisionSubordinateActor` from `subordinate-recovery.ts`. The deployed v10 bundle inspected during this review contains only `index.ts` and `dean-recovery.ts`; its entrypoint retains the older inline subordinate-user creation path and does not invoke the recovery helper. This is a material functional and recovery-integrity drift. The integration source is retained as the intended implementation; no attempt was made to downgrade it to match production.

The integration entrypoint and helper are now covered by a source contract test that requires the subordinate recovery import and invocation and rejects the legacy `complete_actor_onboarding` call from the entrypoint.

### verify

The deployed v9 bundle's deterministic engine, document normalizer, plagiarism policy and shared extraction file matched the integration source byte-for-byte. The deployed entrypoint uses flattened local import paths while the integration source imports the canonical `_shared` modules. This is consistent with a bundler packaging transformation, not by itself a semantic discrepancy.

The deployed `types.ts` was missing the `RATE_LIMITED` member present in integration source. The integration type contract is retained. The source contract test now checks the canonical shared import graph and this provider status member.

The deployed bundle retrieval endpoint was intermittent during this review. The type and dependency findings above are grounded in successful retrievals; no claim is made that every deployed Verify entrypoint line was exhaustively compared.

### ocr-processor

The deployed v9 entrypoint imports the flattened `./extract.ts`; the merged source imports the canonical `../_shared/processing/extract.ts`. The deployed extraction module matched the shared integration source byte-for-byte. This is a packaging-path difference, not evidence of a different extraction algorithm.

The integration entrypoint remains on the single canonical shared extraction implementation. A redundant conditional that returned HTTP 422 in both branches was simplified without changing behavior. The source contract test prevents an accidental function-local extraction fork.

## Guardrails

- No production Edge Function was redeployed.
- No database migration or production data mutation was performed.
- No branch other than the existing integration branch is targeted.
- CI must validate this commit before any deployment decision.
- Production parity remains unproven until the reviewed integration functions are deployed under explicit approval and their deployed bundles are re-retrieved and compared.
