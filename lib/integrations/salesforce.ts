import { DbSource, Project } from '@/types/types';

import { getResponseOrThrow } from '../utils';

export type SalesforceEnvironment = 'production' | 'sandbox';

// Must match nango.yaml definition.
export const SALESFORCE_ARTICLES_SYNC_ID = 'salesforce-articles';

export type SalesforceNangoMetadata = {
  customFields: string[] | undefined;
  filters: string | undefined;
  titleMapping: string | undefined;
  contentMapping: string | undefined;
  pathMapping: string | undefined;
};

export const getIntegrationId = (environment: SalesforceEnvironment) => {
  return environment === 'production' ? 'salesforce' : 'salesforce-sandbox';
};

export const getConnectionId = (
  integrationId: string,
  sourceId: DbSource['id'],
) => {
  return `${integrationId}:${sourceId}`;
};

export const getProviderConfigKey = (environment: SalesforceEnvironment) => {
  return environment === 'production'
    ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      process.env.NEXT_PUBLIC_NANGO_INTEGRATION_KEY_SALESFORCE!
    : // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      process.env.NEXT_PUBLIC_NANGO_INTEGRATION_KEY_SALESFORCE_SANDBOX!;
};

export const sourceExists = async (
  projectId: Project['id'],
  identifier: string,
): Promise<boolean> => {
  const res = await fetch(
    `/api/project/${projectId}/integrations/salesforce-knowledge/source-exists`,
    {
      method: 'POST',
      body: JSON.stringify({
        identifier,
      }),
      headers: { 'Content-Type': 'application/json' },
    },
  );

  const existsRes = await getResponseOrThrow<{ exists: boolean }>(res);
  return existsRes.exists;
};
