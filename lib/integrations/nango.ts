import {
  DbSource,
  NangoIntegrationId,
  NangoSourceDataType,
  NangoSyncId,
} from '@/types/types';

export const getConnectionId = (source: DbSource): string | undefined => {
  if (source.type !== 'nango') {
    return undefined;
  }
  return (source.data as NangoSourceDataType).connectionId;
};

// Currently, sync id and integration id are identical
export const getSyncId = (integrationId: NangoIntegrationId): NangoSyncId => {
  return integrationId;
};

export const getIntegrationId = (
  source: Pick<DbSource, 'type' | 'data'>,
): NangoIntegrationId | undefined => {
  if (source.type !== 'nango') {
    return undefined;
  }
  return (source.data as NangoSourceDataType).integrationId;
};

export const integrationRequiresAuth = (integrationId: NangoIntegrationId) => {
  switch (integrationId) {
    case 'notion-pages':
    case 'salesforce-case':
    case 'salesforce-case-sandbox':
    case 'salesforce-knowledge':
    case 'salesforce-knowledge-sandbox':
      return true;
  }
};

export const getIntegrationName = (integrationId: NangoIntegrationId) => {
  switch (integrationId) {
    case 'notion-pages':
      return 'Notion';
    case 'salesforce-case':
    case 'salesforce-case-sandbox':
      return 'Salesforce Case';
    case 'salesforce-knowledge':
    case 'salesforce-knowledge-sandbox':
      return 'Salesforce Knowledge';
  }
};
