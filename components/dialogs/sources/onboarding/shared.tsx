import type Nango from '@nangohq/frontend';
import { FC, useCallback } from 'react';

import Button from '@/components/ui/Button';
import { addSource, deleteSource } from '@/lib/api';
import { getConnectionId, getSyncId } from '@/lib/integrations/nango';
import { deleteConnection, triggerSync } from '@/lib/integrations/nango.client';
import { DbSource, NangoSourceDataType, Project } from '@/types/types';

import { Step, ConnectSourceStepState } from './Step';

export const addSourceAndNangoConnection = async (
  nango: Nango,
  projectId: Project['id'],
  integrationId: NangoSourceDataType['integrationId'],
): Promise<DbSource | undefined> => {
  const newSource = await addSource(projectId, 'nango', {
    integrationId,
  });

  if (!newSource.id) {
    throw new Error('Unable to create source');
  }

  // Create the Nango connection. Note that nango.yaml specifies
  // `auto_start: false` to give us a chance to set the metadata
  // before we trigger the first sync.
  try {
    const connectionId = getConnectionId(newSource.id);

    // Authorize
    const result = await nango.auth(integrationId, connectionId);

    if ('message' in result) {
      // Nango AuthError
      throw new Error(result.message);
    }

    return newSource;
  } catch (e) {
    // If there is an error, make sure to delete the connection
    await deleteConnection(projectId, integrationId, newSource.id);
    await deleteSource(projectId, newSource.id);
    throw e;
  }

  return undefined;
};

type SyncStepProps = {
  projectId: Project['id'];
  integrationId: NangoSourceDataType['integrationId'];
  connectionId?: string;
  state: ConnectSourceStepState;
};

export const SyncStep: FC<SyncStepProps> = ({
  projectId,
  integrationId,
  connectionId,
  state,
}) => {
  const trigger = useCallback(async () => {
    if (!connectionId) {
      return;
    }

    await triggerSync(projectId, integrationId, connectionId, [
      getSyncId(integrationId),
    ]);
  }, [projectId, integrationId, connectionId]);

  return (
    <Step title="Sync" description="Start syncing your content." state={state}>
      <Button
        variant="cta"
        buttonSize="sm"
        onClick={trigger}
        disabled={state === 'not_started'}
      >
        Start sync
      </Button>
    </Step>
  );
};
