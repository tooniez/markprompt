import type { NextApiRequest, NextApiResponse } from 'next';

import { getSourceSyncData } from '@/lib/integrations/nango.server';
import { getTier } from '@/lib/stripe/tiers';
import {
  createServiceRoleSupabaseClient,
  getProjectIdFromSource,
} from '@/lib/supabase';

import { inngest } from '../../inngest';
import type { NangoSyncPayload } from '../../inngest';

type Data =
  | {
      status?: string;
      error?: string;
    }
  | { content: string };

const allowedMethods = ['POST'];

const shouldPauseSync = async (nangoSyncPayload: NangoSyncPayload) => {
  // If this is a non-enterprise project, pause the sync
  const supabase = createServiceRoleSupabaseClient();
  const sourceSyncData = await getSourceSyncData(
    supabase,
    nangoSyncPayload.connectionId,
  );

  if (!sourceSyncData) {
    return true;
  }

  const projectId = await getProjectIdFromSource(supabase, sourceSyncData.id);

  const { data } = await supabase
    .from('teams')
    .select('stripe_price_id,plan_details,projects (id)')
    .eq('projects.id', projectId)
    .limit(1)
    .maybeSingle();

  if (!data) {
    return true;
  }

  const tier = getTier({
    plan_details: data.plan_details,
    stripe_price_id: data.stripe_price_id,
  });
};

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

  await inngest.send({
    name: 'nango/sync',
    data: nangoSyncPayload,
  });

  return res.status(200).json({});
}
