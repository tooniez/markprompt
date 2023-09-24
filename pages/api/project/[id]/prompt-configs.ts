import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import type { NextApiRequest, NextApiResponse } from 'next';

import { withProjectAccess } from '@/lib/middleware/common';
import { Database } from '@/types/supabase';
import { Project, PromptConfig } from '@/types/types';

type Data =
  | {
      status?: string;
      error?: string;
    }
  | PromptConfig[]
  | PromptConfig;

const allowedMethods = ['GET', 'POST', 'DELETE'];

export default withProjectAccess(
  allowedMethods,
  async (req: NextApiRequest, res: NextApiResponse<Data>) => {
    const supabase = createServerSupabaseClient<Database>({ req, res });

    const projectId = req.query.id as Project['id'];

    if (req.method === 'GET') {
      const { data: configs, error } = await supabase
        .from('prompt_configs')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      if (!configs) {
        return res.status(404).json({ error: 'No prompt config found.' });
      }

      return res.status(200).json(configs);
    } else if (req.method === 'POST') {
      const { error, data } = await supabase
        .from('prompt_configs')
        .insert([
          {
            share_key: req.body.shareKey,
            config: req.body.config,
            project_id: projectId,
          },
        ])
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      if (!data) {
        return res.status(400).json({ error: 'Error creating prompt config.' });
      }

      return res.status(200).json(data);
    } else if (req.method === 'DELETE') {
      const { error } = await supabase
        .from('prompt_configs')
        .delete()
        .eq('id', req.body.promptConfigId);

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      return res.status(200).json({ status: 'ok' });
    }

    return res.status(400).json({ error: 'unknown' });
  },
);
