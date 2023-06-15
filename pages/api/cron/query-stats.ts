import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';

import { CONTEXT_TOKENS_CUTOFF_GPT_3_5_TURBO } from '@/lib/constants';
import { getProjectConfigData } from '@/lib/supabase';
import { recordProjectTokenCount } from '@/lib/tinybird';
import { getCompletionsResponseText, getCompletionsUrl } from '@/lib/utils';
import { safeParseInt } from '@/lib/utils.edge';
import { Database } from '@/types/supabase';
import {
  OpenAIModelIdWithType,
  Project,
  geLLMInfoFromModel,
} from '@/types/types';

type Data = {
  status?: string;
  error?: string;
};

const allowedMethods = ['GET'];

// Admin access to Supabase, bypassing RLS.
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
);

type QueryStatData = {
  id: string;
  prompt: string | null;
  response: string | null;
};

const trimQueries = (queries: QueryStatData[], maxTokens: number) => {
  let tokenCount = 0;
  const trimmedQueries: QueryStatData[] = [];
  for (const query of queries) {
    tokenCount += JSON.stringify(query).length;

    if (tokenCount >= maxTokens) {
      break;
    }

    trimmedQueries.push(query);
  }

  return trimmedQueries;
};

const processProjectQueryStats = async (projectId: Project['id']) => {
  // We don't want to mix questions in the same GPT-4 prompt, as we want to
  // guarantee that prompts do not get mistakenly interchanged.
  const { data: queries }: { data: QueryStatData[] | null } =
    await supabaseAdmin
      .from('query_stats')
      .select('id,prompt,response')
      .match({ project_id: projectId, processed: false })
      .limit(10);

  if (!queries || queries.length === 0) {
    return;
  }

  const trimmedQueries = trimQueries(
    queries,
    CONTEXT_TOKENS_CUTOFF_GPT_3_5_TURBO * 0.8,
  );

  console.log('!!! queries', queries.length);
  console.log('!!! trimmedQueries', trimmedQueries.length);

  const prompt = `The following is a list of questions and responses in JSON format. Please keep the JSON, and don't touch the ids, but remove any personally identifiable information from the prompt and response entry:\n\n${JSON.stringify(
    trimmedQueries,
    null,
    2,
  )}

Return as a JSON with the exact same structure.`;

  const model: OpenAIModelIdWithType = {
    type: 'chat_completions',
    value: 'gpt-3.5-turbo',
  };

  const { byoOpenAIKey } = await getProjectConfigData(supabaseAdmin, projectId);

  const url = getCompletionsUrl(model);

  const payload = {
    model: model.value,
    temperature: 1,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
    max_tokens: 2048,
    stream: false,
    n: 1,
    messages: [{ role: 'user', content: prompt }],
  };

  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${
        (byoOpenAIKey || process.env.OPENAI_API_KEY) ?? ''
      }`,
    },
    method: 'POST',
    body: JSON.stringify(payload),
  });

  const json = await res.json();

  if (json.error) {
    console.error('Error fetching completions:', JSON.stringify(json));
  }

  console.error('************* json', JSON.stringify(json, null, 2));

  const tokenCount = safeParseInt(json.usage.total_tokens, 0);
  await recordProjectTokenCount(
    projectId,
    geLLMInfoFromModel(model),
    tokenCount,
    'query-stats',
  );

  const text = getCompletionsResponseText(json, model);

  try {
    const result = JSON.parse(text) as QueryStatData[];
    await supabaseAdmin.from('query_stats').upsert(
      result.map((r) => {
        return {
          ...r,
          processed: true,
          project_id: projectId,
        };
      }),
    );
  } catch {
    console.error('Error updating response:', text);
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
) {
  if (!req.method || !allowedMethods.includes(req.method)) {
    res.setHeader('Allow', allowedMethods);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const projectId = req.query.projectId as Project['id'];
  if (projectId) {
    await processProjectQueryStats(projectId);
  } else {
    // First in line are projects whose unprocessed prompts are oldest.
    const { data } = await supabaseAdmin
      .from('v_distinct_unprocessed_query_stats_project_ids')
      .select('project_id')
      .limit(20);

    if (!data) {
      return res.status(200).send({ status: 'ok' });
    }

    for (const { project_id } of data) {
      if (project_id) {
        await processProjectQueryStats(project_id);
      }
    }
  }

  return res.status(200).send({ status: 'ok' });
}
