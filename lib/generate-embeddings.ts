import Markdoc from '@markdoc/markdoc';
import type { SupabaseClient } from '@supabase/auth-helpers-nextjs';
import { load } from 'cheerio';
import { backOff } from 'exponential-backoff';
import type { Content, Root } from 'mdast';
import { toMarkdown } from 'mdast-util-to-markdown';
import { toString } from 'mdast-util-to-string';
import remarkFrontmatter from 'remark-frontmatter';
import remarkMdx from 'remark-mdx';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import TurndownService from 'turndown';
import { unified } from 'unified';
import { u } from 'unist-builder';
import { filter } from 'unist-util-filter';

import { CONTEXT_TOKENS_CUTOFF, MIN_CONTENT_LENGTH } from '@/lib/constants';
import { createEmbedding } from '@/lib/openai.edge';
import {
  createChecksum,
  getFileType,
  inferFileTitle,
  splitIntoSubstringsOfMaxLength,
} from '@/lib/utils';
import { extractFrontmatter } from '@/lib/utils.node';
import { Database } from '@/types/supabase';
import {
  API_ERROR_ID_CONTENT_TOKEN_QUOTA_EXCEEDED,
  DbFile,
  DbSource,
  FileData,
  FileSectionData,
  FileSectionsData,
  OpenAIModelIdWithType,
  Project,
  geLLMInfoFromModel,
} from '@/types/types';

import { rstToHTML } from './converters/rst-to-html';
import { remarkLinkRewrite } from './remark/remark-link-rewrite';
import { MarkpromptConfig } from './schema';
import { tokensToApproxParagraphs } from './stripe/tiers';
import { getTokenAllowanceInfo } from './supabase';
import { recordProjectTokenCount } from './tinybird';

const defaultFileSectionsData: FileSectionsData = {
  sections: [],
  meta: { title: 'Untitled' },
  leadFileHeading: undefined,
};

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
});

turndown.addRule('pre', {
  filter: 'pre',
  replacement: (content: string, node: any) => {
    const lang = node.getAttribute('data-language') || '';
    return `\n\n\`\`\`${lang}\n${content.trim()}\n\`\`\`\n\n`;
  },
});

const splitTreeBy = <T extends Content>(
  tree: Root,
  predicate: (node: Content) => boolean,
): {
  predicateNode: T;
  tree: Root;
}[] => {
  return tree.children.reduce<{ predicateNode: T; tree: Root }[]>(
    (trees, node) => {
      const [lastTree] = trees.slice(-1);

      if (!lastTree || predicate(node)) {
        const tree: Root = u('root', [node]);
        return trees.concat({ predicateNode: node as T, tree });
      }

      lastTree.tree.children.push(node);
      return trees;
    },
    [],
  );
};

const getProcessor = (withMdx: boolean, markpromptConfig: MarkpromptConfig) => {
  let chain = unified();

  if (markpromptConfig.processorOptions?.linkRewrite) {
    chain.use(remarkLinkRewrite, markpromptConfig.processorOptions.linkRewrite);
  }

  chain
    .use(remarkParse)
    .use(remarkStringify)
    .use(remarkFrontmatter, ['yaml', 'toml']);

  if (withMdx) {
    chain = chain.use(remarkMdx);
  }

  return chain;
};

const augmentMetaWithTitle = (
  meta: {
    [key: string]: string;
  },
  leadFileHeading: string | undefined,
  filePath: string,
) => {
  if (meta.title) {
    return meta;
  }

  if (leadFileHeading) {
    return { ...meta, title: leadFileHeading };
  }

  if (filePath) {
    return { ...meta, title: inferFileTitle(meta, filePath) };
  }

  return { ...meta, title: defaultFileSectionsData.meta.title };
};

// Use `asMDX = false` for Markdoc content. What might happen in Markdoc
// is that the page contains a statement like `{HI_THERE}`, which is
// rendered verbatim in Markdown/Markdoc. It's also not a problem à priori
// for MDX, since it's semantically correct MDX (no eval is happening here).
// However, specifically for `{HI_THERE}` with an underscore, the Markdoc
// transform will escape the underscore, turning it into `{HI\_THERE}`, and
// then it's actually semantically incorrect MDX, because what goes inside the
// curly braces is treated as a variable/expression, and `HI\_THERE` is
// no a valid JS variable/expression, so the parsing will fail.
// Similarly, statements like "<10" are valid Markdown/Markdoc, but not
// valid MDX (https://github.com/micromark/micromark-extension-mdx-jsx/issues/7)
// and we don't want this to break Markdoc.
const processMarkdown = (
  content: string,
  asMDX: boolean,
  markpromptConfig: MarkpromptConfig,
): FileSectionsData | undefined => {
  const meta = extractFrontmatter(content);

  let tree: Root | undefined = undefined;

  const setTree = () => (t: Root) => {
    tree = t;
  };

  try {
    getProcessor(true, markpromptConfig).use(setTree).processSync(content);
  } catch {
    try {
      getProcessor(false, markpromptConfig).use(setTree).processSync(content);
    } catch {
      //
    }
  }

  if (!tree) {
    return undefined;
  }

  // Remove all JSX and expressions from MDX
  const mdTree = filter(
    tree,
    (node) =>
      ![
        'yaml',
        'toml',
        'mdxjsEsm',
        'mdxJsxFlowElement',
        'mdxJsxTextElement',
        'mdxFlowExpression',
        'mdxTextExpression',
      ].includes(node.type),
  );

  if (!mdTree) {
    return undefined;
  }

  const sectionTrees = splitTreeBy(mdTree, (node) => node.type === 'heading');

  const sections: FileSectionData[] = sectionTrees.map((tree) => {
    const node = tree.predicateNode as any;
    return {
      content: toMarkdown(tree.tree),
      leadHeading:
        node.type === 'heading'
          ? { value: toString(node), depth: node.depth }
          : undefined,
    };
  });

  const leadFileHeading = sections[0]?.leadHeading?.value;

  return { sections, meta, leadFileHeading };
};

const processMarkdoc = (
  content: string,
  markpromptConfig: MarkpromptConfig,
): FileSectionsData | undefined => {
  // In Markdoc, we start by extracting the frontmatter, because
  // the process is then to transform the Markdoc to HTML, and then
  // pass it through the Markdown processor. This erases traces of
  // the frontmatter. However, the frontmatter may not include
  // a title, which we will obtain from the Markdown processing.
  const meta = extractFrontmatter(content);
  const ast = Markdoc.parse(content);
  // In Markdoc, we make an exception and transform {% img %}
  // and {% image %} tags to <img> html since this is a common
  // use as an improvement to the ![]() Markdown tag. We could
  // offer to pass such rules via the API call.
  const transformed = Markdoc.transform(ast, {
    tags: {
      img: { render: 'img', attributes: { src: { type: String } } },
      image: { render: 'img', attributes: { src: { type: String } } },
    },
  });
  const html = Markdoc.renderers.html(transformed) || '';
  const md = turndown.turndown(html);
  const fileSectionData = processMarkdown(md, false, markpromptConfig);

  if (!fileSectionData) {
    return undefined;
  }

  return { ...fileSectionData, meta };
};

const processRST = (
  content: string,
  markpromptConfig: MarkpromptConfig,
): FileSectionsData | undefined => {
  const html = rstToHTML(content);
  const md = turndown.turndown(html);
  const fileSectionData = processMarkdown(md, false, markpromptConfig);

  if (!fileSectionData) {
    return undefined;
  }

  return { ...fileSectionData, meta: {} };
};

const htmlExcludeTags = ['head', 'script', 'style', 'nav', 'footer', 'aside'];

const processHtml = (
  content: string,
  markpromptConfig: MarkpromptConfig,
): FileSectionsData | undefined => {
  const $ = load(content);

  const title = $('title').text();

  htmlExcludeTags.forEach((tag) => {
    $(tag).remove();
  });

  let cleanedHtml = $('main').html();
  if (!cleanedHtml) {
    cleanedHtml = $('body').html();
  }

  let fileSectionsData: FileSectionsData | undefined = defaultFileSectionsData;

  if (cleanedHtml) {
    const md = turndown.turndown(cleanedHtml);
    fileSectionsData = processMarkdown(md, false, markpromptConfig);
  }

  if (!fileSectionsData) {
    return undefined;
  }

  return {
    ...fileSectionsData,
    meta: { title },
  };
};

const TOKEN_CUTOFF_ADJUSTED = CONTEXT_TOKENS_CUTOFF * 0.8;
const APPROX_CHARS_PER_TOKEN = 4;
const MAX_CHUNK_LENGTH = TOKEN_CUTOFF_ADJUSTED * APPROX_CHARS_PER_TOKEN;

const splitWithinTokenCutoff = (section: string): string[] => {
  // GPT3Tokenizer is slow, especially on large text. Use the approximated
  // value instead (1 token ~= 4 characters), and add a little extra
  // buffer.
  if (section.length < MAX_CHUNK_LENGTH) {
    return [section];
  }

  const subSections: string[] = [];
  const lines = section.split('\n');
  let accLines = '';

  const pushChunk = (accLines: string) => {
    if (accLines.length < MAX_CHUNK_LENGTH) {
      subSections.push(accLines);
    } else {
      // If a single line is longer than the token limit, chunk it
      // up further.
      const lineChunks = splitIntoSubstringsOfMaxLength(
        accLines,
        MAX_CHUNK_LENGTH,
      );
      for (const chunk of lineChunks) {
        subSections.push(chunk);
      }
    }
  };

  for (const line of lines) {
    const accLinesLength = accLines.length;
    const lineLength = line.length;
    if (accLinesLength + lineLength >= MAX_CHUNK_LENGTH) {
      pushChunk(accLines);
      accLines = line;
    } else {
      accLines = accLines + '\n' + line;
    }
  }

  if (accLines) {
    pushChunk(accLines);
  }

  return subSections;
};

const processFileData = (
  file: FileData,
  markpromptConfig: MarkpromptConfig,
): Omit<FileSectionsData, 'leadFileHeading'> | undefined => {
  let fileSectionsData: FileSectionsData | undefined;
  const fileType = getFileType(file.name);
  if (fileType === 'mdoc') {
    fileSectionsData = processMarkdoc(file.content, markpromptConfig);
  } else if (fileType === 'rst') {
    fileSectionsData = processRST(file.content, markpromptConfig);
  } else if (fileType === 'html') {
    fileSectionsData = processHtml(file.content, markpromptConfig);
  } else {
    try {
      fileSectionsData = processMarkdown(file.content, true, markpromptConfig);
    } catch (e) {
      // Some repos use the .md extension for Markdoc, and this
      // would break if parsed as MDX, so attempt with Markoc
      // parsing here.
      fileSectionsData = processMarkdoc(file.content, markpromptConfig);
    }
  }

  if (!fileSectionsData) {
    return undefined;
  }

  // Now that we have sections, break them up further to stay within
  // the token limit. This is especially important for plain text files
  // with no heading separators, or Markdown files with very
  // large sections. We don't want these to be ignored.
  const trimmedSectionsData: FileSectionData[] =
    fileSectionsData.sections.flatMap(
      (sectionData: FileSectionData): FileSectionData[] => {
        const split = splitWithinTokenCutoff(sectionData.content);
        return split.map((s, i) => ({
          content: s,
          leadHeading: i === 0 ? sectionData.leadHeading : undefined,
        }));
      },
      [] as FileSectionData[],
    );

  return {
    sections: trimmedSectionsData,
    meta: augmentMetaWithTitle(
      fileSectionsData.meta,
      fileSectionsData.leadFileHeading,
      file.path,
    ),
  };
};

const getFileAtPath = async (
  supabase: SupabaseClient<Database>,
  sourceId: DbSource['id'],
  path: string,
): Promise<DbFile['id'] | undefined> => {
  const { data, error } = await supabase
    .from('files')
    .select('id')
    .match({ source_id: sourceId, path })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error('Error:', error);
    return undefined;
  }
  return data?.id as DbFile['id'];
};

const createFile = async (
  supabase: SupabaseClient<Database>,
  // TODO: remove once migration is safely completed. We set an explicit
  // value to prevent NULL values, because if a row has a NULL value,
  // somehow it won't be returned in the inner joined filter query.
  _projectId: Project['id'],
  sourceId: DbSource['id'],
  path: string,
  meta: any,
  checksum: string,
  rawContent: string,
): Promise<DbFile['id'] | undefined> => {
  const { error, data } = await supabase
    .from('files')
    .insert([
      {
        source_id: sourceId,
        project_id: _projectId,
        path,
        meta,
        checksum,
        raw_content: rawContent,
      },
    ])
    .select('id')
    .limit(1)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return data?.id as DbFile['id'];
};

const revertFileProcessing = async (
  supabaseAdmin: SupabaseClient,
  fileId: DbFile['id'],
) => {
  // If there were errors, delete the file (which will cascade and delete
  // associated embeddings), to give a change to process the file again.
  return supabaseAdmin.from('files').delete().eq('id', fileId);
};

export type EmbeddingsError = {
  id?: string;
  path: string;
  message: string;
};

export const generateFileEmbeddingsAndSaveFile = async (
  supabaseAdmin: SupabaseClient,
  projectId: Project['id'],
  sourceId: DbSource['id'],
  file: FileData,
  byoOpenAIKey: string | undefined,
  markpromptConfig: MarkpromptConfig,
): Promise<EmbeddingsError[]> => {
  let embeddingsTokenCount = 0;
  const errors: { path: string; message: string }[] = [];

  const fileData = processFileData(file, markpromptConfig);

  if (!fileData) {
    return [{ path: file.path, message: 'Empty content.' }];
  }

  const { meta, sections } = fileData;

  let fileId = await getFileAtPath(supabaseAdmin, sourceId, file.path);

  const checksum = createChecksum(file.content);

  if (fileId) {
    // Delete previous file section data, and update current file
    await supabaseAdmin
      .from('file_sections')
      .delete()
      .filter('file_id', 'eq', fileId);
    await supabaseAdmin
      .from('files')
      .update({ meta, checksum, raw_content: file.content })
      .eq('id', fileId);
  } else {
    fileId = await createFile(
      supabaseAdmin,
      projectId,
      sourceId,
      file.path,
      meta,
      checksum,
      file.content,
    );
  }

  if (!fileId) {
    return [
      { path: file.path, message: `Unable to create file ${file.path}.` },
    ];
  }

  const embeddingsData: {
    file_id: DbFile['id'];
    content: string;
    meta: any;
    embedding: unknown;
    token_count: number;
    cf_file_meta: any;
    cf_project_id: Project['id'];
  }[] = [];

  const model: OpenAIModelIdWithType = {
    type: 'embeddings',
    value: 'text-embedding-ada-002',
  };

  const tokenAllowanceInfo = await getTokenAllowanceInfo(supabaseAdmin, {
    projectId,
  });

  const numRemainingTokensOnPlan = tokenAllowanceInfo.numRemainingTokensOnPlan;

  for (const section of sections) {
    // Unlike earlier, we keep the sections verbatim during indexing, as we
    // may need to run further Remark plugins, e.g. for search to extract
    // headings. We do this processing instead when building the completions
    // prompt.
    const input = section.content;

    // Ignore content shorter than `MIN_CONTENT_LENGTH` characters.
    if (input.length < MIN_CONTENT_LENGTH) {
      continue;
    }

    try {
      // Retry with exponential backoff in case of error. Typical cause is
      // too_many_requests.
      const embeddingResult = await backOff(
        () => createEmbedding(input, byoOpenAIKey, model.value),
        {
          startingDelay: 10000,
          numOfAttempts: 10,
        },
      );

      embeddingsTokenCount += embeddingResult.usage?.total_tokens ?? 0;

      if (embeddingsTokenCount > numRemainingTokensOnPlan) {
        // The file has been created, so delete it to allow for a subsequent
        // processing.
        await revertFileProcessing(supabaseAdmin, fileId);
        return [
          {
            id: API_ERROR_ID_CONTENT_TOKEN_QUOTA_EXCEEDED,
            path: file.path,
            message: `Training quota reached. Your plan allows you to process ${
              tokenAllowanceInfo.tokenAllowance
            } tokens (approximately ${tokensToApproxParagraphs(
              tokenAllowanceInfo.tokenAllowance as number,
            )} paragraphs). You have currently processed ${Math.min(
              tokenAllowanceInfo.usedTokens,
              tokenAllowanceInfo.tokenAllowance as number,
            )} tokens, and you are attempting to process additional ${embeddingsTokenCount} tokens, which brings you past the limit. Please upgrade your plan, or contact ${
              process.env.NEXT_PUBLIC_SALES_EMAIL
            } to discuss extended usage.`,
          },
        ];
      }

      embeddingsData.push({
        file_id: fileId,
        content: input,
        meta: section.leadHeading
          ? { leadHeading: section.leadHeading }
          : undefined,
        embedding: embeddingResult.data[0].embedding,
        token_count: embeddingResult.usage.total_tokens ?? 0,
        cf_file_meta: meta,
        cf_project_id: projectId,
      });
    } catch (error) {
      const snippet = input.slice(0, 20);
      console.error('Error', error);
      errors.push({
        path: file.path,
        message: `Unable to generate embeddings for section starting with '${snippet}...': ${error}`,
      });
    }
  }

  const { error } = await supabaseAdmin
    .from('file_sections')
    .insert(embeddingsData);

  if (error) {
    console.error(
      'Error storing embeddings in bulk:',
      JSON.stringify(error),
      '- Storing one by one instead',
    );
    errors.push({
      path: file.path,
      message: `Error storing embeddings in bulk: ${error.message} - Storing one by one instead`,
    });
    // Too large? Attempt one embedding at a time.
    for (const data of embeddingsData) {
      await supabaseAdmin.from('file_sections').insert([data]);
    }
  }

  if (!byoOpenAIKey) {
    await recordProjectTokenCount(
      projectId,
      geLLMInfoFromModel(model),
      embeddingsTokenCount,
      'generate-embeddings',
    );
  }

  if (errors?.length > 0) {
    await revertFileProcessing(supabaseAdmin, fileId);
  }

  await supabaseAdmin
    .from('files')
    .update({ token_count: embeddingsTokenCount })
    .eq('id', fileId);

  return errors;
};
