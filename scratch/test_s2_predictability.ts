import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

import { handleSemanticScholarServerSearch } from '../src/services/verify/server/semanticScholarServerHandler';

const RUNS = 5;
const DELAY_MS = 2000;
const QUERY = 'federated learning';

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function compare(sets: string[][]): {
  classification: 'DETERMINISTIC' | 'STABLE' | 'DRIFTING' | 'UNPREDICTABLE';
  intersection: string[];
  union: string[];
} {
  const first = sets[0].join('|');
  const identical = sets.every(s => s.join('|') === first);

  const intersection = sets.reduce((acc, s) => acc.filter(x => s.includes(x)));
  const union = Array.from(new Set(sets.flat())).sort();

  const sameSetDifferentOrder =
    !identical &&
    sets.every(s => s.length === intersection.length) &&
    union.length === intersection.length;

  let classification: 'DETERMINISTIC' | 'STABLE' | 'DRIFTING' | 'UNPREDICTABLE';

  if (identical) {
    classification = 'DETERMINISTIC';
  } else if (sameSetDifferentOrder) {
    classification = 'STABLE';
  } else if (intersection.length > 0) {
    classification = 'DRIFTING';
  } else {
    classification = 'UNPREDICTABLE';
  }

  return { classification, intersection, union };
}

async function main() {
  console.log('=== V4 SEMANTIC SCHOLAR PREDICTABILITY TEST ===');
  console.log(`QUERY: "${QUERY}" | RUNS: ${RUNS} | DELAY: ${DELAY_MS}ms\n`);

  const runs: { ids: string[]; status: string; fineGrainedStatus: string }[] = [];
  let count429 = 0;

  for (let i = 1; i <= RUNS; i++) {
    process.stdout.write(`  run ${i}/${RUNS}... `);
    try {
      const res = await handleSemanticScholarServerSearch({ query: QUERY, limit: 3 });
      const ids = (res.matches || []).map(m => m.sourceId).sort();
      runs.push({ ids, status: res.status, fineGrainedStatus: res.fineGrainedStatus || 'UNKNOWN' });
      console.log(`${res.fineGrainedStatus} (${ids.length} ids)`);

      if (res.fineGrainedStatus === 'RATE_LIMITED' || res.errorCode === 'HTTP_429') {
        count429++;
      }
    } catch (err: any) {
      console.log(`THREW: ${err?.message || err}`);
      runs.push({ ids: [], status: 'error', fineGrainedStatus: 'THREW' });
    }

    if (i < RUNS) {
      await sleep(DELAY_MS);
    }
  }

  console.log('\nPer-run result sets:');
  runs.forEach((r, idx) => {
    console.log(`  run ${idx + 1}: ${r.fineGrainedStatus} | [${r.ids.join(', ')}]`);
  });

  const sets = runs.map(r => r.ids);
  const { classification, intersection, union } = compare(sets);

  console.log(`\nDistinct IDs across all runs: ${union.length}`);
  console.log(`IDs present in every run:     ${intersection.length}`);
  console.log(`HTTP 429 / RATE_LIMITED count: ${count429}`);
  console.log(`Classification:               ${classification}`);

  const verifiedCount = runs.filter(r => r.fineGrainedStatus === 'VERIFIED').length;
  console.log(`Reliability (VERIFIED runs):   ${verifiedCount}/${RUNS}`);

  if (classification !== 'DETERMINISTIC' && classification !== 'STABLE') {
    console.error(`\nV4 Predictability FAILED: Classification is ${classification}`);
    process.exit(1);
  }

  if (verifiedCount < 4) {
    console.error(`\nV4 Reliability FAILED: Only ${verifiedCount}/${RUNS} runs VERIFIED`);
    process.exit(1);
  }

  if (count429 > 0) {
    console.error(`\nV4 Rate-Limit FAILED: Observed ${count429} 429/RATE_LIMITED responses`);
    process.exit(1);
  }

  console.log('\nResult: PASS');
}

main().catch(err => {
  console.error('V4 Predictability error:', err);
  process.exit(1);
});
