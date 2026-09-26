process.env.VERCEL = '1';

import { logProviderCall } from '../src/services/verify/federation/providerLogger';

(async () => {
  try {
    await logProviderCall({
      providerId: 'core',
      timestamp: new Date().toISOString(),
      url: 'https://example.org/?api_key=SECRET',
      executionTimeMs: 120,
      httpStatus: 200,
      itemCount: 3,
      cached: false
    } as any);
    console.log('PASS: logProviderCall returned without throwing');
  } catch (e: any) {
    console.error('FAIL:', e?.message ?? e);
    process.exit(1);
  }
})();
