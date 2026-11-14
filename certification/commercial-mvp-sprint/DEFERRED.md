# Verify Commercial MVP — Deferred HOEOS Findings

These items remain visible and are not counted as MVP PASS evidence.

## EPUB OCR fixture

- Test: `tests/g1_epub_ocr.test.ts`
- Fixture: `tests/fixtures/ingestion/image_only.epub`
- Observed CI failure: `fflate` reports `invalid zip data` while opening EPUB package entries.
- Impact: EPUB OCR path is not certified by this sprint.
- Decision: defer EPUB support from the commercial MVP acceptance gate. The current sprint prioritizes the committed real DOCX fixture and PDF ingestion regression coverage.
- Rule: do not convert this failure into a PASS or claim all 17 document formats are certified.

## External provider credential coverage

The CI runner intentionally has no provider API secrets. In the observed run:
- Crossref and OpenAlex returned verified results.
- CORE and Google Books correctly returned authentication failures without credentials.
- Unpaywall returned an empty result.

The deterministic federation gate therefore requires the two credential-free baseline providers and records optional provider availability separately. This does not certify paid/credentialed provider integrations.

## Receipt persistence environment

The CI runner intentionally has no Supabase service-role key. The expected behavior is:
- Server-side Verify result can be returned.
- Receipt persistence returns `UNAVAILABLE`.
- UI displays `NO PUBLIC RECEIPT`.
- No fake QR or public receipt is issued.

A positive persisted-receipt runtime gate still requires a dedicated isolated Supabase environment and test credentials. Production remains untouched.

## Public endpoint abuse controls

The server-run endpoint currently has a per-process in-memory request limit. Serverless instances do not share that map, so it is a best-effort demo throttle, not a distributed abuse-control boundary. Before a public production release, add shared rate limiting (or an equivalent API gateway control), abuse monitoring and a user/session policy for provider-cost protection.
