async function main() {
  console.log('=== V3 HTTP END-TO-END PROBE ===');
  const response = await fetch('http://localhost:5174/api/verify/semanticscholar', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ query: 'federated learning', limit: 3 })
  });

  console.log('HTTP Status:', response.status, response.statusText);
  if (!response.ok) {
    console.error('V3 HTTP Probe FAILED with status', response.status);
    process.exit(1);
  }

  const data = await response.json();
  console.log('providerId:', data.providerId);
  console.log('status:', data.status);
  console.log('fineGrainedStatus:', data.fineGrainedStatus);
  console.log('matches returned:', Array.isArray(data.matches) ? data.matches.length : 0);

  if (data.fineGrainedStatus !== 'VERIFIED' || !Array.isArray(data.matches) || data.matches.length === 0) {
    console.error('V3 HTTP Probe payload validation FAILED');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('V3 HTTP Probe error:', err);
  process.exit(1);
});
