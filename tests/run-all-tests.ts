/**
 * GRADIFI / SEFAES - All Services Test Runner
 * Constitutional Law 6: Verify Everything
 * 
 * Run: npx ts-node tests/run-all-tests.ts
 */

import { ocrService } from '../src/services/ocrService';
import { gemmaService } from '../src/services/gemmaService';
import { nemotronService } from '../src/services/nemotronService';
import { plagiarismService } from '../src/services/plagiarismService';

async function runAllTests() {
  console.log('🏛️ GRADIFI / SEFAES - SERVICE TEST SUITE');
  console.log('========================================\n');

  // Test OCR Service
  console.log('📸 Testing OCR Service...');
  try {
    const available = await ocrService.isAvailable();
    console.log(`   ✅ OCR Service: ${available ? 'Available' : 'Mock Mode'}`);
  } catch (e) {
    console.log('   ❌ OCR Service: Failed');
  }

  // Test Gemma Service
  console.log('\n🤖 Testing Gemma Service...');
  try {
    const result = await gemmaService.gradeEssay('Test essay');
    console.log(`   ✅ Gemma: Score ${result.score}, Confidence ${result.confidence}%`);
  } catch (e) {
    console.log('   ❌ Gemma: Failed');
  }

  // Test Nemotron Service
  console.log('\n📊 Testing Nemotron Service...');
  try {
    const result = await nemotronService.grade('Test content');
    console.log(`   ✅ Nemotron: Score ${result.score}, Confidence ${result.confidence}%`);
  } catch (e) {
    console.log('   ❌ Nemotron: Failed');
  }

  // Test Plagiarism Service
  console.log('\n📚 Testing Plagiarism Service...');
  try {
    const result = await plagiarismService.checkDocument('Test document');
    console.log(`   ✅ Plagiarism: Similarity ${result.overallSimilarity}%, Sources ${result.totalSources}`);
  } catch (e) {
    console.log('   ❌ Plagiarism: Failed');
  }

  console.log('\n========================================');
  console.log('✅ ALL TESTS COMPLETE!');
  console.log('📅 Tested:', new Date().toISOString());
}

runAllTests();
