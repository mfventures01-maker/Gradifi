import assert from 'node:assert';
import { buildProviderQuery, extractDocumentDoi } from '../src/services/verify/queryBuilder';

console.log('--- HOEOS G5 REPAIR 5 UNIT TESTS: Query Builder ---');

// Test 1: Document with headings
{
  const textWithHeadings = `
CHAPTER ONE
INTRODUCTION
1.0 BACKGROUND OF THE STUDY
The digital thermometer system utilizes a PIC16F877A microcontroller and an LM35 precision temperature sensor to measure ambient temperature accurately.
The PIC16F877A microcontroller converts analog voltage signals from the LM35 temperature sensor into digital values.

CHAPTER TWO
LITERATURE REVIEW
2.1 SENSOR ARCHITECTURE
The LM35 temperature sensor provides linear millivolt output proportional to Celsius temperature measurement.
`;
  const query = buildProviderQuery(textWithHeadings, 8);
  console.log('Test 1 (Headings filter) Query:', query);
  assert.ok(!query.includes('chapter'), 'Query must not contain "chapter"');
  assert.ok(!query.includes('introduction'), 'Query must not contain "introduction"');
  assert.ok(!query.includes('background'), 'Query must not contain "background"');
  assert.ok(!query.includes('literature'), 'Query must not contain "literature"');
  assert.ok(query.includes('temperature') || query.includes('sensor') || query.includes('pic16f877a') || query.includes('lm35'), 'Query must contain technical terms');
  console.log('✔ Test 1 passed: Headings and structural markers filtered');
}

// Test 2: Document with references section
{
  const textWithReferences = `
1.0 INTRODUCTION
The embedded temperature sensor network continuously monitors industrial thermal gradients using calibrated digital thermometer probes.
The digital thermometer probes transmit calibrated temperature sensor readings across the embedded network.

REFERENCES
Carbuncles, J. (2020). Difficult Times in Seventeenth-Century Venice Opera. Academic Press.
Smith, A. (2019). Government expenditures in LDCs during difficult economic times.
`;
  const query = buildProviderQuery(textWithReferences, 8);
  console.log('Test 2 (References filter) Query:', query);
  assert.ok(!query.includes('opera'), 'Query must not contain reference text "opera"');
  assert.ok(!query.includes('venice'), 'Query must not contain reference text "venice"');
  assert.ok(!query.includes('carbuncles'), 'Query must not contain reference text "carbuncles"');
  assert.ok(!query.includes('expenditures'), 'Query must not contain reference text "expenditures"');
  assert.ok(query.includes('temperature') || query.includes('sensor') || query.includes('network'), 'Query must contain body keywords');
  console.log('✔ Test 2 passed: Reference list entries filtered');
}

// Test 3: Document with mixed case and plurals
{
  const mixedCaseDoc = `
Digital Thermometers and micro-Sensors operate with high precision.
Digital Thermometers capture Temperature measurements from multiple Sensors.
`;
  const query = buildProviderQuery(mixedCaseDoc, 8);
  console.log('Test 3 (Mixed case & plurals) Query:', query);
  assert.strictEqual(query, query.toLowerCase(), 'Query must be lowercase');
  assert.ok(query.includes('thermometer') || query.includes('temperature') || query.includes('sensor'), 'Query must contain normalized singular keywords');
  console.log('✔ Test 3 passed: Mixed case normalized and lowercased');
}

// Test 4: Document with explicit DOI
{
  const docWithDoi = `
JOURNAL OF EMBEDDED SYSTEMS, VOL 42, 2024
doi: 10.1109/TES.2024.1234567

1.0 INTRODUCTION
Precision digital thermometer probes and temperature measurement sensors.
`;
  const extractedDoi = extractDocumentDoi(docWithDoi);
  console.log('Test 4 (DOI extraction):', extractedDoi);
  assert.strictEqual(extractedDoi, '10.1109/TES.2024.1234567', 'Must accurately extract explicit DOI');
  console.log('✔ Test 4 passed: DOI extracted correctly');
}

// Test 5: Determinism check (running twice yields identical output)
{
  const sampleDoc = `
The digital thermometer prototype integrates an LM35 temperature sensor with a PIC16F877A microcontroller.
Temperature readings are displayed on an LCD screen after analog-to-digital conversion.
The sensor measures ambient temperature within an accuracy of +/- 0.5 degrees Celsius.
`;
  const run1 = buildProviderQuery(sampleDoc, 6);
  const run2 = buildProviderQuery(sampleDoc, 6);
  assert.strictEqual(run1, run2, 'Query builder must be strictly deterministic');
  console.log('✔ Test 5 passed: Determinism guaranteed');
}

// Test 6: Digital Thermometer Thesis representative check
{
  const thesisSample = `
TITLE: DESIGN AND IMPLEMENTATION OF A DIGITAL THERMOMETER

CHAPTER ONE
1.0 INTRODUCTION
A thermometer is an instrument designed to measure temperature. Digital thermometers have replaced conventional mercury-in-glass thermometers due to their rapid response and high accuracy.
The digital thermometer developed in this work uses an LM35 precision temperature sensor and a PIC16F877A microcontroller.

CHAPTER TWO
2.0 LITERATURE REVIEW
2.1 TEMPERATURE SENSOR
The LM35 integrated circuit temperature sensor produces an electrical output proportional to Celsius temperature measurement.
The sensor output is digitized by the analog-to-digital converter (ADC) module inside the PIC16F877A microcontroller.
`;
  const query = buildProviderQuery(thesisSample, 8);
  console.log('Test 6 (Digital Thermometer Sample) Query:', query);
  const targetKeywords = ['thermometer', 'temperature', 'sensor', 'measurement', 'lm35', 'pic16f877a'];
  const matchedTargets = targetKeywords.filter(kw => query.includes(kw));
  console.log('Matched target keywords:', matchedTargets);
  assert.ok(matchedTargets.length >= 3, `Expected at least 3 matching target keywords, got ${matchedTargets.length}: ${matchedTargets.join(', ')}`);
  assert.ok(!query.includes('chapter'), 'Must not contain "chapter"');
  assert.ok(!query.includes('introduction'), 'Must not contain "introduction"');
  console.log('✔ Test 6 passed: Digital Thermometer produced', matchedTargets.length, 'target keywords');
}

console.log('ALL QUERY BUILDER UNIT TESTS PASSED SUCCESSFULLY.');
