/**
 * GRADIFI VERIFY - STANDARDS-COMPLIANT QR CODE & DETERMINISM INTEGRITY TEST SUITE
 * HOEOS G5.10R Acceptance & Forensic Verification
 */

import { generateQRCodeSVG } from '../src/utils/qrGenerator';
import { verifyCoreService } from '../src/services/verify/verifyCoreService';
import QRCode from 'qrcode';
import jsQR from 'jsqr';

async function runQRIntegrityTests() {
  console.log('🧪 GRADIFI VERIFY - HOEOS G5.10R QR INTEGRITY & DETERMINISM SUITE');
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

  // TEST 1: Empty payload rejection
  console.log('\n1. Empty Payload Rejection:');
  try {
    await generateQRCodeSVG('');
    assert(false, 'Empty payload should throw error');
  } catch (err: any) {
    assert(err.message.includes('payload must not be empty'), 'Empty string payload rejected with descriptive error');
  }

  try {
    await generateQRCodeSVG('   ');
    assert(false, 'Whitespace payload should throw error');
  } catch (err: any) {
    assert(err.message.includes('payload must not be empty'), 'Whitespace-only payload rejected with descriptive error');
  }

  // TEST 2: Invalid size rejection
  console.log('\n2. Invalid Size Rejection:');
  try {
    await generateQRCodeSVG('https://example.test/verify/ABC123', 0);
    assert(false, 'Zero size should throw error');
  } catch (err: any) {
    assert(err.message.includes('size must be a positive finite number'), 'Zero size rejected');
  }

  try {
    await generateQRCodeSVG('https://example.test/verify/ABC123', -150);
    assert(false, 'Negative size should throw error');
  } catch (err: any) {
    assert(err.message.includes('size must be a positive finite number'), 'Negative size rejected');
  }

  try {
    await generateQRCodeSVG('https://example.test/verify/ABC123', NaN);
    assert(false, 'NaN size should throw error');
  } catch (err: any) {
    assert(err.message.includes('size must be a positive finite number'), 'NaN size rejected');
  }

  // TEST 3: SVG Output Generation
  console.log('\n3. SVG Output Generation:');
  const testUrl = 'https://example.test/verify/ABC123';
  const svgOutput = await generateQRCodeSVG(testUrl, 180);

  assert(typeof svgOutput === 'string' && svgOutput.startsWith('<svg'), 'Returns SVG string starting with <svg');
  assert(svgOutput.endsWith('</svg>\n') || svgOutput.endsWith('</svg>'), 'Returns valid SVG structure ending with </svg>');

  // TEST 4: QR Structure & Aesthetics Compliance
  console.log('\n4. QR Structure & Aesthetics Compliance:');
  assert(svgOutput.includes('xmlns="http://www.w3.org/2000/svg"'), 'SVG includes standard XML namespace');
  assert(svgOutput.includes('width="180"'), 'SVG contains requested width attribute (180)');
  assert(svgOutput.includes('height="180"'), 'SVG contains requested height attribute (180)');
  assert(svgOutput.includes('viewBox='), 'SVG contains viewBox attribute');
  assert(svgOutput.includes('#0f172a'), 'SVG contains dark module color (#0f172a)');
  assert(svgOutput.includes('#ffffff'), 'SVG contains light background color (#ffffff)');

  // TEST 5: Output Determinism Verification
  console.log('\n5. Output Determinism Verification:');
  const runs = 100;
  let deterministicMatches = 0;
  const referenceSvg = await generateQRCodeSVG(testUrl, 200);

  for (let i = 0; i < runs; i++) {
    const currentSvg = await generateQRCodeSVG(testUrl, 200);
    if (currentSvg === referenceSvg) {
      deterministicMatches++;
    }
  }
  assert(deterministicMatches === runs, `100% deterministic SVG output across ${runs} consecutive invocations`);

  // TEST 6: Segment Payload Preservation
  console.log('\n6. Segment Payload Preservation:');
  const qrObject = QRCode.create(testUrl, { errorCorrectionLevel: 'M' });
  const extractedPayload = qrObject.segments.map((seg: any) => {
    if (typeof seg.data === 'string') return seg.data;
    if (seg.data instanceof Uint8Array || Array.isArray(seg.data)) {
      return Buffer.from(seg.data).toString('utf-8');
    }
    return '';
  }).join('');

  assert(extractedPayload === testUrl, `Extracted segment payload (${extractedPayload}) exactly matches input URL (${testUrl})`);
  assert(qrObject.errorCorrectionLevel.bit === 0, 'Error correction level is set to M (bit 0 / 15% recovery capacity)');
  assert(qrObject.modules.size > 0, 'BitMatrix module size is greater than 0');

  // TEST 7: ACTUAL QR DECODE ROUND-TRIP (via jsQR decoder)
  console.log('\n7. Actual QR Decode Round-Trip (via jsQR decoder):');
  const margin = 4;
  const matrixSize = qrObject.modules.size;
  const totalModules = matrixSize + margin * 2;
  const scale = 8;
  const width = totalModules * scale;
  const height = totalModules * scale;
  const rgbaBuffer = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const modR = Math.floor(y / scale) - margin;
      const modC = Math.floor(x / scale) - margin;
      const isDark = modR >= 0 && modR < matrixSize && modC >= 0 && modC < matrixSize && qrObject.modules.get(modR, modC);
      const idx = (y * width + x) * 4;
      rgbaBuffer[idx] = isDark ? 15 : 255;
      rgbaBuffer[idx + 1] = isDark ? 23 : 255;
      rgbaBuffer[idx + 2] = isDark ? 42 : 255;
      rgbaBuffer[idx + 3] = 255;
    }
  }

  const jsQrResult = jsQR(rgbaBuffer, width, height);
  assert(jsQrResult !== null && jsQrResult !== undefined, 'jsQR decoder successfully parsed rasterized QR image');
  assert(jsQrResult?.data === testUrl, `Decoded payload (${jsQrResult?.data}) 100% strictly equals original payload (${testUrl})`);

  // TEST 8: Verification ID Determinism
  console.log('\n8. Verification ID Determinism & Hash Grounding:');
  const docText = `Quantum Entanglement and Decoupled Neural Architecture in Federated Learning Networks\nDr. Aris Thorne (2024)`;
  const verifyRun1 = await verifyCoreService.executeVerifyRun(docText);
  const vrfId1 = `VRF-${verifyRun1.documentHash.slice(0, 12).toUpperCase()}`;

  const verifyRun2 = await verifyCoreService.executeVerifyRun(docText);
  const vrfId2 = `VRF-${verifyRun2.documentHash.slice(0, 12).toUpperCase()}`;

  assert(vrfId1 === vrfId2, `Verification IDs are 100% byte-identical for identical inputs (${vrfId1} === ${vrfId2})`);
  assert(vrfId1.startsWith('VRF-'), 'Verification ID adheres to VRF- prefix convention');
  assert(vrfId1.length === 16, 'Verification ID has exact length 16 (VRF- + 12 hex chars)');

  console.log('\n================================================================');
  console.log(`📊 G5.10R TEST SUMMARY: ${passed}/${total} checks passed.`);
  console.log('================================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runQRIntegrityTests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
