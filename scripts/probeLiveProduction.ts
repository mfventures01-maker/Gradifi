/**
 * HOEOS PRODUCTION PROVIDER PROBE (Gate 18 & Gate 19)
 */

async function main() {
  console.log('====================================================');
  console.log('PROBING LIVE PRODUCTION: https://gradifi.vercel.app');
  console.log('====================================================\n');

  // Probe Nemotron with empty matches to elicit []
  console.log('1. Probing POST /api/verify/nemotron ...');
  const nemoResp = await fetch('https://gradifi.vercel.app/api/verify/nemotron', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      documentText: 'Photosynthesis converts solar light energy into chemical energy stored in glucose molecules.',
      matches: []
    })
  });

  const nemoHttp = nemoResp.status;
  const nemoText = await nemoResp.text();
  console.log(`HTTP Status: ${nemoHttp}`);
  console.log('Response Body:', nemoText);

  // Probe Gemini
  console.log('\n2. Probing POST /api/verify/gemini ...');
  const gemResp = await fetch('https://gradifi.vercel.app/api/verify/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      documentText: 'Photosynthesis converts solar light energy into chemical energy stored in glucose molecules.',
      matches: []
    })
  });

  const gemHttp = gemResp.status;
  const gemText = await gemResp.text();
  console.log(`HTTP Status: ${gemHttp}`);
  console.log('Response Body:', gemText);
}

main().catch(err => {
  console.error('Probe failed:', err);
  process.exit(1);
});
