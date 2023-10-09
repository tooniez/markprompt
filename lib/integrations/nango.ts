import {
  DbSource,
  NangoIntegrationId,
  NangoSourceDataType,
  NangoSyncId,
} from '@/types/types';

// Currently, we use the source ID as connect ID.
export const getConnectionId = (sourceId: DbSource['id']): string => {
  return sourceId;
};

export const getIntegrationId = (
  source: Pick<DbSource, 'type' | 'data'>,
): NangoIntegrationId | undefined => {
  if (source.type !== 'nango') {
    return undefined;
  }
  return (source.data as NangoSourceDataType).integrationId;
};

// Currently, sync id and integration id are identical
export const getSyncId = (integrationId: NangoIntegrationId): NangoSyncId => {
  return integrationId;
};
