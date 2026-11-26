import { assert, assertEquals } from "jsr:@std/assert@1";
import { analyzeDocumentEvidence, extractSimilarityFindingsFromEvidenceMatches } from "./deterministicEngine.ts";
import type { EvidenceMatch } from "./types.ts";

Deno.test("G5 deterministic engine produces reproducible evidence from a verified provider snippet", () => {
  const rawText = "The rapid advancement of distributed artificial intelligence has transformed academic research and scientific collaboration. Researchers increasingly rely on reproducible evidence and transparent methods.";
  const sourceSnippet = "The rapid advancement of distributed artificial intelligence has transformed academic research and scientific collaboration.";
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
  const output = analyzeDocumentEvidence({
    documentText: rawText,
    candidateMatches: [candidate],
    engineVersion: "G5-DETERMINISTIC-v1",
    policyVersion: "G3-POLICY-v1",
  });
  const findings = extractSimilarityFindingsFromEvidenceMatches(
    rawText, output.documentHash, output.verifiedMatches, output.aggregation, [],
  );
  assertEquals(output.engineVersion, "G5-DETERMINISTIC-v1");
  assertEquals(output.policyVersion, "G3-POLICY-v1");
  assert(output.documentHash.length === 16);
  assert(output.evidenceHash.length === 16);
  assert(output.aggregation.totalUniqueMatchedTokens > 0);
  assert(findings.length > 0);
});
