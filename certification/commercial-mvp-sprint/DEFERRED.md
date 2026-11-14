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

## Dependency audit disposition

The sprint's production dependency audit gate now passes with **0 production advisories**. The validated lockfile upgrades include `fast-xml-parser@5.12.1`, `dompurify@3.4.17`, `vite@6.4.6`, `rimraf@6.1.4` and `source-map-js@1.2.2`.

The full development-tool audit still reports 15 advisories (8 moderate, 5 high, 2 critical). The remaining critical/high findings are concentrated in `vitest@2.1.9` / `tinypool` and `@vercel/node@15.0.0`. The suggested fixes require major-version changes (Vitest 5.1.0 and an `@vercel/node` version change). They are not being forced into this sprint without compatibility testing. This means the production dependency audit is clean, but the development/build toolchain is not fully advisory-free.

## Receipt binds canonical text, not original binary bytes

The browser currently extracts the uploaded DOCX/PDF and sends canonical `documentText` to the server-run endpoint. The server recomputes G5 over that submitted canonical text and derives the receipt hashes from the server result. It does **not** independently re-extract the original uploaded binary file bytes. The receipt therefore binds the canonical text submitted to the server, not an independently attested DOCX/PDF binary. Server-side binary ingestion and binary-to-canonical extraction attestation remain production-hardening work.
