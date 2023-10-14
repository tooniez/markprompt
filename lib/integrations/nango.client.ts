import Nango from '@nangohq/frontend';
import { isPresent } from 'ts-is-present';

import { DbSource, FileData, NangoIntegrationId, Project } from '@/types/types';

import { getConnectionId, getIntegrationId, getSyncId } from './nango';
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

export const triggerSyncs = async (
  projectId: Project['id'],
  sources: DbSource[],
) => {
  const _sources = sources
    .map((source) => {
      const connectionId = getConnectionId(source);
      const integrationId = getIntegrationId(source);
      if (!connectionId || !integrationId) {
        return undefined;
      }
      const syncIds = [getSyncId(integrationId)];
      return {
        connectionId,
        integrationId,
        syncIds,
      };
    })
    .filter(isPresent);

  const res = await fetch(
    `/api/project/${projectId}/integrations/nango/trigger-syncs`,
    {
      method: 'POST',
      body: JSON.stringify({ sources: _sources }),
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
  model: string,
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
