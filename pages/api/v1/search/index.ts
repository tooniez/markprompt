import { createClient } from '@supabase/supabase-js';
import FlexSearch from 'flexsearch';
import { uniq } from 'lodash-es';
import { NextApiRequest, NextApiResponse } from 'next';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import strip from 'strip-markdown';

import { track } from '@/lib/posthog';
import { safeParseInt, safeParseJSON } from '@/lib/utils.edge';
import { Database } from '@/types/supabase';
import { FileSectionMeta, SourceType } from '@/types/types';

const MAX_SEARCH_RESULTS = 20;

// Admin access to Supabase, bypassing RLS.
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
);

type FTSResult = Database['public']['Functions']['fts']['Returns'][number];

type FileIndex = FlexSearch.Document<
  {
    id: string;
    fileId: number;
    title: string;
  },
  ['fileId', 'title']
>;

type SectionIndex = FlexSearch.Document<
  {
    id: string;
    content: string;
    leadHeading: string;
  },
  ['file', 'content', 'meta']
>;

type SearchResultSectionData = { content: string; meta?: any };

// Legacy
type SearchResultFileData = {
  title?: string;
  path: string;
  meta: any;
  source: {
    type: SourceType;
    data?: any;
  };
};

type SearchResultFileDataWithSections = SearchResultFileData & {
  score: number;
  sections: SearchResultSectionData[];
};

type SearchResultSectionDataWithFileInfo = {
  file: SearchResultFileData;
} & SearchResultSectionData;

type Data =
  | {
      status?: string;
      error?: string;
    }
  | {
      data: (
        | SearchResultFileDataWithSections
        | SearchResultSectionDataWithFileInfo
      )[];
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

  const index = plainText.indexOf(searchTerm);

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

  const limit = Math.min(
    MAX_SEARCH_RESULTS,
    safeParseInt(req.query.limit as string, 10),
  );

  if (!query || query.trim() === '') {
    return res.status(200).json({
      data: [],
    });
  }

  const ftsTs = Date.now();

  const {
    data: _data,
    error,
  }: {
    data: FTSResult[] | null | any;
    error: { message: string; code: string } | null;
  } = await supabaseAdmin.rpc('fts', {
    search_term: query,
    match_count: 50,
    project_id: projectId,
  });

  const ftsDelta = Date.now() - ftsTs;

  if (error || !_data) {
    return res
      .status(400)
      .json({ error: error?.message || 'Error retrieving sections' });
  }

  if (_data.project_id) {
    track(_data.project_id, 'search', {
      projectId: _data.project_id,
    });
  }

  const ftsSections = _data as FTSResult[];

  const metadataTs = Date.now();
  const fileIds = uniq(ftsSections.map((d) => d.file_id)).sort();

  const { data: _fileData } = await supabaseAdmin
    .from('files')
    .select('id, path, meta, sources(data, type)')
    .in('id', fileIds);
  const metadataDelta = Date.now() - metadataTs;

  if (!_fileData) {
    return res.status(200).json({
      debug: {
        middleware: safeParseJSON(req.query.mts as string, []),
        fts: ftsDelta,
        metadata: metadataDelta,
      },
      data: [],
    });
  }

  const rerankTs = Date.now();

  // Match files with title
  const fileIndex: FileIndex = new FlexSearch.Document({
    cache: 100,
    tokenize: 'full',
    document: {
      id: 'id',
      index: 'title',
      store: ['fileId', 'title'],
    },
    context: {
      resolution: 9,
      depth: 2,
      bidirectional: true,
    },
  });

  for (const fileData of _fileData) {
    fileIndex.add({
      id: `${fileData.id}`,
      fileId: fileData.id,
      title: (fileData.meta as any)?.title,
    });
  }

  const fileMatches = fileIndex.search<true>(query, limit, {
    enrich: true,
    suggest: true,
  });

  console.log('fileMatches', JSON.stringify(fileMatches, null, 2));
  //   [0]?.result || []
  // ).slice(0, limit);

  // Match sections with headings and content

  // const sectionIndex: SectionIndex = new FlexSearch.Document({
  //   cache: 100,
  //   tokenize: 'full',
  //   document: {
  //     id: 'id',
  //     index: [
  //       {
  //         field: 'file:meta:title',
  //         tokenize: 'forward',
  //         optimize: true,
  //         resolution: 9,
  //       },
  //       {
  //         field: 'meta:leadHeading:value',
  //         tokenize: 'forward',
  //         optimize: true,
  //         resolution: 6,
  //       },
  //       {
  //         field: 'content',
  //         tokenize: 'strict',
  //         optimize: true,
  //         resolution: 4,
  //         filter: (s: string) => s.length > 2,
  //       },
  //     ],
  //     store: ['file', 'content', 'meta'],
  //   },
  //   context: {
  //     resolution: 9,
  //     depth: 2,
  //     bidirectional: true,
  //   },
  // });

  // // Create index
  // for (let i = 0; i < ftsSections.length; i++) {
  //   const result = ftsSections[i];
  //   const fileId = result.file_id;
  //   const fileDataByFile = _fileData?.find((d) => d.id === fileId);
  //   if (!fileDataByFile) {
  //     continue;
  //   }
  //   const source = fileDataByFile.sources as any;
  //   sectionIndex.add({
  //     id: `${fileId}-${i}`,
  //     file: {
  //       id: fileId,
  //       path: fileDataByFile.path,
  //       meta: fileDataByFile.meta as any,
  //       source: {
  //         type: source.type,
  //         data: source.data,
  //       },
  //     },
  //     content: result.content,
  //     meta: result.meta as FileSectionMeta,
  //   });
  // }

  // const searchResults = (
  //   index.search<true>(query, limit, {
  //     enrich: true,
  //     suggest: true,
  //   })[0]?.result || []
  // ).slice(0, limit);

  const rerankDelta = Date.now() - rerankTs;

  let responseData: (
    | SearchResultFileDataWithSections
    | SearchResultSectionDataWithFileInfo
  )[] = [];

  // // For backwards compatibility
  // if ((req.query.format as string) === 'flat') {
  //   const _responseData: SearchResultSectionDataWithFileInfo[] = [];
  //   for (const result of searchResults) {
  //     const { file, content, meta } = result.doc;
  //     _responseData.push({
  //       file,
  //       content: await createKWICSnippet(content || '', query),
  //       meta,
  //     });
  //   }
  //   responseData = _responseData;
  // } else {
  //   const resultsByFile: { [key: string]: SearchResultFileDataWithSections } =
  //     {};
  //   for (const result of searchResults) {
  //     const fileId = result.doc.file.id;
  //     const fileDataByFile = _fileData?.find((d) => d.id === fileId);
  //     if (!fileDataByFile) {
  //       continue;
  //     }

  //     resultsByFile[fileId] = {
  //       ...{
  //         title: result.doc.file.meta?.title || '',
  //         meta: result.doc.file.meta,
  //         path: result.doc.file.path,
  //         source: result.doc.file.source,
  //       },
  //       // Score is not returned currently
  //       score: 0,
  //       sections: [
  //         ...(resultsByFile[fileId]?.sections || []),
  //         {
  //           ...(result.doc.meta ? { meta: result.doc.meta } : {}),
  //           content: await createKWICSnippet(result.doc.content || '', query),
  //         },
  //       ],
  //     };
  //   }
  //   responseData = Object.values(resultsByFile);
  // }

  return res.status(200).json({
    debug: {
      middleware: safeParseJSON(req.query.mts as string, []),
      fts: ftsDelta,
      metadata: metadataDelta,
      rerank: rerankDelta,
    },
    data: responseData,
  });
}
