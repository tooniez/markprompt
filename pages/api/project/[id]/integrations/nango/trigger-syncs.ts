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
import { SyncData } from '@/types/types';

type Data = {
  status?: string;
  error?: string;
};

const allowedMethods = ['POST'];

const nango = getNangoServerInstance();

const supabase = createServiceRoleSupabaseClient();

const triggerSyncForSource = async (data: SyncData) => {
  if (!data.integrationId || !data.connectionId) {
    return;
  }

  const sourceId = await getSourceId(supabase, data.connectionId);

  if (!sourceId) {
    throw new Error('Source not found.');
  }

  await getOrCreateRunningSyncQueueForSource(supabase, sourceId);

  console.log(
    'Trigger sync',
    data.integrationId,
    data.connectionId,
    data.syncIds,
  );
  await nango.triggerSync(data.integrationId, data.connectionId, data.syncIds);
};

export default withProjectAccess(
  allowedMethods,
  async (req: NextApiRequest, res: NextApiResponse<Data>) => {
    if (req.method === 'POST') {
      const data = req.body.data as SyncData[];
      await Promise.all(
        data.map(async (d) => {
          try {
            await triggerSyncForSource(d);
          } catch {
            // Do nothing
          }
        }),
      );

      return res.status(200).json({ status: 'ok' });
    }

    return res.status(400).end();
  },
);
