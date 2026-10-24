import { gradingEngineService } from '../src/services/gradingEngineService';

const FIXTURE = 'C:\\Projects\\Gradifi\\scratch\\g1_ocr\\known-text.jpg';

async function runOnce(run: number) {
  const result = await gradingEngineService.gradeSubmission(
    FIXTURE,
    'N5-R4-FIXTURE-001',
    'Grammar: 30%, Content: 30%, Structure: 20%, Vocabulary: 10%, Coherence: 10%',
    'general',
    'n5-r4-student'
  );

  return {
    run,
    extractedTextLength: result.extractedText.length,
    extractedTextPreview: result.extractedText.slice(0, 150),
    ocrConfidence: result.ocrConfidence,
    ocrConfidenceLevel: result.ocrConfidenceLevel,
    finalScore: result.finalScore,
    confidence: result.confidence,
    gemmaScore: result.gemmaResult.score,
    gemmaConfidence: result.gemmaResult.confidence,
    nemotronOverallScore: result.nemotronResult.overallScore,
    nemotronConfidence: result.nemotronResult.confidence,
    nemotronCorrectness: result.nemotronResult.correctness,
    nemotronCoherence: result.nemotronResult.coherence,
    nemotronComplexity: result.nemotronResult.complexity,
    nemotronHelpfulness: result.nemotronResult.helpfulness,
    success: result.success,
    errors: result.errors
  };
}

for (let i = 1; i <= 3; i++) {
  console.log(JSON.stringify(await runOnce(i)));
}
