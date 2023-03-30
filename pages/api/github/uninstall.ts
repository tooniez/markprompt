import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/supabase';
import { PathContentData } from '@/types/types';
import { compress, isSupportedExtension } from '@/lib/utils';

const JSZip = require('jszip');

type Data =
  | {
      status?: string;
      error?: string;
    }
  | Buffer;

const allowedMethods = ['POST'];

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
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { data, error } = await supabase
    .from('user_access_tokens')
    .select('access_token, expires, refresh_token, refresh_token_expires')
    .match({ user_id: session.user.id, provider: 'github' })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return res.status(403).json({ error: 'No access token found' });
  }

  const installationsRes = await fetch(
    'https://api.github.com/app/installations',
    {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${data.access_token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    },
  );

  if (!installationsRes.ok) {
    console.error('Unable to fetch list of installations');
    return [];
  }

  const installations = installationsRes.json();

  return res.status(200).json({});
}
