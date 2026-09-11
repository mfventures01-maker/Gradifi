/**
 * GRADIFI VERIFY - BROWSER GOOGLE BOOKS PROVIDER ADAPTER
 * Browser-facing adapter calling the controlled server/edge execution boundary.
 * HOEOS Standard: ZERO client credentials, ZERO VITE_* secret reads, Provable Server Boundary.
 */

import { AcademicProvider, ProviderSearchInput, ProviderResult } from '../types';
import { handleGoogleBooksServerSearch } from '../server/googleBooksServerHandler';

export class GoogleBooksProvider implements AcademicProvider {
  readonly id = 'googlebooks' as const;

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
        const response = await fetch('/api/verify/googlebooks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ query, limit })
        });

        if (!response.ok) {
          return {
            providerId: this.id,
            status: 'unavailable',
            fineGrainedStatus: response.status === 401 || response.status === 403 ? 'AUTHENTICATION_FAILED' : 'REQUEST_FAILED',
            matches: [],
            errorMessage: `Server endpoint returned HTTP ${response.status}: ${response.statusText}`
          };
        }

        const data: ProviderResult = await response.json();
        return data;
      } else {
        return handleGoogleBooksServerSearch({ query, limit });
      }
    } catch (error: any) {
      return {
        providerId: this.id,
        status: 'error',
        fineGrainedStatus: 'REQUEST_FAILED',
        matches: [],
        errorMessage: error?.message || 'Failed to communicate with Verify Google Books server boundary'
      };
    }
  }
}
