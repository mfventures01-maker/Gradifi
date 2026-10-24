/**
 * Probe Production with Evidence Matches
 */

async function main() {
  const matchPayload = {
    documentText: "Glycolysis is the metabolic pathway that converts glucose into pyruvate, generating adenosine triphosphate (ATP) in the cytoplasm.",
    matches: [
      {
        sourceId: "SRC-PROD-001",
        title: "Cellular Metabolism and Energy Production",
        authors: ["Biochemistry Faculty"],
        doi: "10.1000/bio123",
        matchPercentage: 85,
        matchType: "exact",
        matchedText: "Glycolysis is the metabolic pathway that converts glucose into pyruvate, generating adenosine triphosphate (ATP) in the cytoplasm.",
        originalSnippet: "Glycolysis is the metabolic pathway that converts glucose into pyruvate, generating adenosine triphosphate (ATP) in the cytoplasm."
      }
    ]
  };

  console.log('1. Probing Nemotron with matching evidence...');
  const nemoResp = await fetch('https://gradifi.vercel.app/api/verify/nemotron', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(matchPayload)
  });
  console.log('Nemotron status:', nemoResp.status);
  console.log('Nemotron body:', await nemoResp.text());

  console.log('\n2. Probing Gemini with matching evidence...');
  const gemResp = await fetch('https://gradifi.vercel.app/api/verify/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(matchPayload)
  });
  console.log('Gemini status:', gemResp.status);
  console.log('Gemini body:', await gemResp.text());
}

main().catch(console.error);
