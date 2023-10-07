import { DbSource, NangoIntegrationId } from '@/types/types';

export type SalesforceEnvironment = 'production' | 'sandbox';

// Must match nango.yaml definition.
export type NangoSyncId =
  | 'salesforce-knowledge'
  | 'salesforce-knowledge-sandbox'
  | 'salesforce-case'
  | 'salesforce-case-sandbox';

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

export const getKnowledgeIntegrationId = (
  environment: SalesforceEnvironment,
): NangoIntegrationId => {
  return environment === 'production'
    ? 'salesforce-knowledge'
    : 'salesforce-knowledge-sandbox';
};

export const getCaseIntegrationId = (
  environment: SalesforceEnvironment,
): NangoIntegrationId => {
  return environment === 'production'
    ? 'salesforce-case'
    : 'salesforce-case-sandbox';
};

export const getSyncId = (
  integrationId: NangoIntegrationId,
): NangoSyncId | undefined => {
  switch (integrationId) {
    case 'salesforce-knowledge':
      return 'salesforce-knowledge';
    case 'salesforce-knowledge-sandbox':
      return 'salesforce-knowledge-sandbox';
    case 'salesforce-case':
      return 'salesforce-case';
    case 'salesforce-case-sandbox':
      return 'salesforce-case-sandbox';
    default:
      return undefined;
  }
};
