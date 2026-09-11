/**
 * GRADIFI VERIFY - BROWSER CORE PROVIDER ADAPTER
 * Browser-facing adapter calling the controlled server/edge execution boundary.
 * HOEOS Standard: ZERO client credentials, ZERO VITE_* secret reads, Provable Server Boundary.
 */

import { AcademicProvider, ProviderSearchInput, ProviderResult } from '../types';
import { handleCoreServerSearch } from '../server/coreServerHandler';

export class CoreProvider implements AcademicProvider {
  readonly id = 'core' as const;

  async search(input: ProviderSearchInput): Promise<ProviderResult> {
    const limit = input.limit || 5;
    const query = input.query || input.documentText.slice(0, 200);

    if (!query.trim()) {
      return {
        providerId: this.id,
        status: 'partial',
        matches: [],
        rawCount: 0
      };
    }

    try {
      const isBrowser = typeof window !== 'undefined';

      if (isBrowser) {
        // Controlled server/edge boundary call in browser environment
        const response = await fetch('/api/verify/core', {
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
            matches: [],
            errorMessage: `Server endpoint returned HTTP ${response.status}: ${response.statusText}`
          };
        }

        const data: ProviderResult = await response.json();
        return data;
      } else {
        // Direct server execution boundary in Node/Test environment
        return handleCoreServerSearch({ query, limit });
      }
    } catch (error: any) {
      return {
        providerId: this.id,
        status: 'error',
        matches: [],
        errorMessage: error?.message || 'Failed to communicate with Verify CORE server boundary'
      };
    }
  }
}
