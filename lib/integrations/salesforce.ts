import { NangoIntegrationId } from '@/types/types';

export type SalesforceEnvironment = 'production' | 'sandbox';

// Must match nango.yaml definition.
export const SALESFORCE_ARTICLES_SYNC_ID = 'salesforce-articles';

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
