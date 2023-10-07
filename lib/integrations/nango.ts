import { DbSource } from '@/types/types';

// Currently, we use the source ID as connect ID.
export const getConnectionId = (sourceId: DbSource['id']): string => {
  return sourceId;
};
