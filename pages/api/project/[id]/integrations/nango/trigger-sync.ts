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

type Data = {
  status?: string;
  error?: string;
};

const allowedMethods = ['POST'];

const nango = getNangoServerInstance();

const supabase = createServiceRoleSupabaseClient();

export default withProjectAccess(
  allowedMethods,
  async (req: NextApiRequest, res: NextApiResponse<Data>) => {
    if (req.method === 'POST') {
      if (!req.body.integrationId) {
        return res.status(400).json({ error: 'No integration id provided.' });
      } else if (!req.body.connectionId) {
        return res.status(400).json({ error: 'No connection id provided.' });
      }

      const sourceId = await getSourceId(supabase, req.body.connectionId);

      if (!sourceId) {
        return res.status(400).json({ error: 'Source not found.' });
      }

      await getOrCreateRunningSyncQueueForSource(supabase, sourceId);

      await nango.triggerSync(
        req.body.integrationId,
        req.body.connectionId,
        req.body.syncIds,
      );

      return res.status(200).json({});
    }

    return res.status(400).end();
  },
);
