import { describe, expect, it } from 'vitest';

import { ModelUsageInfo } from '@/types/types';

import {
  getCompletionCredits,
  getNormalizedTokenCountForModelUsageInfos,
} from './tiers';

describe('credits', () => {
  describe('getNormalizedTokenCountForModelUsageInfos', () => {
    // const usage: ModelUsageInfo[] = [
    //   {
    //     model: 'gpt-3.5-turbo',
    //     tokens: { prompt_tokens: 240, completion_tokens: 120 },
    //   },
    //   {
    //     model: 'gpt-4',
    //     tokens: { prompt_tokens: 1920, completion_tokens: 914 },
    //   },
    // ];
    const usage: ModelUsageInfo[] = [
      {
        model: 'gpt-3.5-turbo',
        tokens: { prompt_tokens: 140, completion_tokens: 20 },
      },
      {
        model: 'gpt-4',
        tokens: { prompt_tokens: 1612, completion_tokens: 229 },
      },
      {
        model: 'gpt-4',
        tokens: { prompt_tokens: 950, completion_tokens: 12 },
      },
    ];
    // it('should normalize token count according to price factors', () => {
    //   expect(getNormalizedTokenCountForModelUsageInfos(usage)).toBe(1884);
    // });
    it('should compute credits for a completion', () => {
      // expect(getCompletionCredits(usage)).toBe(2);
      expect(getCompletionCredits(usage)).toBe(120);
    });
  });
});
