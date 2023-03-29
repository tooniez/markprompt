import type { NextApiRequest, NextApiResponse } from 'next';
import { OAuthToken } from '@/types/types';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/supabase';

type Data =
  | {
      status?: string;
      error?: string;
    }
  | OAuthToken[];

const allowedMethods = ['GET'];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
) {
  if (!req.method || !allowedMethods.includes(req.method)) {
    res.setHeader('Allow', allowedMethods);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const supabase = createServerSupabaseClient<Database>({ req, res });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { data } = await supabase
    .from('user_access_tokens')
    .select('*')
    .match({ user_id: session.user.id });

  if (data) {
    return res.status(200).json(data);
  }

  return res.status(400).end();
}
