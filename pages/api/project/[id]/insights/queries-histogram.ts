import type { NextApiRequest, NextApiResponse } from 'next';

import { withProjectAccess } from '@/lib/middleware/common';
import { createServiceRoleSupabaseClient } from '@/lib/supabase';
import { Project, PromptQueryHistogram } from '@/types/types';

type Data =
  | {
      status?: string;
      error?: string;
    }
  | PromptQueryHistogram[];

const allowedMethods = ['GET'];

// Admin access to Supabase, bypassing RLS.
const supabaseAdmin = createServiceRoleSupabaseClient();

export default withProjectAccess(
  allowedMethods,
  async (req: NextApiRequest, res: NextApiResponse<Data>) => {
    const projectId = req.query.id as Project['id'];

    if (req.method === 'GET') {
      const { data: queries, error } = await supabaseAdmin.rpc(
        'get_insights_query_histogram',
        {
          project_id: projectId,
          from_tz: req.query.from as string,
          to_tz: req.query.to as string,
          tz: req.query.tz as string,
          trunc_interval: (req.query.period as string) || 'day',
        },
      );

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      if (!queries) {
        return res.status(404).json({ error: 'No results found.' });
      }

      return res.status(200).json(queries);
    }

    return res.status(400).end();
  },
);
