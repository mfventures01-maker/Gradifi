import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function readContract(path: string): string {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

// Browser code uses .js import specifiers for Vite/TypeScript resolution;
// Deno Edge code uses .ts. Normalize only that runtime-specific suffix.
function normalizeRelativeImportExtensions(source: string): string {
  return source.replace(/(["'])(\.{1,2}\/[^"']+)\.js\1/g, '$1$2.ts$1');
}

const parityPairs = [
  {
    name: 'G5 deterministic engine',
    browser: '../src/services/verify/deterministicEngine.ts',
    edge: '../supabase/functions/_shared/verify/deterministicEngine.ts',
  },
  {
    name: 'G5 document normalizer',
    browser: '../src/services/verify/documentNormalizer.ts',
    edge: '../supabase/functions/_shared/verify/documentNormalizer.ts',
  },
  {
    name: 'G5 evidence types',
    browser: '../src/services/verify/types.ts',
    edge: '../supabase/functions/_shared/verify/types.ts',
  },
  {
    name: 'G3 evidence policy consumed by G5',
    browser: '../src/services/verify/plagiarismPolicy.ts',
    edge: '../supabase/functions/_shared/verify/plagiarismPolicy.ts',
  },
];

describe('G5 browser/Edge source contract parity', () => {
  for (const pair of parityPairs) {
    it(pair.name + ' is identical after runtime import-extension normalization', () => {
      const browserSource = normalizeRelativeImportExtensions(readContract(pair.browser));
      const edgeSource = normalizeRelativeImportExtensions(readContract(pair.edge));
      expect(edgeSource).toBe(browserSource);
    });
  }
});
