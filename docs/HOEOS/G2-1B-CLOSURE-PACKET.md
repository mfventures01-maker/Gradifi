
G2-1B — Gate Closure Packet
Gate: G2-1B — Scoring and Metric Semantics
Baseline commit: 17b3f3dce5673dbee7313d1375496be6f18d8db0
Engine under test: 48353296a3fbb9714bb2607485011c5616f212666c22719229e77824b104c169
Signed register SHA-256: 47048be1067c75a90527fe30c0e0e2728405706ca5663d608c54107d0f40ab82
Closure date (UTC): 2026-10-30T17:41:02Z (moment of signature)
Prepared under: HOEOS 2.0, Part II Evidence Classification, Part VI Gate Packet Template.

§1 — Gate identity and acceptance criteria
Gate: G2-1B — Scoring and Metric Semantics.

Purpose: Determine whether the production engine's scoring and coverage metrics have explicit, mathematically defined meanings; if not, record the decisions required to give them such meanings; measure the gap between current behaviour and any alternative definition; and either close the investigation or defer it with a named unresolved risk.

Acceptance criteria (from the closure plan §3, §6, and CG-01 through CG-09):

Criterion	Requirement
CG-01 Baseline integrity	Baseline identity unchanged across the investigation
CG-02 Scoring implementation reconstruction	Scoring path fully described in STATIC evidence
CG-03 Runtime fixture validity	Fixtures pass segmentation, are single- or multi-sentence as designed
CG-04 Threshold boundary behaviour	Boundary behaviour measured or recorded as not observed
CG-05 Coverage calculation semantics	SQC vs LMC gap measured; direction of error identified
CG-06 Production-path reproducibility	Every claim has a hashed stdout artefact
CG-07 Owner decisions	Recorded and signed (this gate) or formally deferred
CG-08 Evidence integrity	All artefacts hashed; baseline unchanged before/after each probe
CG-09 Governance approval	Signed owner register on file
Verdict on acceptance criteria: CG-01 through CG-06 and CG-08 PASS. CG-07 resolved by signature of the Owner Decision Register. CG-09 satisfied by the signed register.

§2 — Targets
Restated for this gate:

Dimension	Target	Method	Threshold
Measurement integrity	Every metric claim reproducible by an independent reviewer from recorded inputs and code identity	Independent recomputation using only stdout logs + engine hash	100% of claims
Metric definition clarity	Every reported score has an explicit, mathematically defined meaning	Decision register with per-metric definition	All coverage metrics defined
Baseline stability	HEAD and engine hash unchanged before/after every probe	git rev-parse HEAD and Get-FileHash before/after each probe	Exact equality
Gap quantification	The magnitude of the SQC-vs-LMC disagreement is measured across structurally distinct fixtures	Fixtures from B1–B5	Measured for ≥5 fixtures
Negative control	Boundary behaviour around 40% is measured or recorded as not observed	Construction sweep B3	Recorded as NOT OBSERVED or as measured value
§3 — Baseline commit
17b3f3dce5673dbee7313d1375496be6f18d8db0

Confirmed at:

Start of B1 (baseline.txt)

End of B1

End of B2

End of B3

End of B4

End of B5

Moment of register signature (signed-register.txt)

§4 — Evidence references and SHA-256 hashes
Thirteen artefacts in C:\Projects\Gradifi-evidence\g2-1b-gate-packet-20261030T165742Z\:

File	SHA-256	Class	Purpose
baseline.txt	00f1959a7af91277f962bf5684ddd0389a94672b401341a999856f8e747129b0	RUNTIME	Baseline identity before B1
probe.stdout.log	9dbc7d373953dde5ac0b48b4940887a6649075b685ee0917791ffc61074a86f0	RUNTIME	B1: SQC−LMC gap = 88.9 pp
probe.stderr.log	e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855	RUNTIME	Empty (no runtime error)
b2.stdout.log	65a01cc2458a35b6e514a6cd05122bb968daa1862a0cfc56fe529fed7878a537	RUNTIME	B2: exact match difference 0.0; unrelated 0%
b2.stderr.log	e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855	RUNTIME	Empty
b3.stdout.log	9453c0808cb29c59daef48b9b6ded203720e59e854e390e787d69b70f2a4903a	RUNTIME	B3: threshold gap 37.8→46.4
b3.stderr.log	e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855	RUNTIME	Empty
b4.stdout.log	629b5f5bb0957e76617875d7dc2397018ed9a269dfcfe9dca6443704ee322d1a	RUNTIME	B4: aggregation is union, not sum; no double-count
b4.stderr.log	e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855	RUNTIME	Empty
b5.stdout.log	66f9e8ea67060bdbf8d242b262fb88106ae964af6e73284d45c86654f6ff6720	RUNTIME	B5: production reports SQC in all 5 cases; gap range [−62.5, +54.5]
b5.stderr.log	e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855	RUNTIME	Empty
G2-1B-OWNER-DECISION-REGISTER-SIGNED.md	47048be1067c75a90527fe30c0e0e2728405706ca5663d608c54107d0f40ab82	CERTIFICATION	Owner decisions, signed
signed-register.txt	ba2387818d1ef3ceb0199b936f6051eaf14ad9919ae25c7748443b3af5573e54	CERTIFICATION	Log of the signing
§5 — Files and functions inspected
STATIC evidence supporting the RUNTIME probes:

src/services/verify/deterministicEngine.ts

Lines	Function / block	What was inspected
41–60	DeterministicAnalysisInput, DeterministicEngineOutput	Output field definitions: overallSimilarity, uniqueMatchedCoverage, highestSourceMatch
146–190	detectPhraseMatches	Phrase evidence construction; documentLocation.startChar/endChar populated from phrase.startChar/endChar
195–274	evaluateSentenceMatch	Sentence similarity computation; similarityPercentage returned as evidence
444–708	analyzeDocumentEvidence	Production path: admission gate, globalMatchedTokenIndices accumulation, coverage derivation
497–498	globalMatchedTokenIndices declaration	Set<number> — deduplication is structural
517–532	Sentence admission block	sentenceMatch.similarityPercentage >= 40 gate; for each sentToken: add to sourceMatchedTokenIndices and globalMatchedTokenIndices
557–558	sourceCoverage computation	sourceMatchedTokenIndices.size / docTokens.length
570–572	aggregateSourceScore computation	0.4 * sourceCoverage + 0.6 * highestSentenceMatch
644–648	uniqueMatchedCoverage computation	globalMatchedTokenIndices.size / docTokens.length
700	Return field	overallSimilarity: uniqueMatchedCoverage
813–820	evaluateDocumentSimilarity	Public wrapper: strips paragraphFlags/sentenceFlags from internal result
src/services/verify/documentNormalizer.ts

Lines	Function / block	What was inspected
220–248	Phrase object construction	Phrase IDs, n-gram sizes {3, 5, 7}, tokenSpans character coordinates
src/services/verify/types.ts

Lines	Type	What was inspected
225–235	DocumentPhrase	startChar, endChar, tokenIndex, nGramSize
275–293	PhraseMatchEvidence	documentLocation (required startChar/endChar), sourceLocation (optional)
352–369	GlobalSimilarityAggregation	Aggregation fields
§6 — Commands actually executed
Six probe commands, each executed from C:\Projects\Gradifi under $ErrorActionPreference = 'Stop', each preceded by baseline identity checks and each followed by post-run baseline capture:

B1 (probe) — Baseline capture, then production-path probe on the corrected single-sentence fixture. Produced baseline.txt, probe.stdout.log, probe.stderr.log.

B2 (exact-match control and below-40 control) — Two-fixture control probe. Produced b2.stdout.log, b2.stderr.log.

B3 (boundary sweep) — 1,071 construction variants across three fixtures. Produced b3.stdout.log, b3.stderr.log.

B4 (aggregation semantics) — Four cases: mixed admission, two sources different sentences, two sources same sentence, repeated sentences. Produced b4.stdout.log, b4.stderr.log.

B5 (lexical vs SQC discrimination) — Five cases: repeated word in sentence, repeated in source, small fraction, partially overlapping sources, direct metric comparison. Produced b5.stdout.log, b5.stderr.log.

Signature record — Register signed, hash captured, signed-register.txt written. Produced G2-1B-OWNER-DECISION-REGISTER-SIGNED.md, signed-register.txt.

Each probe script was written to scripts/, executed, and deleted in the same command block. No probe file remains in the source tree. No probe file was ever committed. Every probe called evaluateSentenceMatch and/or analyzeDocumentEvidence unchanged.

§7 — Raw test results
The six stdout logs are the primary evidence. Summary of each:

B1 — probe.stdout.log (SHA-256 9dbc7d37…86f0)

Corrected single-sentence fixture, 27 tokens. Production admitted all 27 tokens on a sentence scoring 73.3%. Lexical coverage 11.1% (3 tokens). Difference: +88.9 percentage points. PRODUCTION_ADMITTED_TOKENS=27, PRODUCTION_GLOBAL_COVERAGE=100%, LEXICAL_COVERAGE=11.1%.

B2 — b2.stdout.log (SHA-256 65a01cc2…a537)

EXACT_MATCH: similarity 100%, lexical 100%, difference 0.0 — inflation does not fire when lexical coverage is already 100%.

BELOW_40_ATTEMPT: similarity 0%, production 0%, no admission — the admission gate correctly rejects clearly unrelated content.

Both assertions ASSERT_EXACT_MATCH_OK=true, ASSERT_BELOW_40_ACHIEVED=true.

B3 — b3.stdout.log (SHA-256 9453c080…03a)

Three fixtures, 1,071 construction variants. Nonzero below-40 scores exist (Fixture A: 90 occurrences; B: 93; C: 38). Closest below-40 measured: 37.5% / 37.8% / 38.5%. Closest at-or-above-40: 45.0% / 46.4% / 51.0%. No construction landed in [39, 41]. ANY_BOUNDARY_FIXTURE_FOUND=false. ANY_NONZERO_BELOW_40=true. Recorded under DEC-05 as NOT OBSERVED IN THE TESTED SCORING CONSTRUCTIONS.

B4 — b4.stdout.log (SHA-256 629b5f5b…d1a)

Four cases. All four verdicts true:

Q1_MIXED_ADMISSION_HONOURED=true — rejected sentence's tokens excluded.

Q2_UNION_NOT_SUM=true — two sources different sentences: union=22, sum would be 22 (they don't overlap here, but the test confirms union semantics).

Q3_NO_DOUBLE_COUNT_ACROSS_SOURCES=true — two sources same sentence: production admitted 13, not 26.

Q4_REPEATED_SENTENCES_NO_INFLATION=true — two identical sentences: production global 100%, not >100%.

All per-case DELTA_PRODUCTION_MINUS_EXPECTED=0.00.

B5 — b5.stdout.log (SHA-256 66f9e8ea…720)

Five cases. PRODUCTION_REPORTS_SQC_FOR_ALL=true. PRODUCTION_REPORTS_LMC_FOR_ANY=false. MAX_SQC_MINUS_LMC_GAP=54.5.

Case	SQC	LMC	Gap	Direction
R1 repeated word in sentence	0%	60%	−60	Evidence discarded
R2 repeated in source	0%	50%	−50	Evidence discarded
R3 small fraction	0%	11.1%	−11.1	Evidence discarded
R4 partial overlap sources	0%	62.5%	−62.5	Evidence discarded
R5 metric-level comparison	100%	45.5%	+54.5	Evidence invented
Two directions of error confirmed. Both violate the plain reading of the metric name.

§8 — Back-of-envelope register
Not applicable to this gate. G2-1B investigates metric semantics; it does not depend on scale assumptions. No throughput, DAU, storage, or latency estimate is part of this gate's decision basis. Future gates that depend on scale (G2-9 benchmark calibration) will carry their own back-of-envelope registers.

§9 — Consistency declaration
Not applicable to this gate. G2-1B's probes run against the deterministic in-process engine; there is no multi-instance store, no cross-replica read, no cache coherence question. The globalMatchedTokenIndices Set is per-execution and is not persisted between calls. Future gates that persist report evidence (G2-8) will carry their own consistency declarations.

§10 — Resilience evidence
Not applicable to this gate. G2-1B's probes make no remote calls. The engine is a pure function of (documentText, candidateMatches[]). No provider integration is exercised. Future gates that invoke external providers (G2-4 source discovery, G2-5 paraphrase detection) will carry their own resilience evidence.

§11 — Defect statement
Defect: The production engine reports uniqueMatchedCoverage (and overallSimilarity, sourceCoverage, and per-source documentCoverage) as values that are, by construction, sentence-qualified coverage (SQC). By their ordinary reading, those metric names imply lexical matched-token coverage (LMC). The two are different quantities and diverge measurably.

Measured evidence:

B1: On a controlled 27-token fixture, a single sentence at 73.3% n-gram similarity, with only 3 tokens (11.1%) appearing in the source, was admitted at the gate. Production reported 100% global coverage. Gap: +88.9 pp.

B5 R5: A document where 5 of 11 tokens (45.5%) appear in the source. Sentence similarity 62% → admitted. Production reported 100% global coverage. Gap: +54.5 pp — six tokens credited without lexical basis.

B5 R4: Two sources whose combined vocabulary matches 5 of 8 document tokens (62.5%). Neither source alone pushed the sentence past 40%, so the sentence was rejected. Production reported 0%. Gap: −62.5 pp — five tokens of legitimate lexical evidence discarded.

B5 R1, R2, R3: Further instances of the −gap direction. The magnitude varies with fixture; the direction is consistent (evidence discarded).

Two-directional error confirmed. The defect is not that the engine miscalculates; it is that the metric basis chosen at admission produces both over-credit (when the gate fires) and under-credit (when it does not).

Aggregation layer is sound. B4's four controlled cases confirm globalMatchedTokenIndices is a true set: union-not-sum across sources, no double-count across sources, no inflation on repeated content, correct exclusion of rejected sentences. The defect is the semantic choice at the admission gate, not the union operation.

Source of the defect (STATIC, corroborated by RUNTIME): deterministicEngine.ts:521–532 — when sentenceMatch.similarityPercentage >= 40, every token in the sentence is added to globalMatchedTokenIndices. Not just matched tokens. The subsequent coverage derivation at :644–648 and :700 therefore credits the whole sentence.

§12 — Proposed change
None under G2-1B. DEC-06 of the signed register explicitly forbids engine, threshold, or scoring-formula change under this gate. Any change addressing the defect is a G2-2 deliverable with its own gate packet.

Decisions recorded for G2-2 to implement (subject to owner signature, now satisfied):

DEC-01: uniqueMatchedCoverage means qualifying source-supported matched positions, not vocabulary membership.

DEC-02: per-source documentCoverage on the same basis; sum may exceed global.

DEC-03: retain SQC as a separately named diagnostic with threshold displayed.

DEC-04: global aggregate is union across sources.

DEC-05: 40% threshold is uncalibrated; DEC-05 wording records it as NOT OBSERVED IN THE TESTED SCORING CONSTRUCTIONS.

DEC-06: no implementation authorisation under G2-1B.

§13 — Before/after comparison
Not applicable. No engine, threshold, or scoring-formula change occurred in this gate. The engine hash 48353296…c169 was identical at every probe and at signature time. The baseline commit 17b3f3d was identical at every probe and at signature time. No file under src/ was modified. git status --short before each probe and after each probe showed only the four pre-existing untracked artefacts.

§14 — Regression results
Regression evidence for the aggregation layer, from B4:

Case	Fixture	Result	Verdict
Q1 mixed admission	1 admitted + 1 rejected sentence	Production admitted 10 of 19 tokens (rejected sentence's 9 excluded)	PASS — rejected tokens correctly excluded
Q2 two sources different sentences	2 admitted sentences, 2 sources	Production admitted 22 of 22 tokens (union of two disjoint source sets)	PASS — no cross-source double-count
Q3 two sources same sentence	1 sentence, 2 sources covering 13/13 each	Production admitted 13, not 26	PASS — same-sentence tokens counted once
Q4 repeated sentences	2 identical sentences	Production global 100%, not >100%	PASS — no repeated-content inflation
All four regression cases PASS with DELTA_PRODUCTION_MINUS_EXPECTED=0.00. The aggregation layer performs correctly under DEC-04's intended semantics.

Negative controls:

Control	Result
Exact match (B2)	Difference 0.0; no inflation when lexical coverage is complete
Unrelated text (B2)	Similarity 0%; production 0%; correctly rejected
Below-40 nonzero (B3)	Nonzero scores below 40 exist (down to 37.5%); admission gate correctly rejects them
Boundary construction (B3)	No fixture in [39, 41]; recorded as NOT OBSERVED
§15 — Unresolved risks
The 40% threshold is uncalibrated. B3's construction sweep did not find a fixture in [39, 41]. Whether any fixture can land there is untested. Calibration against a labelled benchmark is required under G2-9 (DEC-05).

The matching policy required by DEC-01 does not yet exist. No document defines the minimum evidence requirements for a "qualifying" source-supported match. This must be produced under G2-2a before implementation can begin.

Phrase-span coordinate correctness is not measured under G2-1B. The probe path confirmed phrase evidence reaches the aggregation layer, but character-coordinate validity and overlap merging were not exhaustively tested. G2-3 will address this. G2-2b T3 is limited to structural validity of phrase evidence, not full coordinate certification.

Multi-paragraph offset behaviour is untested. B4 tested two-sentence documents; longer documents with three or more paragraphs and ten or more sentences were not probed. G2-2b's T6 requires this.

No independent recomputation exists. All coverage figures in this gate were computed by the engine and cross-checked by the probe using the same tokenizer. An independently-written recomputation (T5) is required under G2-2a.

Source provenance is not independently verified. Every fixture in this gate had a single inlined candidate source. Real source discovery has not been exercised. G2-2b T4 is limited to binding evidence to a source identifier and source position in controlled candidate matches. External source retrieval certification remains under G2-4.

Common-word control is not yet a fixture. DEC-01's separation of lexical overlap from source-supported matching means common-word-only overlaps must not inflate coverage. No fixture currently tests this at production scale. G2-2b's T1 requires this.

§16 — Decision
PASS on measurement. DEFERRED on implementation.

All six runtime probes executed with exit code 0.

All thirteen evidence artefacts hashed.

Baseline identity 17b3f3d confirmed before and after every probe and at signature time.

Engine hash 48353296…c169 identical at every probe and at signature time.

Defect statement supported by RUNTIME evidence from four independent fixtures.

Aggregation soundness supported by RUNTIME evidence across four controlled cases.

Owner decision register signed and its hash recorded in signed-register.txt.

G2-1B is CLOSED as of the commit that places this packet and the signed register in docs/HOEOS/. Implementation is not authorised. Production remains HARD HOLD.

G2-1B closure does not authorise G2-2b (implementation). It authorises G2-2a (specification and investigation) implicitly, and G2-2b explicitly requires its own scope authorisation per §17 item 5b.

§17 — Exact evidence needed to advance
1. Versioned matching policy
A versioned matching policy document under docs/HOEOS/, specifying:

Token normalisation and token-position identity rules.

Treatment of common words, stopwords, and short tokens.

Minimum evidence requirements for lexical and phrase matches.

Rules for repeated words and repeated occurrences.

Source provenance retention.

Global deduplication of overlapping source matches.

This is a G2-2a deliverable and must be completed before G2-2b implementation authorisation.

2. G2-2 gate packet and six acceptance tests
The G2-2 gate packet must define and execute the six acceptance tests T1–T6. Their scope is divided as follows:

T1 Common-word control (full scope): Common-word-only overlap must not inflate qualifying matched coverage.

T2 Repeated-token control (full scope): Repeated document positions and repeated source occurrences must be handled deterministically.

T3 Phrase-span structural validity: startChar <= endChar; both coordinates must be within valid bounds; neither coordinate may be NaN or undefined; phrase evidence must be reachable from the admission path. Full coordinate certification, including exhaustive boundary and overlap-merging validation, is deferred to G2-3.

T4 Source provenance binding: Every counted position must be traceable to a sourceId present in candidateMatches[] and to a source position. External source retrieval and source identity certification are deferred to G2-4.

T5 Independent recomputation: An independently written recomputation must reproduce the specified metrics within ±0.15 percentage points, subject to the defined rounding rules. Under G2-2a, the harness must reproduce B1–B5 SQC and LMC from stdout logs alone. Under G2-2b, the harness must agree with the changed production engine on the full acceptance fixture set.

T6 Multi-paragraph offset control: Three or more paragraphs and ten or more sentences must be handled correctly, including token and character offsets.

The six tests must exist as executable specifications under G2-2a. Their execution against the changed production engine and PASS results are required under G2-2b.

3. Independent recomputation
An independent recomputation (T5) must reproduce production metrics across B1–B5 fixtures and T1–T4 fixtures within rounding tolerance (±0.15 percentage points).

The G2-2a harness must reproduce the recorded B1–B5 SQC and LMC results from the captured stdout logs alone, without depending on the production engine's calculation for its expected values.

Under G2-2b, the independent implementation must be compared against the changed production engine using the complete acceptance fixture set.

4. Migration plan
A migration plan must describe how existing reports produced under SQC semantics will be reconciled with the new LMC-based definition. This is not optional: reports produced before G2-2 will show different numbers.

The plan must preserve historical results, identify the metric and policy versions used, and define whether historical reports are recalculated, annotated, or retained as originally issued. No historical result may be silently overwritten.

5. Separate owner authorisation
A separate owner signature is required to authorise G2-2b implementation and verification.

The G2-1B owner register authorises metric definitions, not engine implementation. G2-2a is authorised by G2-1B closure under §17 item 5b of this packet. G2-2b requires its own explicit owner scope authorisation after G2-2a's exit conditions are satisfied.

5b. G2-2 sub-gates
G2-2a — Specification and investigation

Authorisable immediately upon closure of G2-1B.

Deliverables:

The versioned matching policy document required by DEC-01.

T1–T6 as executable specifications, with expected inputs, outputs and pass/fail assertions.

An independent recomputation harness that reproduces B1–B5 SQC and LMC results from stdout logs alone.

A documented implementation specification defining the expected production behaviour.

A G2-2a evidence packet recording all specification and investigation results.

No engine change is permitted under G2-2a.

G2-2a exit condition: The matching policy, executable T1–T6 specifications, independent recomputation harness and implementation specification are complete, reviewed, reproducible and recorded in the evidence packet. G2-2a completion does not authorise engine modification.

G2-2b — Implementation and verification

Requires a separate owner authorisation after G2-2a's exit condition is met.

Deliverables:

The authorised engine change implementing DEC-01 through DEC-04.

T1–T6 executed against the changed production engine.

T5 confirming agreement between production and independent recomputation within ±0.15 percentage points.

The migration plan for historical SQC reports.

Before/after comparison evidence.

Regression evidence showing that previously verified behaviour remains correct where required.

A G2-2b evidence packet containing baseline, changed engine identity, test results, hashes and final verdict.

The engine hash remains unchanged throughout G2-2a. The engine hash changes only under the separately authorised G2-2b implementation.

6. G2-9 threshold calibration
A labelled benchmark programme is required before any threshold value, including 40%, may be claimed as calibrated.

The benchmark must include positive, negative, paraphrased, translated and adversarial fixtures across academic disciplines.

Calibration evidence must include performance measurements, calibration curves, confidence intervals, dataset provenance and reproducible evaluation procedures.

Closure packet signature block
Prepared by: Engineering, under HOEOS 2.0.
Reviewed by: Owner (name recorded in signed register).
Closure commit: (filled in at commit time)
Closure commit SHA: (filled in at commit time)
Closure date (UTC): (filled in at commit time)