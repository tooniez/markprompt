import { NangoIntegrationId } from '@/types/types';

export type SalesforceEnvironment = 'production' | 'sandbox';

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
