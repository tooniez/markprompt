import Nango from '@nangohq/frontend';

import { FileData, NangoIntegrationId, Project } from '@/types/types';

import { NangoModel } from './salesforce';
import { getResponseOrThrow } from '../utils';

export const getNangoClientInstance = () => {
  return new Nango({
    publicKey: process.env.NEXT_PUBLIC_NANGO_PUBLIC_KEY!,
  });
};

export const setMetadata = async (
  projectId: Project['id'],
  integrationId: NangoIntegrationId,
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
  integrationId: NangoIntegrationId,
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
  integrationId: NangoIntegrationId,
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

export const getRecords = async (
  projectId: Project['id'],
  integrationId: NangoIntegrationId,
  connectionId: string,
  model: NangoModel,
  delta: string | undefined,
  offset: number | undefined,
  limit: number | undefined,
  sortBy: string | undefined,
  order: 'asc' | 'desc' | undefined,
  filter: 'added' | 'updated' | 'deleted' | undefined,
): Promise<FileData[]> => {
  const res = await fetch(
    `/api/project/${projectId}/integrations/nango/get-records`,
    {
      method: 'POST',
      body: JSON.stringify({
        integrationId,
        connectionId,
        model,
        delta,
        offset,
        limit,
        sortBy,
        order,
        filter,
      }),
      headers: {
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
    },
  );

  const data = await getResponseOrThrow<{ fileData: FileData[] }>(res);

  return data.fileData;
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
