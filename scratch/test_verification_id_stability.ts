import fs from 'fs';
import crypto from 'crypto';
import { extractDocxText } from '../src/services/verify/ingestionAdapters/officeZipAdapter';
import { VerificationPersistenceService } from '../src/services/verify/verificationPersistenceService';

function sha256(text: string): string {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

async function main() {
  const filePath = 'C:\\Users\\faith\\Downloads\\DIGITAL THERMOMETER real.docx';
  if (!fs.existsSync(filePath)) {
    console.error('File missing:', filePath);
    process.exit(1);
  }

  const bytes = fs.readFileSync(filePath);
  const extraction = await extractDocxText(bytes);

  if (!extraction.success || !extraction.text) {
    console.error('Failed to extract text from thermometer DOCX');
    process.exit(1);
  }

  console.log('Extracted text length:', extraction.text.length);

  const ids: string[] = [];
  for (let i = 1; i <= 5; i++) {
    const documentHash = sha256(extraction.text);
    const vrfId = VerificationPersistenceService.deriveVerificationId(documentHash);
    ids.push(vrfId);
    console.log(`run ${i}: documentHash=${documentHash} -> ${vrfId}`);
  }

  const firstId = ids[0];
  const allIdentical = ids.every(id => id === firstId);

  if (allIdentical) {
    console.log(`\nverification_id stable: ${firstId}`);
    console.log('Result: PASS (5/5 identical derivation)');
  } else {
    console.error('Result: FAIL (inconsistent verification_id derivations)');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
