import { describe, expect, it } from 'vitest';

import { formatNumber } from './utils';

describe('utils', () => {
  describe('formatNumber', () => {
    it('should format numbers', () => {
      expect(formatNumber(1)).toBe('1');
    });
  });
});
