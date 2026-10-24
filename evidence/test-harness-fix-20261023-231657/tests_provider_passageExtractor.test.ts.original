/**
 * HOEOS PROVIDER PASSAGE EXTRACTOR TEST SUITE
 * Verifies deterministic passage extraction from student document given source snippet.
 */

import assert from 'node:assert';
import { extractStudentPassage } from '../../src/services/verify/server/passageExtractor';

let passCount = 0;
let failCount = 0;

function runTest(name: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS — ${name}`);
    passCount++;
  } catch (err) {
    console.error(`FAIL — ${name}:`, err);
    failCount++;
  }
}

console.log('================================================================');
console.log('HOEOS PROVIDER PASSAGE EXTRACTOR TEST SUITE');
console.log('================================================================');

const SAMPLE_DOC = `Design and implementation of digital thermometer based on microcontroller.
This project presents the design of a digital thermometer with high accuracy temperature sensor.
The system utilizes an LM35 temperature sensor coupled with an analog-to-digital converter.
Experimental results show low latency and stable thermal readings.`;

// Test 1: exact substring match returns the passage
runTest('Test 1 — exact substring match returns the passage', () => {
  const snippet = 'design of a digital thermometer with high accuracy';
  const result = extractStudentPassage(SAMPLE_DOC, snippet);
  assert.ok(result, 'Result must not be null');
  assert.strictEqual(result.text, 'design of a digital thermometer with high accuracy');
  assert.strictEqual(SAMPLE_DOC.slice(result.start, result.end), result.text);
});

// Test 2: no match returns null
runTest('Test 2 — no match returns null', () => {
  const snippet = 'Quantum cosmology and astrophysics in deep space exploration orbits';
  const result = extractStudentPassage(SAMPLE_DOC, snippet);
  assert.strictEqual(result, null, 'Unrelated snippet must return null');
});

// Test 3: approximate match above threshold returns the best window
runTest('Test 3 — approximate match above threshold returns the best window', () => {
  const snippet = 'digital thermometer with high accuracy temperature sensor and microcontroller';
  const result = extractStudentPassage(SAMPLE_DOC, snippet, { windowTokens: 10, minScore: 0.25 });
  assert.ok(result, 'Result must not be null for high-overlap window');
  assert.ok(result.text.length > 0, 'Extracted passage must not be empty');
  assert.strictEqual(SAMPLE_DOC.slice(result.start, result.end), result.text, 'Offsets must match slice');
});

// Test 4: approximate match below threshold returns null
runTest('Test 4 — approximate match below threshold returns null', () => {
  const snippet = 'digital banking with financial sensor instruments';
  const result = extractStudentPassage(SAMPLE_DOC, snippet, { windowTokens: 10, minScore: 0.40 });
  assert.strictEqual(result, null, 'Low overlap below threshold must return null');
});

// Test 5: determinism — same input, same output
runTest('Test 5 — determinism — same input, same output', () => {
  const snippet = 'LM35 temperature sensor analog to digital converter';
  const r1 = extractStudentPassage(SAMPLE_DOC, snippet);
  const r2 = extractStudentPassage(SAMPLE_DOC, snippet);
  assert.deepStrictEqual(r1, r2, 'Two calls with identical input must produce identical results');
});

console.log('================================================================');
console.log(`TOTAL: ${passCount} PASS / ${failCount} FAIL`);
console.log('================================================================');

if (failCount > 0) {
  process.exit(1);
}
