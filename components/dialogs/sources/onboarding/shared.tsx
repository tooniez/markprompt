import type Nango from '@nangohq/frontend';
import { FC, useCallback } from 'react';

import Button from '@/components/ui/Button';
import { addSource } from '@/lib/api';
import { getSyncId } from '@/lib/integrations/nango';
import {
  deleteConnection,
  triggerSyncs,
} from '@/lib/integrations/nango.client';
import { generateConnectionId } from '@/lib/utils';
import { DbSource, NangoIntegrationId, Project } from '@/types/types';

import { Step, ConnectSourceStepState } from './Step';

export const addSourceAndNangoConnection = async (
  nango: Nango,
  projectId: Project['id'],
  integrationId: NangoIntegrationId,
  name: string,
): Promise<DbSource | undefined> => {
  // Create the Nango connection. Note that nango.yaml specifies
  // `auto_start: false` to give us a chance to set the metadata
  // before we trigger the first sync.
  const connectionId = generateConnectionId();

  try {
    await nango.auth(integrationId, connectionId);

    const newSource = await addSource(projectId, 'nango', {
      integrationId,
      connectionId,
      name,
    });

    if (!newSource.id) {
      throw new Error('Unable to create source');
    }

    return newSource;
  } catch (e) {
    // If there is an error, make sure to delete the Nango connection
    try {
      deleteConnection(projectId, integrationId, connectionId);
    } catch {
      // No nothing
    }
    // Throw error from nango.auth to catch on the client side.
    throw e;
  }
  return undefined;
};

type SyncStepProps = {
  projectId: Project['id'];
  integrationId: NangoIntegrationId;
  connectionId?: string;
  state: ConnectSourceStepState;
};

export const SyncStep: FC<SyncStepProps> = ({
  projectId,
  integrationId,
  connectionId,
  state,
}) => {
  const startSyncing = useCallback(async () => {
    if (!connectionId) {
      return;
    }

    await triggerSyncs(projectId, [
      { integrationId, connectionId, syncIds: [getSyncId(integrationId)] },
    ]);
  }, [projectId, integrationId, connectionId]);

  return (
    <Step title="Sync" description="Start syncing your content." state={state}>
      <Button
        variant="cta"
        buttonSize="sm"
        onClick={startSyncing}
        disabled={state === 'not_started'}
      >
        Start sync
      </Button>
    </Step>
  );
};
