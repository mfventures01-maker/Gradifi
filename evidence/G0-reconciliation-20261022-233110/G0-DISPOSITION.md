# G0 DISPOSITION (operator must complete)

**Gate:** G0 — Reproducible Frozen State
**Reconciliation run:** 20261022-233110
**Output directory:** evidence/G0-reconciliation-20261022-233110

## Captured facts (do not edit — cite or dispute)

- HEAD_SHA:            d339a488debecbf420a96a5f2d6956f6c2e2effd
- WORKTREE_STATE_HASH: 8c7e34e2c435eeb6774405ea89043970676591e7f5dd97ec4451926f93c5546e
- BASELINE_SHA_CITED:  d339a488debecbf420a96a5f2d6956f6c2e2effd
- BASELINE_STATUS:     RESOLVED
- BASELINE_ANCESTOR_OF_HEAD: True
- STAGED_INDEX_EMPTY:  True
- STASH_LIST_EMPTY:    False
- UNTRACKED_FILE_COUNT: 721
- UNTRACKED_LIST_SHA256: 31806a1c023a4715fd4fad2cecde1a21a305b56cae782e9d6ef21acebf96415c
- BASELINE_WORKTREE_DIVERGENCE_ON_INGESTION: True

## Reused-evidence references

See euse-register.txt in this directory. Cite each reused directory by name
and DirHash, or explicitly decline:

- [ ] Cite: ______________________  Hash: ______________________
- [ ] Cite: ______________________  Hash: ______________________
- [ ] Decline all prior G0 evidence — rationale: ______________________

## Decision (operator fills exactly one)

DECISION: HOLD        # PASS | FAIL | HOLD — operator must set this

BASELINE_COMMIT: d339a488debecbf420a96a5f2d6956f6c2e2effd

EVIDENCE_GAP: BASELINE_WORKTREE_DIVERGENCE_ON_INGESTION — G1 repair is outside the cited baseline; operator must decide whether post-baseline repairs are in scope before PASS can be recorded.

## Rationale

(Operator records why the decision follows from the captured facts and the
HOEOS G0 acceptance criterion: a reproducible frozen state.)

## Explicitly out of scope for this disposition

- G1 format matrix completeness (deferred to G1 rescoping)
- G2 canonical identity contract (untouched)
- G3 known-positive plagiarism proof (untouched)
- G4 live-provider certification (untouched)
