import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import type { NextApiRequest, NextApiResponse } from 'next';

import { withProjectAccess } from '@/lib/middleware/common';
import { Database } from '@/types/supabase';
import { Project } from '@/types/types';

type Data =
  | {
      status?: string;
      error?: string;
    }
  | { count: number };

const allowedMethods = ['GET'];

export default withProjectAccess(
  allowedMethods,
  async (req: NextApiRequest, res: NextApiResponse<Data>) => {
    const supabase = createServerSupabaseClient<Database>({ req, res });

    const projectId = req.query.id as Project['id'];

    if (req.method === 'GET') {
      const { count, error } = await supabase
        .from('files')
        .select('id, sources!inner (project_id)', {
          count: 'exact',
          head: true,
        })
        .eq('sources.project_id', projectId);

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      return res.status(200).json({ count: count || 0 });
    }

    return res.status(400).end();
  },
);
