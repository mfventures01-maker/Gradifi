# G0 DISPOSITION VERIFICATION

Read-only review of the claims in `G0-DISPOSITION.md` against on-disk evidence.

- Disposition reviewed: `G0-DISPOSITION.md`
- Disposition SHA-256: `1aba7ef6beaabfebe1395d2576f12815fd95a018be05befc12741ff21617b7fe`
- Verification run: 2026-10-23T13:57:33.7507943+01:00
- Current HEAD: `d339a488debecbf420a96a5f2d6956f6c2e2effd`
- Current staged count: 32

## Verdict summary

- **CONTRADICTED**: 1
- **UNVERIFIABLE-FROM-CURRENT-EVIDENCE**: 1
- **UNVERIFIABLE-IN-THIS-PASS**: 1
- **VERIFIED**: 17

## Claim-by-claim table

| ID | Claim | Evidence | Verdict | Note |
|---|---|---|---|---|
| C1 | BASELINE_SHA_CITED = d339a488debecbf420a96a5f2d6956f6c2e2effd | git cat-file -t d339a488...; git log -1 | **VERIFIED** | current HEAD=d339a488debecbf420a96a5f2d6956f6c2e2effd |
| C2 | BASELINE_ANCESTOR_OF_HEAD = True | git merge-base --is-ancestor | **VERIFIED** | HEAD equals baseline; trivially an ancestor |
| C3 | BASELINE_SUBJECT = Gate D: base runtime certification PASS | git log -1 --format=%s | **VERIFIED** | actual subject=Gate D: base runtime certification PASS |
| C4 | Eight tracked files modified (list in disposition section 2) | git diff --name-only | **CONTRADICTED** | missing: e2e/g4-live-provider-certification.spec.ts |
| C5 | src/components/verify/CanonicalDocumentViewer.tsx = a1d01bd4fd3c4e8f... | Get-FileHash on current file | **VERIFIED** | actual=a1d01bd4fd3c4e8f |
| C6 | src/services/verify/deterministicEngine.ts = 21eba8eca8625643... | Get-FileHash on current file | **VERIFIED** | actual=21eba8eca8625643 |
| C7 | src/services/verify/documentNormalizer.ts = b5d62497a11f24bc... | Get-FileHash on current file | **VERIFIED** | actual=b5d62497a11f24bc |
| C8 | src/services/verify/universalIngestionService.ts = f6d300db01010d88... | Get-FileHash on current file | **VERIFIED** | actual=f6d300db01010d88 |
| C9 | src/services/verify/verifyCoreService.ts = dd618fad9eeb3f05... | Get-FileHash on current file | **VERIFIED** | actual=dd618fad9eeb3f05 |
| C10 | playwright.config.ts = 3384550B... | Get-FileHash on current file | **VERIFIED** | actual=3384550bbd9723ed |
| C11 | 32-path staged set | git diff --cached --name-only | **VERIFIED** | staged count=32 |
| C12 | docs/HOEOS/GRADIFI-AI-CONSTITUTION.md = 9dd557ab17e26f7c... | Get-FileHash on current file | **VERIFIED** | actual=9dd557ab17e26f7c |
| C13 | docs/HOEOS/GRADIFI-CONSTITUTION.md = 3003f5bc051ca2e7... | Get-FileHash on current file | **VERIFIED** | actual=3003f5bc051ca2e7 |
| C14 | git diff --cached --check exits 0 | git diff --cached --check | **VERIFIED** | exit=0 |
| C15 | tests/g1_format_matrix.test.ts.bak = CBE4F474... | Get-FileHash on current file | **VERIFIED** | actual=cbe4f4740fa063cc |
| C16 | Two stash entries preserved | git stash list | **VERIFIED** | stash count=2 |
| C17 | Line 2 of GRADIFI-AI-CONSTITUTION.md no longer ends in 20 20 | tail-byte inspection | **VERIFIED** | tail=6E 29 |
| C18 | Untracked count at last capture was 769 | prior git status output in session log | **UNVERIFIABLE-FROM-CURRENT-EVIDENCE** | The disposition cites a number from a specific session capture that is not re-derivable from current state; current untracked count will differ. |
| C19 | Format matrix hashes in 08-g1-format-matrix-results.json match on-disk fixtures | JSON contents vs Get-FileHash on disk | **UNVERIFIABLE-IN-THIS-PASS** | Cross-check requires hashing the 8 non-DOCX fixtures and comparing to the JSON; not performed here. The DOCX hash is confirmed identical to the fixture on disk from prior verification. |
| C20 | The two .temp tests and the third .temp test are in the staged set | git diff --cached --name-only | **VERIFIED** | staged .temp matches=3 |

## What this verification does and does not do

- It tests each factual claim against a git command, a Get-FileHash call, or a file read performed at the time of the verification.
- It does NOT modify the disposition. The disposition remains as written at SHA-256 1aba7ef6beaabfebe1395d2576f12815fd95a018be05befc12741ff21617b7fe.
- It does NOT stage, commit, deploy, rename, delete, or edit any repository file.
- It does NOT close G0. G0 remains BLOCKED.
- It DOES record which claims are verified, contradicted, or unverifiable, so the operator can correct the disposition before relying on it.


---

## Amendment 1 — C4 corrected (verification-script defect)

**Date:** 2026-10-23
**Reason:** C4 was flagged CONTRADICTED by the verification pass. The flag was produced by a defect in the verification script itself: it used `git diff --name-only` (unstaged changes only) to check for `e2e/g4-live-provider-certification.spec.ts`, whose change is **staged**, not unstaged. The correct command for "all changes vs HEAD" is `git diff HEAD --name-only`.

**Re-check (read-only):**

Command: `git diff HEAD --name-only` compared to the nine paths the disposition enumerates.

Result: all nine `PRESENT`:
- src/services/verify/universalIngestionService.ts
- src/services/verify/deterministicEngine.ts
- src/services/verify/documentNormalizer.ts
- src/services/verify/verifyCoreService.ts
- src/components/verify/CanonicalDocumentViewer.tsx
- e2e/g4-live-provider-certification.spec.ts
- package.json
- package-lock.json
- playwright.config.ts

Additional facts from re-check:
- Total tracked modifications vs HEAD: 40 = 32 staged + 8 unstaged
- `e2e/g4-live-provider-certification.spec.ts` is staged, +51 −6

**Corrected C4 verdict:** VERIFIED. The original CONTRADICTED marking was wrong and is superseded.

**Session-level note:** this is the seventh script defect in this session. Six prior defects are documented in the session log; this one (#7) uses the wrong diff command. The verification process was designed to catch such defects, and it did — its own.

**Effect on disposition:** none. The disposition's section 2 table was accurate; its section 7 prose ("eight unstaged") was imprecise and is amended separately in G0-DISPOSITION.md.
