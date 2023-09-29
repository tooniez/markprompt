import { Nango } from '@nangohq/node';

import { Project } from '@/types/types';

import { getResponseOrThrow } from '../utils';

export const getNangoServerInstance = () => {
  return new Nango({
    secretKey:
      process.env.NODE_ENV === 'production'
        ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          process.env.NANGO_SECRET_KEY_PROD!
        : // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          process.env.NANGO_SECRET_KEY_DEV!,
  });
};

export const setMetadata = async (
  projectId: Project['id'],
  integrationId: string,
  connectionId: string,
  metadata: any,
) => {
  const res = await fetch(
    `/api/project/${projectId}/integrations/nango/set-metadata`,
    {
      method: 'POST',
      body: JSON.stringify({ integrationId, connectionId, metadata }),
      headers: {
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
    },
  );
  return getResponseOrThrow<void>(res);
};

export const deleteConnection = async (
  projectId: Project['id'],
  integrationId: string,
  connectionId: string,
) => {
  const res = await fetch(
    `/api/project/${projectId}/integrations/nango/delete-connection`,
    {
      method: 'POST',
      body: JSON.stringify({ integrationId, connectionId }),
      headers: {
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
    },
  );
  return getResponseOrThrow<void>(res);
};

export const triggerSync = async (
  projectId: Project['id'],
  integrationId: string,
  connectionId: string,
  syncIds?: string[],
) => {
  const res = await fetch(
    `/api/project/${projectId}/integrations/nango/trigger-sync`,
    {
      method: 'POST',
      body: JSON.stringify({ integrationId, connectionId, syncIds }),
      headers: {
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
    },
  );
  return getResponseOrThrow<void>(res);
};

export const sourceExists = async (
  projectId: Project['id'],
  identifier: string,
): Promise<boolean> => {
  const res = await fetch(
    `/api/project/${projectId}/integrations/nango/source-exists`,
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
