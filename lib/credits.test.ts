import { describe, expect, it } from 'vitest';

import { ModelUsageInfo } from '@/types/types';

import { getNormalizedTokenCountForModelUsageInfos } from './credits';

describe('credits', () => {
  describe('getNormalizedTokenCountForModelUsageInfos', () => {
    const usage: ModelUsageInfo[] = [
      {
        model: 'gpt-3.5-turbo',
        tokens: {
          prompt_tokens: 140,
          completion_tokens: 20,
        },
      },
      {
        model: 'gpt-4',
        tokens: {
          prompt_tokens: 1420,
          completion_tokens: 214,
        },
      },
    ];
    it('should normalize token count according to price factors', () => {
      expect(getNormalizedTokenCountForModelUsageInfos(usage)).toBe(928);
    });
  });
});
