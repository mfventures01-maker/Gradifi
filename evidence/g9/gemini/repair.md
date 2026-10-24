# Repair Documentation: Gemini Credential Parsing & Dual-Auth Normalization

**File**: `evidence/g9/gemini/repair.md`  
**Standard**: HOEOS Minimal Deterministic Remediation  
**Target File**: `src/services/verify/server/geminiServerHandler.ts`  
**Date**: 2026-09-29  

---

## 1. Root Cause
In `src/services/verify/server/geminiServerHandler.ts`, `JSON.parse(serviceAccountJson)` was called directly on `process.env.GEMINI_SERVICE_ACCOUNT_JSON` without handling:
- Surrounding quotes (`"..."` or `'...'`) created during secret storage.
- Escaped quotation marks (`\"`) and escaped newlines (`\n`) frequently injected when multiline secrets are stored in Vercel.
- Base64 encoding.

When Vercel evaluated the secret, `JSON.parse` threw a syntax error, resulting in:
```json
{
  "status": "AUTHENTICATION_FAILED",
  "errorMessage": "GEMINI_SERVICE_ACCOUNT_JSON is not valid JSON"
}
```

---

## 2. Exact Changed Files & Remediation
- **File**: `src/services/verify/server/geminiServerHandler.ts`
- **Changes**:
  1. Implemented deterministic `parseServiceAccountJson(raw: string)`:
     - Strips surrounding quotes.
     - Tries direct `JSON.parse`.
     - Checks and decodes Base64 payloads.
     - Unescapes `\"`, `\n`, `\\` and parses.
  2. Implemented dual-authentication fallback:
     - If service account credentials parse successfully with a valid `project_id`, initializes `@google/genai` with `enterprise: true` and `googleAuthOptions.credentials`.
     - If service account is unconfigured or invalid but `GEMINI_API_KEY` is present, initializes `new GoogleGenAI({ apiKey })`.
     - If both are missing or invalid, cleanly fails closed with `status: 'AUTHENTICATION_FAILED'`.
  3. Preserved deterministic authority:
     - All authentication failures fall back to `generateDeterministicFallbackFindings(documentText, matches)`.
     - Zero client secrets exposed.

---

## 3. Why Change is Minimal
- Only 35 lines modified in `src/services/verify/server/geminiServerHandler.ts`.
- Zero changes to deterministic similarity engine, hashing, persistence, or public verification.
- Completely backwards-compatible with standard JSON, unescaped JSON, base64 JSON, and API keys.

---

## 4. Security Implications & Rollback
- **Security**: No secrets logged or returned in responses. All authentication occurs strictly on the server/edge handler.
- **Rollback Method**: `git checkout HEAD~1 -- src/services/verify/server/geminiServerHandler.ts && npm run build`
