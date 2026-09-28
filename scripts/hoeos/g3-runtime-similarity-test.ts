import { executeSimilarityAnalysis } from "../../src/services/verify/deterministicEvidenceBridge.ts";

const SOURCE_A = `
SOURCE-A CONTROLLED DOCUMENT
Artificial intelligence systems require deterministic evidence before a verification decision is made.
The verification engine must preserve exact source passages and reproducible similarity findings.
`;

const STUDENT_A = `
STUDENT-A CONTROLLED DOCUMENT
This submission states that artificial intelligence systems require deterministic evidence before a verification decision is made.
The verification engine must preserve exact source passages and reproducible similarity findings.
`;

const result = executeSimilarityAnalysis(SOURCE_A, STUDENT_A);

console.log(JSON.stringify({
  analysisType: result.analysisType,
  overallSimilarity: result.overallSimilarity,
  deterministic: result.deterministic,
  findingsCount: result.findings.length,
  findings: result.findings,
  engineVersion: result.engineVersion,
  policyVersion: result.policyVersion,
  warnings: result.warnings
}, null, 2));
