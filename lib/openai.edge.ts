// IMPORTANT: this code needs to be able to run on the Vercel edge runtime.
// Make sure no Node.js APIs are called/imported transitively.

import { OpenAIEmbeddingsModelId } from '@markprompt/core';
import { CreateEmbeddingResponse, CreateModerationResponse } from 'openai';

import { OpenAIErrorResponse } from '@/types/types';

export interface OpenAIStreamPayload {
  model: string;
  prompt: string;
  temperature: number;
  top_p: number;
  frequency_penalty: number;
  presence_penalty: number;
  max_tokens: number;
  stream: boolean;
  n: number;
}

export const createModeration = async (
  input: string,
  byoOpenAIKey: string | undefined,
): Promise<CreateModerationResponse | OpenAIErrorResponse> => {
  return fetch('https://api.openai.com/v1/moderations', {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${byoOpenAIKey || process.env.OPENAI_API_KEY!}`,
    },
    method: 'POST',
    body: JSON.stringify({ input }),
  }).then((r) => r.json());
};

export const createEmbedding = async (
  input: string,
  byoOpenAIKey: string | undefined,
  modelId: OpenAIEmbeddingsModelId,
): Promise<CreateEmbeddingResponse | OpenAIErrorResponse> => {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${byoOpenAIKey || process.env.OPENAI_API_KEY!}`,
    },
    method: 'POST',
    body: JSON.stringify({
      model: modelId,
      input: input.trim().replaceAll('\n', ' '),
    }),
  });

  if (!res.ok) {
    const reason = await res.json();
    console.log(
      '!!! Error embedding',
      JSON.stringify(reason),
      JSON.stringify({
        model: modelId,
        input: input.trim().replaceAll('\n', ' '),
      }),
      process.env.OPENAI_API_KEY!.slice(0, 9),
    );
    throw new Error(reason);
  }

  console.log('!!! OK embedding');
  return res.json();
};
