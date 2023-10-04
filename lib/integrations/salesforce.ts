import { DbSource, NangoIntegrationId } from '@/types/types';

export type SalesforceEnvironment = 'production' | 'sandbox';

// Must match nango.yaml definition.
export type NangoSyncId = 'salesforce-articles';
export type NangoModel = 'NangoFile';

export type SalesforceNangoMetadata = {
  customFields: string[] | undefined;
  filters: string | undefined;
  mappings: {
    title: string | undefined;
    content: string | undefined;
    path: string | undefined;
  };
  metadataFields: string[] | undefined;
};

export const getIntegrationId = (
  environment: SalesforceEnvironment,
): NangoIntegrationId => {
  return environment === 'production' ? 'salesforce' : 'salesforce-sandbox';
};

// Currently, we use the source ID as connect ID.
export const getConnectionId = (sourceId: DbSource['id']): string => {
  return sourceId;
};

export const getSyncId = (
  integrationId: NangoIntegrationId,
): NangoSyncId | undefined => {
  switch (integrationId) {
    case 'salesforce':
    case 'salesforce-sandbox':
      return 'salesforce-articles';
    default:
      return undefined;
  }
};
