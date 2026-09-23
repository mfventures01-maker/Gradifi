/**
 * GRADIFI VERIFY - BROWSER CROSSREF PROVIDER ADAPTER
 * Browser-facing adapter calling the controlled server/edge execution boundary.
 * HOEOS Standard: ZERO client credentials, ZERO VITE_* secret reads, Provable Server Boundary.
 */

import { AcademicProvider, ProviderSearchInput, ProviderResult } from '../types';
import { handleCrossrefServerSearch } from '../server/crossrefServerHandler';

export class CrossrefProvider implements AcademicProvider {
  readonly id = 'crossref' as const;

  async search(input: ProviderSearchInput): Promise<ProviderResult> {
    const limit = input.limit || 5;
    const query = input.query || input.documentText.slice(0, 200);

    if (!query.trim()) {
      return {
        providerId: this.id,
        status: 'partial',
        fineGrainedStatus: 'EMPTY_RESULT',
        matches: [],
        rawCount: 0
      };
    }

    try {
      const isBrowser = typeof window !== 'undefined';
      if (isBrowser) {
        const response = await fetch('/api/verify/crossref', {
          method: 'POST',
          signal: AbortSignal.timeout(10000),
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ query, limit })
        });

        if (response.ok) {
          return await response.json();
        }
      }

      return handleCrossrefServerSearch({ query, limit });
    } catch (error: any) {
      return {
        providerId: this.id,
        status: 'error',
        fineGrainedStatus: 'REQUEST_FAILED',
        matches: [],
        errorMessage: error?.message || 'Failed to connect to Crossref API'
      };
    }
  }
}
