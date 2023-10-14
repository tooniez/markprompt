import type { NextApiRequest, NextApiResponse } from 'next';

import {
  getNangoServerInstance,
  getSourceId,
} from '@/lib/integrations/nango.server';
import { withProjectAccess } from '@/lib/middleware/common';
import {
  createServiceRoleSupabaseClient,
  getOrCreateRunningSyncQueueForSource,
} from '@/lib/supabase';
import { NangoIntegrationId, NangoSyncId } from '@/types/types';

type Data = {
  status?: string;
  error?: string;
};

const allowedMethods = ['POST'];

const nango = getNangoServerInstance();

const supabase = createServiceRoleSupabaseClient();

type SourceInfo = {
  integrationId: NangoIntegrationId;
  connectionId: string;
  syncIds?: NangoSyncId[];
};

const triggerSyncForSource = async (sourceInfo: SourceInfo) => {
  if (!sourceInfo.integrationId || !sourceInfo.connectionId) {
    return;
  }

  const sourceId = await getSourceId(supabase, sourceInfo.connectionId);

  if (!sourceId) {
    throw new Error('Source not found.');
  }

  await getOrCreateRunningSyncQueueForSource(supabase, sourceId);

  await nango.triggerSync(
    sourceInfo.integrationId,
    sourceInfo.connectionId,
    sourceInfo.syncIds,
  );
};

export default withProjectAccess(
  allowedMethods,
  async (req: NextApiRequest, res: NextApiResponse<Data>) => {
    if (req.method === 'POST') {
      return res.status(200).json({});
    }

    const sources = req.body.sources as SourceInfo[];
    try {
      await Promise.all(sources.map(triggerSyncForSource));
    } catch {
      // Do nothing
    }

    return res.status(400).end();
  },
);
