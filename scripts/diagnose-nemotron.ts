import { handleNemotronServerReasoning } from '../src/services/verify/server/nemotronServerHandler';

async function main() {
  const r = await handleNemotronServerReasoning({
    documentText: 'The quick brown fox jumps over the lazy dog.',
    matches: []
  });

  console.log('=== NEMOTRON DIAGNOSTIC ===');
  console.log('Status:', r.status);
  console.log('Error message:', r.errorMessage || '(none)');
  console.log('Findings count:', r.findings.length);
  console.log('');
  console.log('Full response:');
  console.log(JSON.stringify(r, null, 2));
}

main().catch(err => {
  console.error('DIAGNOSTIC FAILED:', err);
  process.exit(1);
});
