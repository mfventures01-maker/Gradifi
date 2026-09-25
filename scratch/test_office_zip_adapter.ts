import fs from 'fs';
import path from 'path';
import { extractDocxText } from '../src/services/verify/ingestionAdapters/officeZipAdapter';

async function main() {
  const docxPath = 'C:\\Users\\faith\\Downloads\\Design and Construction of a Joystick-Controlled Industrial automation System.docx';
  console.log('Testing file:', docxPath);
  
  if (!fs.existsSync(docxPath)) {
    console.error('File does not exist at path:', docxPath);
    process.exit(1);
  }

  const fileBytes = fs.readFileSync(docxPath);
  console.log('File size in bytes:', fileBytes.length);

  // Inspect zip headers manually in Node.js
  console.log('\n--- ZIP ENTRY INSPECTION ---');
  let pos = 0;
  let entryIndex = 0;
  while (pos + 30 <= fileBytes.length) {
    if (fileBytes[pos] === 0x50 && fileBytes[pos + 1] === 0x4b && fileBytes[pos + 2] === 0x03 && fileBytes[pos + 3] === 0x04) {
      entryIndex++;
      const flags = fileBytes[pos + 6] | (fileBytes[pos + 7] << 8);
      const compMethod = fileBytes[pos + 8] | (fileBytes[pos + 9] << 8);
      const compSize = fileBytes[pos + 18] | (fileBytes[pos + 19] << 8) | (fileBytes[pos + 20] << 16) | (fileBytes[pos + 21] << 24);
      const uncompSize = fileBytes[pos + 22] | (fileBytes[pos + 23] << 8) | (fileBytes[pos + 24] << 16) | (fileBytes[pos + 25] << 24);
      const nameLen = fileBytes[pos + 26] | (fileBytes[pos + 27] << 8);
      const extraLen = fileBytes[pos + 28] | (fileBytes[pos + 29] << 8);

      const nameBytes = fileBytes.subarray(pos + 30, pos + 30 + nameLen);
      const fileName = new TextDecoder('utf-8').decode(nameBytes);
      const dataStart = pos + 30 + nameLen + extraLen;

      console.log(`[Entry ${entryIndex}] name="${fileName}", flags=0x${flags.toString(16)}, method=${compMethod}, compSize=${compSize}, uncompSize=${uncompSize}, pos=${pos}`);
      
      const payloadSize = compSize > 0 ? compSize : uncompSize;
      pos = dataStart + payloadSize;
    } else {
      pos++;
    }
  }

  console.log('\n--- CALLING extractDocxText ---');
  const result = await extractDocxText(fileBytes);
  console.log('Result:', JSON.stringify(result, null, 2));
}

main().catch(err => {
  console.error('Unhandled error in test script:', err);
});
