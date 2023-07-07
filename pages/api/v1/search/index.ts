import { createClient } from '@supabase/supabase-js';
import FlexSearch from 'flexsearch';
import Slugger from 'github-slugger';
import { uniq } from 'lodash-es';
import { NextApiRequest, NextApiResponse } from 'next';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import strip from 'strip-markdown';

import { track } from '@/lib/posthog';
import { safeParseInt, safeParseJSON } from '@/lib/utils.edge';
import { Database } from '@/types/supabase';
import { FileSectionMeta } from '@/types/types';

const MAX_SEARCH_RESULTS = 20;

// Admin access to Supabase, bypassing RLS.
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
);

type FTSFileSectionContentResult =
  Database['public']['Functions']['fts_file_section_content']['Returns'][number];

type FTSFileTitleResult =
  Database['public']['Functions']['fts_file_title']['Returns'][number];

type Index = FlexSearch.Document<
  { id: string } & SearchResult,
  ['file', 'meta', 'content', 'matchType']
>;

// TODO: These types should come from @markprompt/core

type SearchResult = {
  matchType: 'title' | 'leadHeading' | 'content';
  file: SearchResultFileData;
} & SearchResultSection;

type SearchResultSection = {
  content?: string;
  meta?: {
    leadHeading?: {
      id?: string;
      depth: number;
      value: string;
      slug: string;
    };
  };
};

type SearchResultFileData = {
  title?: string;
  path: string;
  meta: any;
  source: Source;
};

type SourceType = 'github' | 'motif' | 'website' | 'file-upload' | 'api-upload';

type Source = {
  type: SourceType;
  data: {
    url?: string;
    domain?: string;
  };
};

type Data =
  | {
      status?: string;
      error?: string;
    }
  | {
      data: SearchResult[];
      debug?: any;
    };

const allowedMethods = ['GET'];

const createKWICSnippet = async (
  content: string,
  searchTerm: string,
  maxLength = 200,
) => {
  // Remove Markdown formatting, remove leadHeading, and trim around
  // the keyword. This creates a snippet suitable for displaying in
  // search results.
  const plainText = String(
    await remark().use(remarkGfm).use(strip).process(content.trim()),
  )
    .replace(/\s+/g, ' ')
    .replace(/\\n/g, ' ');

  const index = plainText.toLowerCase().indexOf(searchTerm.toLowerCase());

  if (index === -1) {
    return plainText.slice(0, maxLength);
  }

  const rawSnippet = plainText.slice(
    Math.max(0, index - Math.round(maxLength / 2)),
    index + Math.round(maxLength / 2),
  );

  const words = rawSnippet.split(/\s+/);
  if (words.length > 3) {
    return words.slice(1, words.length - 1).join(' ');
  }

  return words.join(' ');
};

const processTitle = async (title: string | undefined) => {
  // In some situations, the title can be an HTML/JSX tag, for instance
  // an image. If it's an image/figure, we extract the title/alt.
  if (typeof title === 'undefined') {
    return title;
  }
  return String(await remark().use(remarkGfm).use(strip).process(title)).trim();
};

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

  const params = req.body;

  let config = {};
  try {
    config = JSON.parse((params.config || '') as string);
  } catch {
    // Do nothing
  }

  // Apply rate limits, in additional to middleware rate limits.
  // const rateLimitResult = await checkSearchRateLimits({
  //   value: projectId,
  //   type: 'projectId',
  // });

  // TODO
  // if (!isRequestFromMarkprompt(req.headers.origin)) {
  //   // Search is part of the Enterprise plans when used outside of
  //   // the Markprompt dashboard.
  //   const teamStripeInfo = await getTeamTierInfo(supabaseAdmin, projectId);
  //   if (
  //     !teamStripeInfo ||
  //     !isAtLeastPro(
  //       teamStripeInfo.stripePriceId,
  //       teamStripeInfo.isEnterprisePlan,
  //     )
  //   ) {
  //     return res.status(401).json({
  //       error: `The search endpoint is only accessible on the Pro and Enterprise plans. Please contact ${process.env.NEXT_PUBLIC_SALES_EMAIL} to get set up.`,
  //     });
  //   }
  // }

  const query = req.query.query as string;
  const projectId = req.query.projectId as string;

  track(projectId, 'search', { projectId });

  const limit = Math.min(
    MAX_SEARCH_RESULTS,
    safeParseInt(req.query.limit as string, 10),
  );

  if (!query || query.trim() === '') {
    return res.status(200).json({
      data: [],
    });
  }

  // Retrieve files matching on title

  const ftsFileTitlesTs = Date.now();

  const {
    data: _fileTitleDBMatches,
  }: {
    data: FTSFileTitleResult[] | null;
    error: { message: string; code: string } | null;
  } = await supabaseAdmin.rpc('fts_file_title', {
    search_term: query,
    match_count: 20,
    project_id: projectId,
  });

  const fileTitleDBMatchesIds = (_fileTitleDBMatches || []).map(
    (f: FTSFileTitleResult) => f.id,
  );

  const ftsFileTitleDelta = Date.now() - ftsFileTitlesTs;

  // Retrieve file sections matching on content

  const ftsFileSectionContentTs = Date.now();

  const {
    data: _fileSectionContentDBMatches,
  }: {
    data: FTSFileSectionContentResult[] | null;
  } = await supabaseAdmin.rpc('fts_file_section_content', {
    search_term: query,
    match_count: 50,
    project_id: projectId,
  });

  const ftsFileSectionContentDelta = Date.now() - ftsFileSectionContentTs;

  const fileSectionContentDBMatchesIds = (
    _fileSectionContentDBMatches || []
  ).map((f) => f.file_id);

  const metadataTs = Date.now();

  const matchingFileIdsFromTitleAndContent = uniq([
    ...fileTitleDBMatchesIds,
    ...fileSectionContentDBMatchesIds,
  ]).sort();

  // Agment files and file sections with sources and meta

  const { data: _fileAugmentationData } = await supabaseAdmin
    .from('files')
    .select('id, path, meta, sources(data, type)')
    .in('id', matchingFileIdsFromTitleAndContent);

  const fileAugmentationData = await Promise.all(
    (_fileAugmentationData || []).map(async (d) => {
      const { sources, ...rest } = d;
      const source = sources as Source;
      return {
        ...rest,
        source: {
          ...(source.data ? { data: source.data } : {}),
          type: source.type,
        } as Source,
        processedTitle: await processTitle((d.meta as any)?.title),
      };
    }),
  );

  const metadataDelta = Date.now() - metadataTs;

  if (!fileAugmentationData) {
    return res.status(200).json({
      debug: {
        middleware: safeParseJSON(req.query.mts as string, []),
        fts: ftsFileSectionContentDelta,
        metadata: metadataDelta,
      },
      data: [],
    });
  }

  // Rank files by title match

  const rerankTs = Date.now();

  const index: Index = new FlexSearch.Document({
    cache: 100,
    tokenize: 'full',
    document: {
      id: 'id',
      index: [
        {
          field: 'file:meta:title',
          tokenize: 'forward',
          optimize: true,
          resolution: 9,
        },
        {
          field: 'content',
          tokenize: 'strict',
          optimize: true,
          resolution: 6,
        },
        {
          field: 'meta:leadHeading:value',
          tokenize: 'forward',
          optimize: true,
          resolution: 8,
        },
      ],
      store: ['file', 'meta', 'content', 'matchType'],
    },
    context: {
      resolution: 9,
      depth: 3,
      bidirectional: true,
    },
  });

  const fileTitles: string[] = [];

  for (const match of _fileTitleDBMatches || []) {
    const fileData = fileAugmentationData.find((f) => f.id === match.id);
    if (fileData) {
      if (fileData.processedTitle) {
        fileTitles.push(fileData.processedTitle);
      }
      index.add({
        id: `${match.id}`,
        matchType: 'title',
        file: {
          title: fileData.processedTitle,
          path: fileData.path,
          meta: fileData.meta,
          source: fileData.source,
        },
      });
    }
  }

  for (const match of _fileSectionContentDBMatches || []) {
    const fileData = fileAugmentationData.find((f) => f.id === match.file_id);
    if (!fileData) {
      continue;
    }
    // Ignore sections which are duplicates of files with title matches. We
    // consider it a duplicate if it has a heading of depth 1 equal to a
    // file title.
    const leadHeading = (match.meta as FileSectionMeta)?.leadHeading;
    if (
      leadHeading?.depth === 1 &&
      leadHeading.value &&
      fileTitles.includes(leadHeading.value)
    ) {
      continue;
    }

    const matchType = leadHeading?.value
      ?.toLowerCase()
      .includes(query.toLowerCase())
      ? 'leadHeading'
      : 'content';

    // Do not reuse a Slugger instance, as it will
    // append `-1`, `-2`, ... to links if it encounters the
    // same link twice.
    const slugger = new Slugger();
    const slug = leadHeading?.value
      ? slugger.slug(leadHeading?.value)
      : undefined;

    index.add({
      id: `${match.id}`,
      matchType,
      file: {
        title: fileData.processedTitle,
        path: fileData.path,
        meta: fileData.meta,
        source: fileData.source,
      },
      content: match.content,
      meta: {
        ...(match.meta as any),
        leadHeading: {
          ...leadHeading,
          slug,
        },
      },
    });
  }

  // Return at most `MAX_FILE_TITLE_MATCHES` file title matches
  const rankedResults = (
    index.search<true>(query, limit, {
      enrich: true,
      suggest: true,
    })[0]?.result || []
  )
    .slice(0, limit)
    .map((r) => r.doc);

  const rerankDelta = Date.now() - rerankTs;

  const includeSectionContent = req.query.includeSectionContent === 'true';

  const results = await Promise.all(
    rankedResults.map(async (r) => {
      const { content, ...rest } = r;
      return {
        ...rest,
        ...(content && !!includeSectionContent ? { content } : {}),
        ...(content
          ? { snippet: await createKWICSnippet(content, query) }
          : {}),
      };
    }),
  );

  return res.status(200).json({
    debug: {
      middleware: safeParseJSON(req.query.mts as string, []),
      ftsFileTitle: ftsFileTitleDelta,
      ftsFileSectionContent: ftsFileSectionContentDelta,
      metadata: metadataDelta,
      rerank: rerankDelta,
    },
    data: results,
  });
}
