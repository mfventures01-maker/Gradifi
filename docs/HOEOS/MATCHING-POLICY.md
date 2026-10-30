# HOEOS Matching Policy

**Document:** docs/HOEOS/MATCHING-POLICY.md
**Version:** 1.0
**Status:** COMMITTED
**Gate:** G2-2a
**Authority:** G2-2a signed scope, committed at c61f17733bbd31242b8dc738d826c59de9b5f1a1
**Governing decision:** DEC-01 of the G2-1B Owner Decision Register
**Engine under test:** 48353296a3fbb9714bb2607485011c5616f212666c22719229e77824b104c169

---

## Section 1. Purpose and scope

This document defines what constitutes a qualifying source-supported match for uniqueMatchedCoverage, per DEC-01 of the G2-1B Owner Decision Register. It is the normative specification referenced by every other G2-2a deliverable and by G2-2b implementation.

This document is not the implementation. It states requirements; it does not prescribe code.

## Section 2. Three concepts, distinguished

| Concept | Definition | Counts toward uniqueMatchedCoverage |
|---|---|---|
| Lexical overlap | A normalised document token appears somewhere in a source token vocabulary. | No |
| Phrase match | A contiguous sequence of document tokens is supported by an identifiable source span with valid document and source character coordinates. | Only if it satisfies Section 5 |
| Qualifying match | A lexical overlap or phrase match that satisfies Section 5 minimum evidence requirements and Section 6 source-binding requirements. | Yes |

## Section 3. Token definition

1. Tokeniser. tokenize() in src/services/verify/documentNormalizer.ts at engine hash 48353296a3fbb9714bb2607485011c5616f212666c22719229e77824b104c169. Normative version NORM-V1.
2. Normalisation rules. Lowercase; strip non-alphanumeric characters at word boundaries; preserve internal hyphens; preserve diacritics.
3. Unicode. NFC normalisation applied before tokenisation.
4. What is a token. A maximal sequence of alphanumeric characters, with internal hyphens preserved.
5. Number tokens. Digits are tokenised. The string "3.14" becomes two tokens: "3" and "14".
6. Common words, stopwords, short tokens. Enumerated in Section 5.1. The stopword list is versioned and committed with this document.

## Section 4. Token position identity

1. Document-global index. Positions are assigned in reading order from 0 to N-1, where N = |tokenize(documentText)|.
2. Repeated tokens. Each occurrence is a distinct position. The string "the the the" produces three positions (0, 1, 2). B5 R1 is the reference fixture.
3. Sentence boundaries. A sentence token positions are contiguous but not isolated. A document position belongs to exactly one sentence.
4. Position stability. Positions are deterministic: same document and same tokeniser version produce same positions.

## Section 5. Qualifying match definition

A qualifying match is a document position that satisfies both (a) the token at that position is meaningful per Section 5.1, and (b) the position is source-supported per Section 6.

### Section 5.1. Meaningful-token rules

1. Stopword list. Versioned in STOPWORDS-v1.txt (produced by G2-2b). Contains standard English function words plus domain-specific common terms.
2. Short tokens. Tokens of length less than 2 characters are excluded unless they are numeric.
3. Common-word exclusion in coverage. The following do NOT count toward uniqueMatchedCoverage even when matched: tokens in the stopword list; single-character non-numeric tokens; common n-grams wholly composed of stopwords such as "of the" or "in the".
4. T1 common-word control. A document and source that share only stopwords must produce uniqueMatchedCoverage of exactly 0.0 percent. The boundary between "only stopwords" and "at least one meaningful token" is a single meaningful-token difference.

### Section 5.2. Minimum length per match

1. Phrase-match minimum. A phrase match counts only if the matched span contains at least two meaningful tokens.
2. Single-token lexical overlap. A single meaningful token matched in a source is classified as lexical overlap, not a qualifying match, and does not contribute to uniqueMatchedCoverage.

## Section 6. Source-supported binding

1. What binds a match. A document position p is bound to source S if: the token at p is meaningful per Section 5.1; the token at p appears in tokenize(S.rawText); and the occurrence establishes a valid source position per Section 6.2, or a phrase span containing p is validated against S with character coordinates.
2. Source position definition. A source position is a character offset pair (startChar, endChar) such that S.rawText.slice(startChar, endChar) reconstructs the matched span.
3. Traceability requirement. Every counted document position must be attributable to a specific sourceId present in candidateMatches[] and to a specific source position. Under T4, an unattributable position causes the entire match to be disqualified.

## Section 7. Phrase-match contribution

1. When phrases contribute. A phrase match contributes to uniqueMatchedCoverage when: it satisfies Section 5.2 with at least two meaningful tokens; its document coordinates are valid per T3 (startChar <= endChar; both within bounds; both integers; neither NaN); and its source coordinates resolve to a real source position in a real candidateMatches[] entry.
2. What a phrase match contributes. All document token positions covered by the phrase span are counted, subject to overlap deduplication in Section 8 and meaningful-token rules in Section 5.1.
3. Phrase evidence is checked under T3 (structural validity) at G2-2b. Exhaustive phrase-coordinate correctness is G2-3 responsibility and is not required for G2-2a closure.

## Section 8. Overlap deduplication

1. Within a sentence. Overlapping phrase matches within a sentence produce a character union. The union token positions are counted once.
2. Within a source. Overlapping phrase matches from the same source produce a character union per source. Counted once per source.
3. Across sources. A document position matched by multiple sources is counted once globally, as the union across sources. B4 Q2 and Q3 are the reference fixtures.
4. Reference behaviours from B4: Q1 mixed admission excludes rejected sentence tokens from global set; Q2 union not sum, disjoint sources contribute both position sets; Q3 no double count across sources, same sentence matched by two sources counts once; Q4 repeated sentences each credited once with no inflation.

## Section 9. Repeated-occurrence handling

1. Repeated document positions. Every position is independent per Section 4. A repeated token at positions p1, p2, p3 counts as three positions if each satisfies Section 5 and Section 6.
2. Repeated source occurrences. A source containing the same token multiple times establishes multiple source positions. Each can bind a document position. No double-counting in the global set (union).
3. B5 R1 reference. Document "The model model model converges." with source "model": positions 1, 2, 3 of "model" are each meaningful per Section 5.1 (not stopword, length at least 2). All three count toward LMC. Sentence similarity is 18 percent, rejected under SQC. The two metrics diverge by minus 60 percentage points. This is correct behaviour under DEC-01.
4. B5 R2 reference. Two sentences each containing "neural": positions 0, 1, 4, 5 count under LMC if all meaningful. Diverge from SQC similarly.

## Section 10. Rounding

1. Normative rounding function. Math.round(x * 1000) / 10, i.e. round to one decimal place of percent.
2. Applied to. uniqueMatchedCoverage, documentCoverage, sentenceQualifiedCoverage, and any other percentage metric.
3. No intermediate rounding. Intermediate computations use full precision. Only the final displayed value is rounded.
4. Tolerance for recomputation. Independent recomputation must agree within plus or minus 0.15 percentage points per Section 4.3 of the G2-2a scope.

## Section 11. Denominator definitions

1. uniqueMatchedCoverage. Numerator: count of distinct document token positions satisfying Section 5 and Section 6, after Section 8 deduplication. Denominator: |tokenize(documentText)|, the total document token count including stopwords.
2. documentCoverage(S) per source. Numerator: count of positions in document matched by source S under Section 5 and Section 6. Denominator: |tokenize(documentText)|, the same denominator as uniqueMatchedCoverage.
3. sentenceQualifiedCoverage. Numerator: count of positions in sentences admitted at the sentence-similarity threshold of 40 percent. Denominator: |tokenize(documentText)|. This is the current production behaviour, retained as a diagnostic.
4. Sum property. The sum of documentCoverage(S) over all sources S may exceed uniqueMatchedCoverage when sources overlap. This is correct and must be documented in every report that shows both.

## Section 12. Versioning

1. This document. Versioned by semver. Current version: 1.0.
2. Version bump requirements. Patch (1.0.x): typo fixes, clarifications with no semantic change. Minor (1.x.0): additions to stopword list, additions to meaningful-token rules, additions to examples, with no change to existing semantics. Major (x.0.0): any change to Section 3 through Section 11 operative requirements, requiring a new gate packet under HOEOS Part VI.
3. Compatibility. Reports generated under a prior major version retain their original semantics. The version is recorded in every report.

## Section 13. Layer 2 fixture re-baselining

The Layer 2 crossrail suite (25 fixtures, corpus manifest 3a8083657cdce5955403a966fec3a25efc01c91acac2d4e7ade006e6b0247571) was baselined when uniqueMatchedCoverage meant SQC. Under DEC-01, uniqueMatchedCoverage will mean LMC after G2-2b. Re-running the Layer 2 fixtures after G2-2b will produce different uniqueMatchedCoverage values for the same inputs.

Requirement. A re-baselining exercise is required before G2-2b can be certified. The exercise records the SQC baseline (current), the LMC baseline (post-G2-2b), and explains every difference in terms of this policy rules.

## Section 14. Falsifiability

This policy is falsified if any of the following hold:

1. A reader cannot compute uniqueMatchedCoverage for B1 through B5 from this document plus the recorded stdout logs alone, per Section 4.1 of the G2-2a scope.
2. An independent implementation of this policy disagrees with production by more than plus or minus 0.15 percentage points on any B1 through B5 fixture after G2-2b.
3. A document and source sharing only stopwords produces uniqueMatchedCoverage greater than 0.0 percent (T1 falsified).
4. Two overlapping phrase matches within a sentence produce more counted positions than their character union token count (T3 and Section 8 falsified).
5. Two identical sentences produce uniqueMatchedCoverage greater than 100 percent (impossible by construction, but documented as a sentinel).

## Section 15. Open questions deferred to G2-2b implementation

The following are intentionally not resolved in this policy. G2-2b must resolve them, and its gate packet must state which choices were made:

1. Exact stopword list. STOPWORDS-v1.txt is a G2-2b deliverable. This policy states the rules for what goes in it; the list itself is implementation.
2. Minimum meaningful-token threshold for phrase matches. Section 5.2 states at least 2. Whether some phrase patterns require at least 3 is a G2-2b specification decision, recorded with fixture evidence.
3. Handling of numbers, code identifiers, URLs. This policy defers their treatment to G2-2b, with the rule that whatever G2-2b decides must be applied consistently and reflected in T1 through T6 fixtures.
4. Multi-language documents. Out of scope for G2-2a. Noted for a future gate.

## Section 16. References

- G2-1B Owner Decision Register: docs/HOEOS/G2-1B-OWNER-DECISION-REGISTER.md, hash 47048be1067c75a90527fe30c0e0e2728405706ca5663d608c54107d0f40ab82. DEC-01 through DEC-06.
- G2-1B Closure Packet: docs/HOEOS/G2-1B-CLOSURE-PACKET.md, hash 22588705aeb02324c5487fafed407d6cd89c4f83566f695cbccdc8c654a53e51.
- B1 through B5 evidence: C:\Projects\Gradifi-evidence\g2-1b-gate-packet-20261030T165742Z\, six stdout logs, hashes in the closure packet Section 4.
- G2-2a signed scope: docs/HOEOS/G2-2a-SCOPE.md, hash 673b19e7c0e325083daca33c97f1edd7391971306824b83ea6e3f111b1994899.
- Engine under test: 48353296a3fbb9714bb2607485011c5616f212666c22719229e77824b104c169.