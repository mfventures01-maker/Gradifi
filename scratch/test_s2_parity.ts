import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

import { handleSemanticScholarServerSearch } from '../src/services/verify/server/semanticScholarServerHandler';

async function main() {
  console.log('=== V5 DOCUMENT TEXT FORWARDING PARITY TEST ===\n');

  const documentTextFixture = 'Federated learning (FL) is a machine learning setting where many clients collaboratively train a model under the orchestration of a central server while keeping the training data decentralized.';

  const res = await handleSemanticScholarServerSearch({
    query: 'federated learning',
    documentText: documentTextFixture,
    limit: 3
  });

  console.log(`Total sources returned: ${res.matches.length}`);
  let matchedCount = 0;

  res.matches.forEach((m, idx) => {
    const hasMatch = Boolean(m.matchedText && m.matchedText.length > 0);
    if (hasMatch) matchedCount++;
    console.log(`\nSource ${idx + 1}: ${m.sourceId}`);
    console.log(`  Title: ${m.title}`);
    console.log(`  matchedText non-empty: ${hasMatch}`);
    console.log(`  matchedText snippet: "${m.matchedText.slice(0, 100)}..."`);
    console.log(`  matchType: ${m.matchType}`);
    console.log(`  matchPercentage: ${m.matchPercentage}%`);
  });

  console.log(`\nSources with non-empty matchedText: ${matchedCount}/${res.matches.length}`);

  if (matchedCount === 0) {
    console.error('V5 Forwarding Parity FAILED: zero sources had non-empty matchedText');
    process.exit(1);
  }

  console.log('\nResult: PASS (Input-forwarding parity verified)');
}

main().catch(err => {
  console.error('V5 Parity error:', err);
  process.exit(1);
});
