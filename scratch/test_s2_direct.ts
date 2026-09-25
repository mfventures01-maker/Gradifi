import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

async function main() {
  const apiKey = process.env.SEMANTIC_SCHOLAR_API_KEY;
  console.log('Testing key presence:', apiKey ? 'PRESENT' : 'MISSING');

  const fetchUrl = 'https://api.semanticscholar.org/graph/v1/paper/search?query=federated+learning&limit=3&fields=title,abstract,year,authors,externalIds,openAccessPdf';

  const res = await fetch(fetchUrl, {
    method: 'GET',
    headers: {
      'x-api-key': apiKey || '',
      'Accept': 'application/json',
      'User-Agent': 'GradifiVerify/1.0'
    }
  });

  console.log('HTTP Status:', res.status, res.statusText);
  const data = await res.json();
  console.log('Response:', JSON.stringify(data, null, 2));

  if (res.status !== 200) {
    console.error('V1 Probe FAILED with status', res.status);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('V1 Probe error:', err);
  process.exit(1);
});
