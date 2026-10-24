import { gradingEngineService } from '../src/services/gradingEngineService';

const FIXTURE = 'Artificial intelligence has transformed modern education by providing personalized learning experiences and automated grading systems. AI-powered tools can analyze student performance and adapt to individual learning styles.';

async function runOnce(run: number) {
  const result = await gradingEngineService.gradeSubmission(
    FIXTURE,
    'N5-FIXTURE-001',
    'Grammar: 30%, Content: 30%, Structure: 20%, Vocabulary: 10%, Coherence: 10%',
    'general',
    'n5-test-student'
  );

  return {
    run,
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

for (let i = 1; i <= 5; i++) {
  console.log(JSON.stringify(await runOnce(i)));
}
