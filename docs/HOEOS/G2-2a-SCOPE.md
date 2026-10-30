# G2-2a - Specification and Investigation Scope

**Gate:** G2-2a â€” Specification and investigation
**Authorised by:** G2-1B closure commit 5495f873903b46b00d83a2270ba51d978027bcae
**Opens upon:** Commit of this signed scope to docs/HOEOS/G2-2a-SCOPE.md
**Prepared under:** HOEOS 2.0, Part II Evidence Classification, Part VI Gate Packet Template.
**Revision:** Amendment 1 (mechanical source-hash enforcement), Amendment 2 (strengthened independent recomputation), Amendment 3 (authorisation sequence).
**Status:** SIGNED â€” awaiting commit.

---

## §1 â€” Gate identity

**Gate:** G2-2a â€” Specification and investigation.

| Gate | Status |
|---|---|
| G2-1B | CLOSED at 5495f873903b46b00d83a2270ba51d978027bcae |
| **G2-2a** | **This gate** â€” specification and investigation only |
| G2-2b | Not authorised â€” requires separate owner signature |
| G2-3 | Not authorised |
| G2-4 | Not authorised |
| G2-9 | Not authorised |

**What G2-2a is:** The gate that produces the specification artefacts G2-2b requires before it can be proposed for authorisation. It writes a matching policy, T1-T6 executable specifications, a recomputation harness, an implementation specification, and a gate packet. It does not modify the engine, the threshold, or the scoring formula.

**What G2-2a is not:** It is not implementation. It is not calibration. It is not an accuracy claim. It does not authorise G2-2b.

---

## §2 â€” Objective

G2-2a determines, through specification and investigation only:

1. **What constitutes a qualifying source-supported match** under DEC-01.
2. **How T1-T6 will be measured** in G2-2b.
3. **That the B1-B5 SQC and LMC results are reproducible from recorded logs alone.**
4. **What G2-2b must change** to satisfy DEC-01 through DEC-04.
5. **What evidence G2-2b will produce** as its gate packet.

---

## §3 â€” Deliverables

**Deliverable 1 â€” Matching policy document.** File: docs/HOEOS/MATCHING-POLICY.md. Version 1.0. Contains all ten §4.1 sections. Commits in a single-responsibility commit.

**Deliverable 2 â€” T1-T6 executable specifications.** Location: C:\Projects\Gradifi-evidence\g2-2a-20261030T205020Z\specifications\. One file per test. Contains input fixtures, expected output, pass condition, falsification condition.

**Deliverable 3 â€” Independent recomputation harness.** Location: C:\Projects\Gradifi-evidence\g2-2a-20261030T205020Z\harness\. TypeScript. Reads B1-B5 logs. Reproduces SQC and LMC within Â±0.15 pp. Does not import deterministicEngine.ts.

**Deliverable 4 â€” Implementation specification.** Location: C:\Projects\Gradifi-evidence\g2-2a-20261030T205020Z\IMPLEMENTATION-SPEC.md. Names specific change sites. States regression evidence and migration plan.

**Deliverable 5 â€” G2-2a gate packet.** Location: C:\Projects\Gradifi-evidence\g2-2a-20261030T205020Z\G2-2a-CLOSURE-PACKET.md. Seventeen sections. §16 = PASS on specification, DEFERRED on implementation.

---

## §4 â€” Acceptance criteria

### §4.1 â€” Matching policy document

Must contain: (1) Token definition. (2) Token position identity. (3) Qualifying match definition. (4) Source-supported binding. (5) Phrase-match contribution. (6) Overlap deduplication. (7) Repeated-occurrence handling. (8) Rounding rules (Math.round(x * 1000) / 10 or equivalent). (9) Denominator definition. (10) Versioning.

**Falsification:** A reader cannot recompute uniqueMatchedCoverage for B1-B5 from the policy plus the recorded logs without needing the policy author's intent.

### §4.2 â€” T1-T6 specifications

Each contains: input fixture, expected output, pass condition, falsification condition.

- **T1 Common-word control:** Shared stopwords/high-frequency terms must produce qualifying coverage 0% or near-0%. "Near-0%" stated as a number.
- **T2 Repeated-token control:** Repeated positions handled deterministically. State once or once-per-occurrence.
- **T3 Phrase-span structural validity:** startChar <= endChar, within bounds, not NaN. Bounds-checking pseudocode.
- **T4 Source provenance binding:** Every counted position traceable to a sourceId and a source position.
- **T5 Independent recomputation:** Harness reproduces B1-B5 within Â±0.15 pp.
- **T6 Multi-paragraph offsets:** Three or more paragraphs, ten or more sentences, correct global offsets.

**Falsification:** A specification without a falsification condition is not adopted.

### §4.3 â€” Independent recomputation harness (Amendment 2)

Harness must independently establish:

1. **Token identity.** Independent choice, not an import of tokenize.
2. **Source-position binding.** Rebuilt, not trusted.
3. **Duplicate elimination.** Rebuilt, not trusted.
4. **Numerator and denominator.** Separate values, computed by harness.
5. **Rounding behaviour.** Math.round(x * 1000) / 10 as its own function.

**Pass condition:** Agreement within Â±0.15 pp on every B1-B5 fixture for SQC and LMC, plus intermediate-agreement on token count, source binding, numerator, denominator.

**Falsification:** Any fixture where metric or intermediate values disagree beyond tolerance BLOCKS closure.

### §4.4 â€” Implementation specification

Must name change sites in deterministicEngine.ts with function name and line range. Cite matching policy section. State regression evidence. State migration plan. State what is out of scope.

### §4.5 â€” G2-2a gate packet

Seventeen sections. §16 = PASS on specification, DEFERRED on implementation. §17 names G2-2b prerequisites.

---

## §5 â€” Evidence location

All G2-2a artefacts except the matching policy live in:

C:\Projects\Gradifi-evidence\g2-2a-20261030T205020Z\

The G2-1B evidence directory is frozen. The harness reads from it, never writes to it.

---

## §6 â€” Boundary declarations

G2-2a does **not** authorise:

1. Any change to src/. Engine hash remains 48353296a3fbb9714bb2607485011c5616f212666c22719229e77824b104c169.
2. Any change to the threshold. 40% remains operational.
3. Any change to the scoring formula.
4. Any production release. Production remains HARD HOLD.
5. Any commit to docs/HOEOS/ except the matching policy document.
6. Any authorisation of G2-2b.

### §6.1 â€” Mechanical source-hash enforcement (Amendment 1)

1. Pre-investigation source manifest. GENERATED. File: source-manifest-pre.txt. Hash: d3b1140fb33f87411b66130d8a0842fc891beb798e329071ee414c28d4f6121e. File count: 169. Total bytes: 1,182,462.
2. Manifest structure: sha256 | size_bytes | relative_path, sorted by path.
3. Manifest hash recorded as source-manifest-pre.hash.txt.
4. Automated final comparison: source-manifest-post.txt, diff required empty.
5. Hard failure condition: if pre and post differ by one byte, G2-2a is BLOCKED.
6. Scope: src/ only.

**Rationale:** git status does not show files added-then-removed, unstaged-then-restaged content changes, mtime-preserved edits, or submodules/symlinks.

---

## §7 â€” Context from G2-1B and preserved artefacts

From G2-1B: closure packet (hash 22588705...), signed register (hash 47048be1...), evidence directory (frozen at 98c2076f...), DEC-01 through DEC-06, §17 item 5b.

Preserved artefacts (decision at G2-1B-ARTEFACT-DECISION.md, hash 899bc659...):

| Artefact | Status |
|---|---|
| Three run directories | QUARANTINED |
| run_crossrail_test.ts | ADOPTED AS REFERENCE |
| threshold-decision.json | ADOPTED AS G2-9 INPUT |
| fixture-results.json | QUARANTINED |

Three notes: (1) layer 2 fixtures need re-baselining under DEC-01. (2) T3 may cite run_crossrail_test.ts as prior art. (3) G2-9 threshold proposals are pre-registration, not policy.

---

## §8 â€” Exit condition

G2-2a CLOSED when all five deliverables pass §4, recorded in gate packet, gate packet committed. Deliverable 1 committed to docs/HOEOS/MATCHING-POLICY.md with all ten §4.1 sections. Deliverables 2-4 in evidence directory, hashed, inspected. Deliverable 5 has seventeen sections, §16 = PASS, §17 names G2-2b. Source manifests pre and post identical.

A successful G2-2a does not open G2-2b.

---

## §9 â€” The G2-2b boundary

G2-2b requires a separate owner signature authorising: specific engine change, migration plan, T1-T6 execution, acceptance criteria. The G2-1B signature (DEC-06) authorised metric definitions, not implementation. G2-2a's investigation is authorised by G2-1B closure implicitly. G2-2b requires a new, explicit signature.

What cannot happen: G2-2a's completion being inferred as G2-2b authorisation.

---

## §10 â€” Authorisation sequence (Amendment 3)

Five steps:

1. Owner signs this scope (§10.1).
2. Signed scope hashed and preserved as G2-2a-SCOPE-SIGNED.md; SHA-256 recorded in signed-scope.txt.
3. Signed scope committed to docs/HOEOS/G2-2a-SCOPE.md. G2-2a's opening act.
4. Matching policy separately committed to docs/HOEOS/MATCHING-POLICY.md. Cites the signed scope's hash.
5. Investigation proceeds. Other four deliverables in evidence directory.

Authority relationship: The signed scope is the authority for G2-2a's work. The scope commit and matching policy commit are two acts of governance.

### §10.1 â€” Signature block

**Owner:** HOEOS
**Date:** 2026-10-30
**Decision:** [X] APPROVE WITH AMENDMENTS (amendments 1, 2, 3 incorporated as above)
**Signature class:** [X] DIGITAL
**Authorised work:** G2-2a investigation per §§1-9, with amendments 1, 2, 3.
**Not authorised:** G2-2b, engine change, threshold change, production release.

---

## §11 â€” What this scope does not authorise

No engine change. No threshold change. No scoring formula change. No production release. No authorisation of G2-2b. No commit to docs/HOEOS/ except MATCHING-POLICY.md. No modification of the G2-1B evidence directory. No promotion of any quarantined artefact to evidence status.

Production remains HARD HOLD. G2-2a may open. G2-2b may not.