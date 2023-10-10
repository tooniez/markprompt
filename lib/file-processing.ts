import { backOff } from 'exponential-backoff';

import { EMBEDDING_MODEL, MIN_SECTION_CONTENT_LENGTH } from './constants';
import { createEmbedding } from './openai.edge';

export const createSectionEmbedding = async (
  chunk: string,
): Promise<{ embedding: number[]; tokenCount: number } | undefined> => {
  if (chunk.length < MIN_SECTION_CONTENT_LENGTH) {
    return undefined;
  }

  const embeddingResponse = await backOff(
    () => createEmbedding(chunk, undefined, EMBEDDING_MODEL),
    {
      startingDelay: 10000,
      numOfAttempts: 10,
    },
  );

  return {
    embedding: embeddingResponse.data[0].embedding,
    tokenCount: embeddingResponse.usage.total_tokens ?? 0,
  };
};
