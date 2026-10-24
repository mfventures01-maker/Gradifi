# HOEOS PRESERVATION MANIFEST

Generated: 2026-10-23T20:42:50.7866853+01:00
Output directory: C:\Projects\Gradifi\evidence\HOEOS-MANIFEST-20261023-204249

## 1. Identity

| Field | Value |
|---|---|
| Repository root | C:\Projects\Gradifi |
| Branch | clean-deploy |
| HEAD | d339a488debecbf420a96a5f2d6956f6c2e2effd |
| Git version | git version 2.36.1.windows.1 |
| PowerShell version | 5.1.19041.6456 |
| Node version | v22.23.3 |
| npm version | 10.9.9 |

## 2. Fresh enumeration (reconciled in this run, not inherited)

| Class | Count |
|---|---|
| Staged (index vs HEAD) | 32 |
| Unstaged (worktree vs index) | 8 |
| Untracked (excluding ignored) | 774 |
| Stash entries | 2 |
| Total git status lines | 151 |

Staged list:      git-staged.txt
Unstaged list:    git-unstaged.txt
Untracked list:   git-untracked.txt
Full status:      git-status.txt
Stash entries:    git-stash.txt

Staged per-path hashes:   staged-hashes.csv
Unstaged per-path hashes: unstaged-hashes.csv

## 3. Release candidate composite

The release candidate is the following composite, not a commit:

- Commit: d339a488debecbf420a96a5f2d6956f6c2e2effd (branch: clean-deploy)
- Staged additions: 32 paths (see git-staged.txt and staged-hashes.csv)
- Unstaged modifications: 8 paths (see git-unstaged.txt and unstaged-hashes.csv)
- Untracked evidence: 774 paths (see git-untracked.txt)

This composite exists only in this working tree. It is not reproducible from a
clone of d339a488debecbf420a96a5f2d6956f6c2e2effd without committing the unstaged modifications and the staged
additions. Whether to produce such a commit is a separate governance decision
and is not authorized by this manifest.

## 4. Key artifact hashes

See key-artifact-hashes.csv. Included:

- .gitignore
- package.json, package-lock.json
- playwright.config.ts
- The five src/services/verify/ files and CanonicalDocumentViewer.tsx
- G0 disposition, verification, and proposal
- G1 format matrix, browser acceptance, G2 canonical authority, final certification

## 5. Preservation statement

This manifest was generated read-only. No file in the repository was modified,
staged, unstaged, renamed, or deleted by this run. The only writes were to the
new directory C:\Projects\Gradifi\evidence\HOEOS-MANIFEST-20261023-204249.

The manifest itself is not part of the release candidate. It is an audit
artifact and will appear as untracked after this run.

## 6. What this manifest establishes

- The exact identity of the current repository state and the release-candidate
  composite.
- The fresh counts of staged, unstaged, untracked, and stashed content.
- The current SHA-256 of every key artifact the dispositions cite.

## 7. What this manifest does not establish

- That the composite is reproducible from a clone.
- That any gate has passed or failed.
- That the build succeeds (that is step 2 of the four-step plan, not this step).
- That any feature is releasable (that is the release-path inventory, step 2
  of the plan).

## 8. Controls satisfied

- No repository modification during collection.
- Fresh enumeration; prior counts not assumed.
- Untracked files recorded separately.
- Manifest generated outside the repository tree that it describes (the
  evidence directory is itself untracked; the manifest records this).

No files were changed by this run.
