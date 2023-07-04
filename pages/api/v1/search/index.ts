import { createClient } from '@supabase/supabase-js';
import FlexSearch from 'flexsearch';
import { uniq } from 'lodash-es';
import { NextApiRequest, NextApiResponse } from 'next';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import strip from 'strip-markdown';

import { track } from '@/lib/posthog';
import { safeParseInt, safeParseJSON } from '@/lib/utils.edge';
import { Database, Json } from '@/types/supabase';
import { FileSectionMeta, SourceType } from '@/types/types';

const MAX_FILE_TITLE_MATCHES = 5;
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

type FileTitleIndex = FlexSearch.Document<
  { id: string; title: string },
  ['id', 'title']
>;

type FileSectionContentIndex = FlexSearch.Document<
  {
    id: string;
    content: string;
    meta?: FileSectionMeta;
    fileId: string;
  },
  ['meta', 'content', 'fileId']
>;

type SearchResultSectionData = { content?: string; meta?: any };

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
  sections: SearchResultSectionData[];
};

type SearchResultSectionDataWithFileInfo = {
  file: SearchResultFileData;
} & SearchResultSectionData;

type Source = {
  data: Json;
  type: 'github' | 'motif' | 'website' | 'file-upload' | 'api-upload';
};

type FileData = {
  id: number;
  path: string;
  meta: Json;
  sources: Source | Source[] | null;
};

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
    match_count: 10,
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

  const rerankTs = Date.now();

  const fileSectionContentDBMatchesIds = (
    _fileSectionContentDBMatches || []
  ).map((f) => f.file_id);

  const metadataTs = Date.now();

  const matchingFileIdsFromTitleAndContent = uniq([
    ...fileTitleDBMatchesIds,
    ...fileSectionContentDBMatchesIds,
  ]).sort();

  // Agment files and file sections with sources and meta

  const { data: fileAugmentationData } = await supabaseAdmin
    .from('files')
    .select('id, path, meta, sources(data, type)')
    .in('id', matchingFileIdsFromTitleAndContent);

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

  const fileTitleDBMatchesAugmented = fileAugmentationData.filter((f) =>
    fileTitleDBMatchesIds.includes(f.id),
  );

  const fileTitleIndex: FileTitleIndex = new FlexSearch.Document({
    cache: 20,
    tokenize: 'full',
    document: {
      id: 'id',
      index: [
        {
          field: 'title',
          tokenize: 'forward',
          optimize: true,
          resolution: 9,
        },
      ],
      store: ['id', 'title'],
    },
    context: {
      resolution: 9,
      depth: 2,
      bidirectional: true,
    },
  });

  for (const match of fileTitleDBMatchesAugmented) {
    fileTitleIndex.add({
      id: `${match.id}`,
      title: (match.meta as any)?.title,
    });
  }

  // Return at most `MAX_FILE_TITLE_MATCHES` file title matches
  const fileTitleSearchResults =
    fileTitleIndex.search<true>(query, MAX_FILE_TITLE_MATCHES, {
      enrich: true,
      suggest: true,
    })[0]?.result || [];

  // Rank file sections by content match

  const fileSectionContentDBMatchesAugmented = (
    _fileSectionContentDBMatches || []
  ).filter((f) => fileSectionContentDBMatchesIds.includes(f.file_id));

  const fileSectionContentIndex: FileSectionContentIndex =
    new FlexSearch.Document({
      cache: 100,
      document: {
        id: 'id',
        index: [
          {
            field: 'content',
            tokenize: 'strict', // Only match full words in content
            optimize: true,
            resolution: 8,
            filter: (s: string) => s.length > 2,
          },
          {
            field: 'meta:leadHeading:value',
            tokenize: 'forward',
            optimize: true,
            resolution: 9,
          },
        ],
        store: ['meta', 'content', 'fileId'],
      },
      context: {
        resolution: 9,
        depth: 2,
        bidirectional: true,
      },
    });

  for (let i = 0; i < fileSectionContentDBMatchesAugmented.length; i++) {
    const result = fileSectionContentDBMatchesAugmented[i];
    fileSectionContentIndex.add({
      id: `${result.id}`,
      fileId: `${result.file_id}`,
      content: result.content,
      meta: result.meta as FileSectionMeta,
    });
  }

  const fileSectionContentSearchResults = (
    fileSectionContentIndex.search<true>(query, limit, {
      enrich: true,
      suggest: true,
    })[0]?.result || []
  ).slice(0, limit);

  // Match sections with headings and content

  let responseData: (
    | SearchResultFileDataWithSections
    | SearchResultSectionDataWithFileInfo
  )[] = [];

  const fileAugmentationDataByFileId = fileAugmentationData.reduce(
    (acc, value) => {
      acc[`${value.id}`] = value;
      return acc;
    },
    {} as { [key: string]: FileData },
  );

  // For backwards compatibility
  if ((req.query.format as string) === 'flat') {
    const _responseData: SearchResultSectionDataWithFileInfo[] = [];

    // Matching files with title
    for (const result of fileTitleSearchResults) {
      const fileId = result.doc.id;
      const fileData = fileAugmentationDataByFileId[fileId];
      _responseData.push({
        file: {
          meta: fileData.meta,
          path: fileData.path,
          source: fileData.sources as Source,
          title: (fileData.meta as any)?.title,
        },
      });
    }

    // Matching sections with content
    for (const result of fileSectionContentSearchResults) {
      const fileId = result.doc.fileId;
      const fileData = fileAugmentationDataByFileId[fileId];
      _responseData.push({
        file: {
          meta: fileData.meta,
          path: fileData.path,
          source: fileData.sources as Source,
          title: (fileData.meta as any)?.title,
        },
        ...(result.doc.meta ? { meta: result.doc.meta } : {}),
        content: await createKWICSnippet(result.doc.content || '', query),
      });
    }
    responseData = _responseData;
  } else {
    // This part is for legacy and added for backwards compatibility. The
    // issue with returning sections grouped by file id is that it's not
    // clear how to represent a match which is only of the file title, and
    // doesn't include any section data. A flattened result seems more
    // appropriate.
    const resultsByFile: { [key: string]: SearchResultFileDataWithSections } =
      {};
    // Matching files with title
    for (const result of fileTitleSearchResults) {
      const fileId = result.doc.id;
      const fileData = fileAugmentationDataByFileId[fileId];
      resultsByFile[fileId] = {
        ...{
          title: (fileData.meta as any)?.title || '',
          meta: fileData.meta,
          path: fileData.path,
          source: fileData.sources as Source,
        },
        sections: [
          ...(resultsByFile[fileId]?.sections || []),
          // Files have no section content
          { content: '' },
        ],
      };
    }

    // Matching sections with content
    for (const result of fileSectionContentSearchResults) {
      const fileId = result.doc.fileId;
      const fileData = fileAugmentationDataByFileId[fileId];
      resultsByFile[fileId] = {
        ...{
          title: (fileData.meta as any)?.title || '',
          meta: fileData.meta,
          path: fileData.path,
          source: fileData.sources as Source,
        },
        sections: [
          ...(resultsByFile[fileId]?.sections || []),
          {
            ...(result.doc.meta ? { meta: result.doc.meta } : {}),
            content: await createKWICSnippet(result.doc.content || '', query),
          },
        ],
      };
    }
    responseData = Object.values(resultsByFile);
  }

  const rerankDelta = Date.now() - rerankTs;

  return res.status(200).json({
    debug: {
      middleware: safeParseJSON(req.query.mts as string, []),
      ftsFileTitle: ftsFileTitleDelta,
      ftsFileSectionContent: ftsFileSectionContentDelta,
      metadata: metadataDelta,
      rerank: rerankDelta,
    },
    data: responseData.slice(0, limit),
  });
}
