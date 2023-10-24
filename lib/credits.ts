import { OpenAIChatCompletionsModelId } from '@markprompt/core';

import { ModelUsageInfo } from '@/types/types';

// This reflects the OpenAI prices, with GPT-4 output token price
// as baseline. In this setup, a typical message adds up to 1000
// GPT-4 output tokens (e.g. 1800 GPT-4 input tokens and 200 GPT-4
// output tokens).
const getPriceFactor = (
  model: OpenAIChatCompletionsModelId,
  type: 'input' | 'output',
) => {
  switch (model) {
    case 'gpt-4':
      return type === 'output' ? 1 : 0.5;
    case 'gpt-4-32k':
      return type === 'output' ? 2 : 1;
    case 'gpt-3.5-turbo':
      return type === 'output' ? 1 / 30 : 1 / 40;
  }
};

const getNormalizedTokenCountForModelUsageInfo = (
  infos: ModelUsageInfo,
): number => {
  let tokens = 0;
  // Input
  if (infos.tokens?.prompt_tokens) {
    tokens += infos.tokens.prompt_tokens * getPriceFactor(infos.model, 'input');
  }
  // Output
  if (infos.tokens?.completion_tokens) {
    tokens +=
      infos.tokens.completion_tokens * getPriceFactor(infos.model, 'output');
  }
  return Math.round(tokens);
};

export const getNormalizedTokenCountForModelUsageInfos = (
  infos: ModelUsageInfo[],
) => {
  return infos.reduce((acc, info) => {
    return acc + getNormalizedTokenCountForModelUsageInfo(info);
  }, 0);
};

export const getCreditsForCompletion = (infos: ModelUsageInfo[]) => {
  return infos.reduce((acc, info) => {
    return acc + getNormalizedTokenCountForModelUsageInfos(info);
  }, 0);
};
