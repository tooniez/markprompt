import { createClient } from '@supabase/supabase-js';
import { stripIndent } from 'common-tags';
import type { NextApiRequest, NextApiResponse } from 'next';
import { isPresent } from 'ts-is-present';

import { CONTEXT_TOKENS_CUTOFF_GPT_3_5_TURBO } from '@/lib/constants';
import { getProjectConfigData } from '@/lib/supabase';
import { recordProjectTokenCount } from '@/lib/tinybird';
import {
  approximatedTokenCount,
  getCompletionsResponseText,
  getCompletionsUrl,
} from '@/lib/utils';
import { safeParseInt } from '@/lib/utils.edge';
import { Database } from '@/types/supabase';
import {
  OpenAIModelIdWithType,
  Project,
  QueryStatsProcessingResponseData,
  geLLMInfoFromModel,
} from '@/types/types';

type Data =
  | {
      status?: string;
      error?: string;
    }
  | QueryStatsProcessingResponseData;

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

const estimateQueryTokenCount = (query: QueryStatData) => {
  return approximatedTokenCount(JSON.stringify(query));
};

const trimQueries = (queries: QueryStatData[], maxTokens: number) => {
  let tokenCount = 0;
  const trimmedQueries: QueryStatData[] = [];
  for (const query of queries) {
    tokenCount += estimateQueryTokenCount(query);

    if (tokenCount >= maxTokens) {
      break;
    }

    trimmedQueries.push(query);
  }

  return trimmedQueries;
};

const redactSensitiveInfo = async (
  projectId: Project['id'],
  content: string,
) => {
  const model: OpenAIModelIdWithType = {
    type: 'chat_completions',
    value: 'gpt-3.5-turbo',
  };

  const { byoOpenAIKey } = await getProjectConfigData(supabaseAdmin, projectId);

  const payload = {
    model: model.value,
    temperature: 0.1,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
    max_tokens: 2048,
    stream: false,
    n: 1,
    messages: [
      {
        role: 'user',
        content:
          stripIndent(`You are an information security expert. The following is a section of text. Remove any sensitive information, such as person names, phone numbers and specific figures. When removing a piece of info, replace it with [REDACTED]. You should be very aggressive in removing information. If in doubt, redact it away.

        ---
        ${content}
        ---

        Redacted version:`),
      },
    ],
  };

  const res = await fetch(getCompletionsUrl(model), {
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
    throw new Error(`${JSON.stringify(json)}`);
  }

  const tokenCount = safeParseInt(json.usage.total_tokens, 0);
  await recordProjectTokenCount(
    projectId,
    geLLMInfoFromModel(model),
    tokenCount,
    'query-stats',
  );

  return getCompletionsResponseText(json, model)
    .trim()
    .replace(/^---/, '')
    .replace(/---$/, '')
    .trim();
};

const processProjectQueryStats = async (
  projectId: Project['id'],
): Promise<{
  status: 'processed_success' | 'no_more_stats_to_process' | 'error';
  message?: string;
  processed?: number;
  errored?: number;
}> => {
  // We don't want to mix questions in the same GPT-4 prompt, as we want to
  // guarantee that prompts do not get mistakenly interchanged.
  const { data: queries }: { data: QueryStatData[] | null } =
    await supabaseAdmin
      .from('query_stats')
      .select('id,prompt,response')
      .match({ project_id: projectId, processed: false })
      .order('created_at', { ascending: false })
      .limit(100);

  if (!queries || queries.length === 0) {
    return { status: 'no_more_stats_to_process' };
  }

  let processed = 0;
  let errored = 0;

  // We just go until we time out.
  for (const query of queries) {
    try {
      if (!query.prompt) {
        throw new Error('No prompt in query.');
      }
      const redactedPrompt = await redactSensitiveInfo(projectId, query.prompt);
      let redactedResponse: string | undefined = undefined;
      if (query.response) {
        redactedResponse = await redactSensitiveInfo(projectId, query.response);
      }

      await supabaseAdmin
        .from('query_stats')
        .update({
          processed: true,
          prompt: redactedPrompt,
          ...(redactedResponse ? { response: redactedResponse } : {}),
        })
        .eq('id', query.id);
      processed += 1;
    } catch {
      errored += 1;
      await supabaseAdmin.from('query_stats').delete().eq('id', query.id);
    }
  }

  return { status: 'processed_success', processed, errored };

  // Ensure that no queries alone are too large for the prompt. If one
  // such query exists, we'd have a deadlock situation, preventing
  // subsequent queries from being processed. The solution here is
  // to delete all individual queries that exceed the token threshold.
  // We also go substantially below the token cutoff to ensure the prompt
  // output remains small. Otherwise, we may have a timeout.
  // const maxTokens = CONTEXT_TOKENS_CUTOFF_GPT_3_5_TURBO * 0.45;
  // const overflowingQueryIds = queries
  //   .map((q) => (estimateQueryTokenCount(q) > maxTokens ? q.id : null))
  //   .filter(isPresent);

  // if (overflowingQueryIds.length > 0) {
  //   console.info(`[QUERY-STATS] Too long ${overflowingQueryIds.length}`);

  //   await supabaseAdmin
  //     .from('query_stats')
  //     .delete()
  //     .in('id', overflowingQueryIds);
  // }

  //   const trimmedQueries = trimQueries(queries, maxTokens);

  //   const prompt = `The following is a list of questions and responses in JSON format. Please keep the JSON, and don't touch the ids, but remove any personally identifiable information from the prompt and response entry:\n\n${JSON.stringify(
  //     trimmedQueries,
  //     null,
  //     2,
  //   )}

  // Return as a JSON with the exact same structure.`;

  // console.info(
  //   `[QUERY-STATS] Processing ${
  //     queries?.length
  //   } prompts for ${projectId}. Prompt length: ${
  //     JSON.stringify(payload).length
  //   }`,
  // );

  // const res = await fetch(url, {
  //   headers: {
  //     'Content-Type': 'application/json',
  //     Authorization: `Bearer ${
  //       (byoOpenAIKey || process.env.OPENAI_API_KEY) ?? ''
  //     }`,
  //   },
  //   method: 'POST',
  //   body: JSON.stringify(payload),
  // });

  // const json = await res.json();

  // if (json.error) {
  //   console.error(
  //     '[QUERY-STATS] Error fetching completions:',
  //     JSON.stringify(json),
  //   );
  //   return { status: 'error', message: JSON.stringify(json) };
  // }

  // const tokenCount = safeParseInt(json.usage.total_tokens, 0);
  // await recordProjectTokenCount(
  //   projectId,
  //   geLLMInfoFromModel(model),
  //   tokenCount,
  //   'query-stats',
  // );

  // const text = getCompletionsResponseText(json, model);

  // try {
  //   const processedQueryStatData = JSON.parse(text) as QueryStatData[];
  //   console.info(
  //     `[QUERY-STATS] Processed ${processedQueryStatData.length} prompts`,
  //   );
  //   for (const entry of processedQueryStatData) {
  //     const { error } = await supabaseAdmin
  //       .from('query_stats')
  //       .update({
  //         processed: true,
  //         prompt: entry.prompt,
  //         response: entry.response,
  //       })
  //       .eq('id', entry.id);
  //     if (error) {
  //       console.error(
  //         '[QUERY-STATS] Error updating queries:',
  //         JSON.stringify(error),
  //       );
  //     }
  //   }

  //   return {
  //     status: 'processed_success',
  //     processed: processedQueryStatData.length,
  //   };
  // } catch {
  //   console.error('[QUERY-STATS] Error updating response:', text);
  //   return { status: 'error', message: text };
  // }
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
    const processed = await processProjectQueryStats(projectId);
    if (processed.status === 'error') {
      return res.status(400).json({
        error: `Error processing stats: ${processed.message}`,
      });
    } else if (processed.status === 'no_more_stats_to_process') {
      return res.status(200).json({ allProcessed: true });
    } else {
      return res.status(200).send({
        status: 'ok',
        processed: processed.processed,
        errored: processed.processed,
      });
    }
  } else {
    // First in line are projects whose unprocessed prompts are oldest.
    const { data } = await supabaseAdmin
      .from('v_distinct_unprocessed_query_stats_project_ids')
      .select('project_id')
      .limit(20);

    if (!data) {
      return res.status(200).json({ allProcessed: true });
    }

    let totalProcessed = 0;
    for (const { project_id } of data) {
      if (project_id) {
        const processResponse = await processProjectQueryStats(project_id);
        if (
          processResponse.status === 'processed_success' &&
          processResponse.processed
        ) {
          totalProcessed += processResponse.processed;
        }
      }
    }

    return res.status(200).send({ status: 'ok', processed: totalProcessed });
  }
}
