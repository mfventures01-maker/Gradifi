import fs from 'fs';
import crypto from 'crypto';
import { extractDocxText } from '../src/services/verify/ingestionAdapters/officeZipAdapter';

interface FixtureTarget {
  name: string;
  path: string;
}

const fixtures: FixtureTarget[] = [
  {
    name: 'DIGITAL THERMOMETER real.docx',
    path: 'C:\\Users\\faith\\Downloads\\DIGITAL THERMOMETER real.docx'
  },
  {
    name: 'Design and Construction of a Joystick-Controlled Industrial automation System.docx',
    path: 'C:\\Users\\faith\\Downloads\\Design and Construction of a Joystick-Controlled Industrial automation System.docx'
  }
];

function sha256(text: string): string {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

async function runDeterminismTest() {
  let allDeterministic = true;
  console.log('=== HOEOS INGESTION DETERMINISM TEST ===\n');

  for (const fixture of fixtures) {
    console.log(`=== ${fixture.name} ===`);
    if (!fs.existsSync(fixture.path)) {
      console.error(`ERROR: Fixture file not found: ${fixture.path}`);
      process.exit(1);
    }

    const fileBytes = fs.readFileSync(fixture.path);
    const hashes: string[] = [];
    let chars = 0;
    let words = 0;

    for (let run = 1; run <= 5; run++) {
      const res = await extractDocxText(fileBytes);
      if (!res.success) {
        console.error(`  run ${run}: FAILED extraction: ${JSON.stringify(res.error)}`);
        hashes.push(`ERROR_${run}`);
        continue;
      }
      chars = res.characterCount;
      words = res.wordCount;
      const hash = sha256(res.text);
      hashes.push(hash);
      console.log(`  run ${run}: chars=${chars} words=${words} sha=${hash}`);
    }

    const firstHash = hashes[0];
    const isDeterministic = hashes.every(h => h === firstHash);

    if (isDeterministic) {
      console.log('Classification: DETERMINISTIC\n');
    } else {
      console.log('Classification: UNSTABLE\n');
      allDeterministic = false;
    }
  }

  if (allDeterministic) {
    console.log(`SUMMARY: ${fixtures.length}/${fixtures.length} files DETERMINISTIC`);
  } else {
    console.error('SUMMARY: INGESTION DETERMINISM TEST FAILED (UNSTABLE)');
    process.exit(1);
  }
}

runDeterminismTest().catch(err => {
  console.error('Unhandled error in determinism test:', err);
  process.exit(1);
});
