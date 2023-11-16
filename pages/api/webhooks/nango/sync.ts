import type { NextApiRequest, NextApiResponse } from 'next';

import { shouldPauseSync } from '@/lib/integrations/nango.server';
import { createServiceRoleSupabaseClient } from '@/lib/supabase';

import { inngest } from '../../inngest';
import type { NangoSyncPayload } from '../../inngest';

type Data =
  | {
      status?: string;
      error?: string;
    }
  | { content: string };

const allowedMethods = ['POST'];

// This webhook is called whenever Nango finishes a sync. It sends a message
// to Inngest for indexing the new Nango data. It also pauses the sync unless
// the tier has auto-sync available.
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
) {
  if (!req.method || !allowedMethods.includes(req.method)) {
    res.setHeader('Allow', allowedMethods);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  console.debug('[NANGO] Webhook called', JSON.stringify(req.body));

  const nangoSyncPayload = req.body as NangoSyncPayload;

  const supabase = createServiceRoleSupabaseClient();

  // If this is a non-enterprise project, pause the sync
  const shouldPause = await shouldPauseSync(supabase, nangoSyncPayload);

  await inngest.send({
    name: 'nango/sync',
    data: { nangoSyncPayload, shouldPause },
  });

  return res.status(200).json({});
}
