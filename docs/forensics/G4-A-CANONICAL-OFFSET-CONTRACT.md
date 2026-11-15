# G4-A: Canonical Evidence Offset Contract

**Status:** Contract defined; implementation conformance remains to be verified in G4-B/G4-C.  
**Scope:** Coordinate semantics only. This gate does not repair source-side passage alignment, alter similarity scoring, or certify UI highlighting.

## 1. Document roles

For a deterministic similarity finding:

- `sourceDocumentId` identifies the submitted document (the first argument).
- `matchedDocumentId` identifies the comparison/reference document (the second argument).
- `sourceSegment` is text from the submitted document.
- `matchedSegment` is text from the comparison/reference document.

The legacy field names are retained for compatibility. They must not be interpreted as saying that `sourceDocumentId` is the external reference source.

## 2. Canonical coordinate text

For each document, the coordinate text is:

```ts
toCanonicalEvidenceText(document.rawText || document.normalizedText || '')
```

The canonicalization currently:

1. Converts non-breaking spaces to ordinary spaces.
2. Converts CRLF and CR line endings to LF.
3. Replaces line breaks and surrounding horizontal whitespace with a single space.
4. Collapses remaining whitespace runs to one space.
5. Trims leading and trailing whitespace.

Offsets are JavaScript UTF-16 string indices, compatible with `String.slice()`.

## 3. Range semantics

Every populated range is half-open: `[start, end)`.

- `sourceStart/sourceEnd`: range in the submitted document's canonical evidence text.
- `matchedStart/matchedEnd`: range in the comparison document's canonical evidence text.
- A range is valid only when `0 <= start < end <= canonicalText.length`.
- The corresponding segment must equal `canonicalText.slice(start, end)`.

Offsets MUST NOT be applied directly to raw extracted text, PDF byte positions, DOCX XML positions, or OCR image coordinates.

## 4. Missing source-side alignment

If the engine cannot establish an exact comparison-document range, `matchedStart` and `matchedEnd` remain undefined. The finding may not be presented as source-side highlightable evidence.

A prefix excerpt, a normalized-text index used against raw text, or a best-guess location is not an acceptable substitute for an aligned source span.

## 5. Compatibility and gate boundary

The existing `SimilarityFinding` field names remain unchanged. The optional `offsetBasis` discriminator is:

`CANONICAL_EVIDENCE_TEXT_UTF16`

G4-A defines the contract and records its type-level representation. It does **not** claim that existing finding-generation paths already comply. G4-B must repair and prove the source-side mapping; G4-C must test both production finding-generation paths and negative cases.

## 6. Explicit non-goals

- No change to G2/G3 similarity formulas, thresholds, policy, or historical evidence.
- No change to canonical document identity or evidence hashing.
- No UI highlighting implementation.
- No certification claim.
