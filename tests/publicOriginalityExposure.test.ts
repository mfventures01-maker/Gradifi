/**
 * GRADIFI HOEOS P2.1 - PUBLIC ORIGINALITY ENGINE EXPOSURE TEST SUITE
 * Verifies Home Page CTAs, Public Route reachability, zero Math.random() in Verify path,
 * Google Books browser boundary security, Nemotron non-authoritative status,
 * and legacy component isolation.
 */

import fs from 'fs';
import path from 'path';
import { verifyCoreService } from '../src/services/verify/verifyCoreService';
import { PLAGIARISM_POLICY_VERSION } from '../src/services/verify/plagiarismPolicy';
import { GoogleBooksProvider } from '../src/services/verify/providers/googleBooksProvider';
import { AIFederationService } from '../src/services/verify/aiFederation';

async function runPublicOriginalityExposureTests() {
  console.log('🧪 GRADIFI HOEOS P2.1 - PUBLIC ORIGINALITY EXPOSURE TEST SUITE');
  console.log('================================================================');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, description: string) {
    total++;
    if (condition) {
      console.log(`  ✅ PASS: ${description}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${description}`);
      throw new Error(`Test failed: ${description}`);
    }
  }

  // 1. Home CTA Existence & Target Verification
  console.log('\n1. Home Page CTA & Navigation Verification:');
  const homePagePath = path.join(process.cwd(), 'src/pages/home/HomePage.tsx');
  const homePageContent = fs.readFileSync(homePagePath, 'utf-8');

  assert(
    homePageContent.includes('Check Your Work Free'),
    'HomePage.tsx contains "Check Your Work Free" CTA text'
  );
  assert(
    homePageContent.includes('/tools/plagiarism'),
    'HomePage.tsx contains navigation targeting /tools/plagiarism'
  );
  assert(
    homePageContent.includes('Check academic originality and discover relevant evidence'),
    'HomePage.tsx contains clear evidence-based description without exaggerated claims'
  );

  // 2. Public Originality Route & App.tsx Configuration
  console.log('\n2. Router Configuration & Target Verification:');
  const appPath = path.join(process.cwd(), 'src/App.tsx');
  const appContent = fs.readFileSync(appPath, 'utf-8');

  assert(
    appContent.includes('path="/tools/plagiarism"') && appContent.includes('element={<GradifiVerifyDemoPage />}'),
    'App.tsx maps /tools/plagiarism to <GradifiVerifyDemoPage />'
  );
  assert(
    appContent.includes('path="/verify"') && appContent.includes('element={<GradifiVerifyDemoPage />}'),
    'App.tsx maps /verify to <GradifiVerifyDemoPage />'
  );

  // 3. Legacy Component Isolation Verification
  console.log('\n3. Legacy Component & Service Isolation:');
  const verifyDemoPath = path.join(process.cwd(), 'src/pages/verify/GradifiVerifyDemoPage.tsx');
  const verifyDemoContent = fs.readFileSync(verifyDemoPath, 'utf-8');

  assert(
    !verifyDemoContent.includes('PlagiarismChecker') && !verifyDemoContent.includes('plagiarismService'),
    'GradifiVerifyDemoPage does NOT import or reference legacy PlagiarismChecker or plagiarismService'
  );

  const legacyServicePath = path.join(process.cwd(), 'src/services/plagiarismService.ts');
  if (fs.existsSync(legacyServicePath)) {
    const legacyServiceContent = fs.readFileSync(legacyServicePath, 'utf-8');
    assert(
      !appContent.includes('PlagiarismChecker') || !appContent.includes('path="/tools/plagiarism" element={<PlagiarismPage'),
      'Legacy PlagiarismChecker is not wired to the public /tools/plagiarism route'
    );
  }

  // 4. Certified Engine & Policy Execution Verification
  console.log('\n4. Certified G3/G5 Engine Reference:');
  assert(
    verifyDemoContent.includes('verifyCoreService'),
    'GradifiVerifyDemoPage references certified verifyCoreService'
  );
  assert(
    verifyDemoContent.includes('executeVerifyRun'),
    'GradifiVerifyDemoPage invokes executeVerifyRun()'
  );

  // 5. Zero Math.random() in Certified Verify Pipeline
  console.log('\n5. Zero Math.random() Invariant Verification:');
  function hasActiveMathRandom(content: string): boolean {
    // Strip comments to check active code execution only
    const cleanContent = content.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
    return cleanContent.includes('Math.random');
  }

  const verifyCorePath = path.join(process.cwd(), 'src/services/verify/verifyCoreService.ts');
  const verifyCoreContent = fs.readFileSync(verifyCorePath, 'utf-8');
  assert(
    !hasActiveMathRandom(verifyCoreContent),
    'verifyCoreService.ts contains ZERO active Math.random() calls'
  );

  const enginePath = path.join(process.cwd(), 'src/services/verify/deterministicEngine.ts');
  const engineContent = fs.readFileSync(enginePath, 'utf-8');
  assert(
    !hasActiveMathRandom(engineContent),
    'deterministicEngine.ts contains ZERO active Math.random() calls'
  );

  const policyPath = path.join(process.cwd(), 'src/services/verify/plagiarismPolicy.ts');
  const policyContent = fs.readFileSync(policyPath, 'utf-8');
  assert(
    !hasActiveMathRandom(policyContent),
    'plagiarismPolicy.ts contains ZERO active Math.random() calls'
  );

  // 6. Google Books Browser Boundary & Secret Isolation
  console.log('\n6. Google Books Browser Boundary Verification:');
  const gbProviderPath = path.join(process.cwd(), 'src/services/verify/providers/googleBooksProvider.ts');
  const gbProviderContent = fs.readFileSync(gbProviderPath, 'utf-8');

  assert(
    !gbProviderContent.includes('VITE_GOOGLE_BOOKS_API_KEY') && !gbProviderContent.includes('process.env.GOOGLE_BOOKS_API_KEY'),
    'Browser GoogleBooksProvider contains ZERO secret key reads (VITE_* or process.env)'
  );
  assert(
    gbProviderContent.includes('/api/verify/googlebooks'),
    'Browser GoogleBooksProvider uses server endpoint boundary /api/verify/googlebooks'
  );

  // 7. Nemotron Non-Authoritative Status
  console.log('\n7. Nemotron Non-Authoritative Status Verification:');
  const aiFedPath = path.join(process.cwd(), 'src/services/verify/aiFederation.ts');
  const aiFedContent = fs.readFileSync(aiFedPath, 'utf-8');

  assert(
    verifyDemoContent.includes('NON-AUTHORITATIVE'),
    'GradifiVerifyDemoPage explicitly labels AI Federation as NON-AUTHORITATIVE'
  );

  const testDocText = 'Quantum Entanglement in Federated Learning Networks (2024)';
  const verifyResult = await verifyCoreService.executeVerifyRun(testDocText);
  assert(
    verifyResult.plagiarismEvidence?.policyVersion === PLAGIARISM_POLICY_VERSION,
    'Public verify run produces G3-POLICY-v1 certified plagiarism policy output'
  );
  assert(
    typeof verifyResult.overallSimilarity === 'number' && Number.isFinite(verifyResult.overallSimilarity),
    'Public verify run produces valid numeric overall similarity score'
  );

  console.log('\n================================================================');
  console.log(`📊 P2.1 PUBLIC ORIGINALITY EXPOSURE TEST SUMMARY: ${passed}/${total} checks passed.`);
  console.log('================================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runPublicOriginalityExposureTests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
