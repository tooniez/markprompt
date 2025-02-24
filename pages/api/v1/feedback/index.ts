import { createClient } from '@supabase/supabase-js';
import { NextApiRequest, NextApiResponse } from 'next';

import { Database } from '@/types/supabase';

// Admin access to Supabase, bypassing RLS.
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
);

type Data = {
  status?: string;
  error?: string;
};

const allowedMethods = ['POST'];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
) {
  // Preflight check
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200 });
  }

  if (!req.method || !allowedMethods.includes(req.method)) {
    res.setHeader('Allow', allowedMethods);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  if (req.method === 'POST') {
    if (!req.body.promptId) {
      return res.status(400).json({ error: 'Please provide a prompt id.' });
    }

    if (!req.body.feedback) {
      return res
        .status(400)
        .json({ error: 'Please provide a feedback object.' });
    }

    const { error } = await supabaseAdmin
      .from('query_stats')
      .update({ feedback: req.body.feedback })
      .eq('id', req.body.promptId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  return res.status(200).json({ status: 'ok' });
}
