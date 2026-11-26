import { assert, assertEquals } from "jsr:@std/assert@1";
import { analyzeDocumentEvidence, extractSimilarityFindingsFromEvidenceMatches } from "./deterministicEngine.ts";
import { normalizeText } from "./documentNormalizer.ts";
import type { EvidenceMatch } from "./types.ts";

Deno.test("G5 known-positive fixture proves exact student and source passage alignment", () => {
  const copiedPassage =
    "The rapid advancement of distributed artificial intelligence has transformed academic research and scientific collaboration.";
  const rawText =
    "The student introduces the topic in original language. " +
    copiedPassage +
    " The student concludes with independently written analysis.";
  const sourceSnippet =
    copiedPassage +
    " The source continues with a separate sentence that is not present in the submission.";

  const candidate: EvidenceMatch = {
    sourceId: "https://doi.org/10.5555/gradifi.synthetic.001",
    title: "Distributed Artificial Intelligence in Academic Research",
    authors: ["Example Author"],
    url: "https://doi.org/10.5555/gradifi.synthetic.001",
    doi: "10.5555/gradifi.synthetic.001",
    matchedText: "",
    originalSnippet: sourceSnippet,
    matchType: "lexical",
    matchPercentage: 0,
    relevanceScore: 0,
    provenance: {
      provider: "crossref",
      providerRecordId: "10.5555/gradifi.synthetic.001",
      retrievedAt: "2026-11-26T00:00:00.000Z",
      sourceType: "academic_work",
      sourceUrl: "https://doi.org/10.5555/gradifi.synthetic.001",
      title: "Distributed Artificial Intelligence in Academic Research",
      authors: ["Example Author"],
      doi: "10.5555/gradifi.synthetic.001",
      provenanceState: "PARTIAL",
    },
  };

  const input = {
    documentText: rawText,
    candidateMatches: [candidate],
    engineVersion: "G5-DETERMINISTIC-v1",
    policyVersion: "G3-POLICY-v1",
  };
  const output = analyzeDocumentEvidence(input);
  const findings = extractSimilarityFindingsFromEvidenceMatches(
    rawText, output.documentHash, output.verifiedMatches, output.aggregation, [],
  );

  assertEquals(output.engineVersion, "G5-DETERMINISTIC-v1");
  assertEquals(output.policyVersion, "G3-POLICY-v1");
  assertEquals(output.documentHash.length, 16);
  assertEquals(output.evidenceHash.length, 16);
  assert(output.aggregation.totalUniqueMatchedTokens > 0);
  assert(findings.length > 0);

  const studentStart = rawText.indexOf(copiedPassage);
  const studentEnd = studentStart + copiedPassage.length;
  const sentenceEvidence = output.aggregation.sentenceFlags.find(
    (item) => item.sourceId === candidate.sourceId && item.studentText === copiedPassage,
  );
  assert(sentenceEvidence, "Expected an exact sentence-level positive match for the copied passage");
  assertEquals(sentenceEvidence.documentLocation.startChar, studentStart);
  assertEquals(sentenceEvidence.documentLocation.endChar, studentEnd);
  assertEquals(
    rawText.slice(sentenceEvidence.documentLocation.startChar, sentenceEvidence.documentLocation.endChar),
    copiedPassage,
  );
  assertEquals(sentenceEvidence.sourceText, sourceSnippet);
  assertEquals(sentenceEvidence.matchType, "exact_match");
  assertEquals(sentenceEvidence.similarityPercentage, 100);

  const normalizedSource = normalizeText(sourceSnippet);
  const sourcePhraseEvidence = output.aggregation.phraseFlags.find(
    (item) => item.sourceId === candidate.sourceId && item.sourceLocation.startChar !== undefined &&
      item.sourceLocation.endChar !== undefined,
  );
  assert(sourcePhraseEvidence, "Expected source-side phrase coordinates for the positive match");
  assertEquals(
    normalizedSource.slice(
      sourcePhraseEvidence.sourceLocation.startChar!,
      sourcePhraseEvidence.sourceLocation.endChar!,
    ),
    sourcePhraseEvidence.normalizedPhrase,
  );
  assertEquals(sourcePhraseEvidence.submittedPhrase.length > 0, true);

  const finding = findings.find(
    (item) => item.sourceSegment === copiedPassage && item.matchedSegment === copiedPassage,
  );
  assert(finding, "Expected one deterministic finding pairing the exact student and source passages");
  assertEquals(finding.sourceStart, studentStart);
  assertEquals(finding.sourceEnd, studentEnd);
  assertEquals(rawText.slice(finding.sourceStart!, finding.sourceEnd!), copiedPassage);
  assertEquals(finding.matchedSegment, sourceSnippet.slice(0, copiedPassage.length));
  assertEquals(finding.offsetBasis, "CANONICAL_EVIDENCE_TEXT_UTF16");

  // Provider snippets are not complete source documents. Do not invent document-level source offsets.
  assertEquals(finding.matchedStart, undefined);
  assertEquals(finding.matchedEnd, undefined);

  const repeated = analyzeDocumentEvidence(input);
  assertEquals(repeated.documentHash, output.documentHash);
  assertEquals(repeated.evidenceHash, output.evidenceHash);
  assertEquals(repeated.aggregation.sentenceFlags, output.aggregation.sentenceFlags);
});
