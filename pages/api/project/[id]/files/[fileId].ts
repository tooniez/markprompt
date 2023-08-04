import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import type { NextApiRequest, NextApiResponse } from 'next';

import { Database } from '@/types/supabase';
import { DbFile } from '@/types/types';

type Data =
  | {
      status?: string;
      error?: string;
    }
  | DbFile;

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

  if (req.method === 'GET') {
    let fileId = undefined;
    try {
      fileId = parseInt(req.query.fileId as string) as DbFile['id'];
    } catch {
      return res.status(400).json({ error: 'Please provide a valid file id.' });
    }

    const { data, error } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching file:', error.message);
      return res.status(400).json({ error: error.message });
    }

    if (!data) {
      console.error('File not found');
      return res.status(404).json({ error: `File ${fileId} not found.` });
    }

    return res.status(200).json(data);
  }

  return res.status(400).end();
}
