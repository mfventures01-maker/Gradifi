import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

import { handleSemanticScholarServerSearch } from '../src/services/verify/server/semanticScholarServerHandler';

async function main() {
  const documentText = 'Federated learning (FL) is a machine learning setting where many clients collaboratively train a model under the orchestration of a central server while keeping the training data decentralized.';

  console.log('=== V2 HANDLER DIRECT INVOCATION ===');
  const res = await handleSemanticScholarServerSearch({
    query: 'federated learning',
    documentText,
    limit: 3
  });

  console.log('providerId:', res.providerId);
  console.log('status:', res.status);
  console.log('fineGrainedStatus:', res.fineGrainedStatus);
  console.log('matches returned:', res.matches.length);

  if (res.matches.length > 0) {
    console.log('\nFirst match sample:');
    const first = res.matches[0];
    console.log('  sourceId:', first.sourceId);
    console.log('  title:', first.title);
    console.log('  authors:', first.authors.join(', '));
    console.log('  doi:', first.doi);
    console.log('  url:', first.url);
    console.log('  matchedText:', first.matchedText);
    console.log('  matchType:', first.matchType);
    console.log('  matchPercentage:', first.matchPercentage);
    console.log('  provenanceState:', first.provenance.provenanceState);
    console.log('  fineGrainedStatus:', first.provenance.fineGrainedStatus);
  }

  if (res.fineGrainedStatus !== 'VERIFIED' || res.matches.length === 0) {
    console.error('V2 Handler Direct FAILED');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('V2 Handler error:', err);
  process.exit(1);
});
