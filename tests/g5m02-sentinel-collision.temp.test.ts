import { describe, it, expect } from 'vitest';
import { segmentDocument } from '../src/services/verify/documentNormalizer';

describe('G5-M02 sentinel collision contract', () => {
  it('throws when raw text contains U+E000', () => {
    // Build the poisoned string using String.fromCharCode so the
    // sentinel is the actual Unicode code point, not an escape sequence.
    const sentinel = String.fromCharCode(0xE000);
    const poisoned = 'This is a test.' + sentinel + ' Continuation.';

    expect(poisoned.length).toBe('This is a test.'.length + 1 + ' Continuation.'.length);

    expect(() => segmentDocument(poisoned, 'E')).toThrow(/sentinel collision/i);
  });

  it('does not throw for raw text without the sentinel', () => {
    const clean = 'This is a test. This is a continuation.';
    const result = segmentDocument(clean, 'C');
    expect(result.paragraphs.length).toBeGreaterThan(0);
  });
});
