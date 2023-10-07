import type { NextApiRequest, NextApiResponse } from 'next';

import { NangoFile } from '@/external/nango-integrations/models';
import { getNangoServerInstance } from '@/lib/integrations/nango.server';
import { createServiceRoleSupabaseClient } from '@/lib/supabase';
import {
  DbSource,
  NangoSourceDataType,
  QueryStatsProcessingResponseData,
} from '@/types/types';

export const config = {
  maxDuration: 300,
};

type Data =
  | {
      status?: string;
      error?: string;
    }
  | QueryStatsProcessingResponseData;

const allowedMethods = ['GET'];

const nango = getNangoServerInstance();

// Admin access to Supabase, bypassing RLS.
const supabaseAdmin = createServiceRoleSupabaseClient();

const getNextSourceToSync = async (): Promise<DbSource | undefined> => {
  return undefined;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
) {
  if (!req.method || !allowedMethods.includes(req.method)) {
    res.setHeader('Allow', allowedMethods);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  // Fetch source that needs to be synced
  const source = await getNextSourceToSync();

  if (!source) {
    // Nothing to sync
    return;
  }

  const integrationId = (source.data as NangoSourceDataType).integrationId;
  const connectionId = source.id;

  // Fetch records from Nango associated to a connection
  const records = await nango.getRecords<NangoFile>({
    providerConfigKey: integrationId,
    connectionId,
    model: 'NangoFile',
    delta: 'enter-delta-here',
  });

  // The OpenAI rate limit for text-ada-001 is currently at 250,000 tokens
  // per minute and 3,000 requests per minute.
  // Source: https://platform.openai.com/account/rate-limits

  return res.status(200).send({ status: 'ok' });
}
