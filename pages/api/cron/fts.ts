import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';

import { serverRefreshFTSMaterializedView } from '@/lib/supabase';
import { Database } from '@/types/supabase';

type Data = {
  status?: string;
  error?: string;
};

const allowedMethods = ['POST'];

// Admin access to Supabase, bypassing RLS.
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
) {
  if (!req.method || !allowedMethods.includes(req.method)) {
    res.setHeader('Allow', allowedMethods);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  await serverRefreshFTSMaterializedView(supabaseAdmin);

  return res.status(200).send({ status: 'ok' });
}
