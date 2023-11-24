import { NangoSyncWebhookBody } from '@nangohq/node';
import { EventSchemas, Inngest } from 'inngest';
import { serve } from 'inngest/next';
import { isEqual } from 'lodash-es';
import { compressToBase64, decompressFromBase64 } from 'lz-string';

import {
  EMBEDDING_MODEL,
  MAX_CHUNK_LENGTH,
  MIN_SECTION_CONTENT_LENGTH,
  OPENAI_RPM,
  GITHUB_RPH,
} from '@/lib/constants';
import { bulkCreateSectionEmbeddings } from '@/lib/file-processing';
import {
  getNangoServerInstance,
  getSourceSyncData,
} from '@/lib/integrations/nango.server';
import {
  convertToMarkdown,
  extractMeta,
  splitIntoSections,
} from '@/lib/markdown';
import {
  createServiceRoleSupabaseClient,
  getProjectIdFromSource,
  createFile,
  batchStoreFileSections,
  batchDeleteFiles,
  batchDeleteFilesBySourceAndNangoId,
  getOrCreateRunningSyncQueueForSource,
  updateSyncQueue,
  getFilesIdAndCheksumBySourceAndNangoId,
} from '@/lib/supabase';
import { createChecksum } from '@/lib/utils';
import { pluralize } from '@/lib/utils.nodeps';
import { Json } from '@/types/supabase';
import {
  DbFileMetaChecksum,
  DbSource,
  FileSections,
  GitHubRepoSyncMetadata,
  NangoFileWithMetadata,
  NangoIntegrationId,
  NangoSourceDataType,
  Project,
  SyncMetadata,
  SyncMetadataWithTargetSelectors,
} from '@/types/types';

// Payload for the webhook and manual sync bodies that we send
// to Inngest.
export type NangoSyncPayload = Pick<
  NangoSyncWebhookBody,
  'providerConfigKey' | 'connectionId' | 'model' | 'queryTimeStamp'
>;

export type FileTrainEventData<T extends SyncMetadata> = {
  file: Omit<NangoFileWithMetadata, 'content'> & { compressedContent: string };
  projectId: Project['id'];
  sourceId: DbSource['id'];
  connectionId: string;
  syncMetadata: T;
};

type Events<T extends SyncMetadata> = {
  'nango/sync': {
    data: { nangoSyncPayload: NangoSyncPayload; shouldPause: boolean };
  };
  'markprompt/file.train': {
    data: FileTrainEventData<T>;
  };
  'markprompt/github-file-slow.train': {
    data: FileTrainEventData<T>;
  };
  'markprompt/github-file-fast.train': {
    data: FileTrainEventData<T>;
  };
  'markprompt/files.delete': {
    data: { ids: NangoFileWithMetadata['id'][]; sourceId: string };
  };
};

type NamedEvent<
  T extends SyncMetadata,
  U extends keyof Events<T>,
> = Events<T>[U] & { name: U };

type TrainEventName =
  | 'markprompt/file.train'
  | 'markprompt/github-file-fast.train'
  | 'markprompt/github-file-slow.train';

type TrainEventId =
  | 'train-files'
  | 'train-github-files-fast'
  | 'train-github-files-slow';

export const inngest = new Inngest({
  id: 'markprompt',
  schemas: new EventSchemas().fromRecord<Events<SyncMetadata>>(),
});

const syncNangoRecords = inngest.createFunction(
  { id: 'sync-nango-records' },
  { event: 'nango/sync' },
  async ({ event, step }) => {
    const supabase = createServiceRoleSupabaseClient();
    const nangoSyncPayload = event.data.nangoSyncPayload;

    console.debug(
      '[INNGEST] start sync for connection:',
      nangoSyncPayload.connectionId,
    );

    const integrationId =
      nangoSyncPayload.providerConfigKey as NangoIntegrationId;

    const connectionId = nangoSyncPayload.connectionId;

    const sourceSyncData = await getSourceSyncData(supabase, connectionId);

    if (!sourceSyncData) {
      console.debug(
        '[INNGEST] No source sync data found. This should never happen, unless a source has been deleted while Nango is syncing.',
      );
      return { updated: 0, deleted: 0 };
    }

    const syncQueueId = await getOrCreateRunningSyncQueueForSource(
      supabase,
      sourceSyncData.id,
    );

    const nango = getNangoServerInstance();

    console.debug(
      '[INNGEST] getRecords',
      JSON.stringify(
        {
          providerConfigKey: nangoSyncPayload.providerConfigKey,
          connectionId: nangoSyncPayload.connectionId,
          model: nangoSyncPayload.model,
        },
        null,
        2,
      ),
    );

    const recordIncludingErrors = (await nango.getRecords<any>({
      providerConfigKey: integrationId,
      connectionId: connectionId,
      model: nangoSyncPayload.model,
      // delta: nangoSyncPayload.queryTimeStamp || undefined,
    })) as NangoFileWithMetadata[];

    console.debug('[INNGEST] getRecords', recordIncludingErrors.length);

    const records = recordIncludingErrors.filter((r) => !r.error);

    const errorMessages = recordIncludingErrors
      .filter((r) => r.error)
      .map((r) => `${r.path}: ${r.error}`);

    if (errorMessages.length > 0) {
      await updateSyncQueue(supabase, syncQueueId, 'running', {
        message: `Error processing ${pluralize(
          errorMessages.length,
          'file',
          'files',
        )}:\n\n${errorMessages.join('\n')}`,
        level: 'error',
      });
    }

    const projectId = await getProjectIdFromSource(supabase, sourceSyncData.id);

    if (!projectId) {
      await updateSyncQueue(supabase, syncQueueId, 'errored', {
        message: 'Project not found',
        level: 'error',
      });
      return { updated: 0, deleted: 0 };
    }

    // Delete files

    const filesIdsToDelete = records
      .filter((record) => {
        return record._nango_metadata.last_action === 'DELETED';
      })
      .map((record) => record.id);

    // Delete files

    await step.sendEvent('delete-files', {
      name: 'markprompt/files.delete',
      data: { ids: filesIdsToDelete, sourceId: sourceSyncData.id },
    });

    // Train added/updated files

    const syncMetadata = (sourceSyncData.data as NangoSourceDataType)
      ?.syncMetadata;

    const trainRecords = records.filter((record) => {
      return (
        record._nango_metadata.last_action === 'ADDED' ||
        record._nango_metadata.last_action === 'UPDATED'
      );
    });

    let eventName: TrainEventName;
    let eventId: TrainEventId;
    if (integrationId === 'github-repo') {
      if (trainRecords.length < 1000) {
        eventName = 'markprompt/github-file-fast.train';
        eventId = 'train-github-files-fast';
      } else {
        eventName = 'markprompt/github-file-slow.train';
        eventId = 'train-github-files-slow';
      }
    } else {
      eventName = 'markprompt/file.train';
      eventId = 'train-files';
    }

    const trainEvents = trainRecords.map<
      NamedEvent<SyncMetadata, TrainEventName>
    >((record) => {
      // Send compressed content to maximize chances of staying below
      // the 1Mb payload limit. Base64 is required to send over the
      // wire, otherwise the compressed content gets corrupted.
      const compressedContent = compressToBase64(record.content || '');
      return {
        name: eventName,
        data: {
          file: {
            ...record,
            compressedContent,
          },
          sourceId: sourceSyncData.id,
          projectId,
          syncMetadata,
          connectionId,
        },
      };
    });

    await updateSyncQueue(supabase, syncQueueId, 'running', {
      message: `Start processing ${pluralize(
        trainEvents.length,
        'file',
        'files',
      )}.`,
      level: 'info',
    });

    await step.sendEvent(eventId, trainEvents);

    await updateSyncQueue(supabase, syncQueueId, 'complete', {
      message: `Updated ${pluralize(
        trainEvents.length,
        'file',
        'files',
      )}. Deleted ${pluralize(filesIdsToDelete.length, 'file', 'files')}.`,
      level: 'info',
    });

    return { updated: trainEvents.length, deleted: filesIdsToDelete.length };
  },
);

export const isFileChanged = (
  newFile: Omit<DbFileMetaChecksum, 'id'>,
  storedFile: Omit<DbFileMetaChecksum, 'id'>,
) => {
  return (
    newFile.path !== storedFile.path ||
    newFile.checksum !== storedFile.checksum ||
    !isEqual(newFile.meta, storedFile.meta)
  );
};

// Meta is built from the Markdown frontmatter, and from additional
// data, such as Notion properties.
export const createFullMeta = async (file: NangoFileWithMetadata) => {
  let meta: {
    [key: string]: string;
  } = {};

  if (file.content) {
    meta = (await extractMeta(file.content, file.contentType)) || {};
  }

  meta = { ...file.meta, ...meta };
  if (file.title) {
    // If title is set during Nango sync, use that instead of the
    // title inferred from metadata.
    meta = { ...meta, title: file.title };
  }

  return meta;
};

export const runTrainFile = async <T extends SyncMetadata>(
  data: FileTrainEventData<T>,
) => {
  const nangoFile: NangoFileWithMetadata = {
    ...data.file,
    content: decompressFromBase64(data.file.compressedContent),
  };
  const sourceId = data.sourceId;
  const projectId = data.projectId;

  console.debug('[INNGEST] runTrainFile', nangoFile.id);

  if (!nangoFile?.id || nangoFile.error) {
    return;
  }

  const supabase = createServiceRoleSupabaseClient();

  const foundFiles = await getFilesIdAndCheksumBySourceAndNangoId(
    supabase,
    sourceId,
    nangoFile.id,
  );

  let foundFile: DbFileMetaChecksum | undefined = undefined;

  if (foundFiles.length > 0) {
    foundFile = foundFiles[0];
    if (foundFiles.length > 1) {
      // There should not be more than one file with the same source id and
      // Nango id, but if there is exceptionally, purge all but the first.
      await batchDeleteFiles(
        supabase,
        foundFiles.slice(1).map((f) => f.id),
      );
    }
  }

  const meta = await createFullMeta(nangoFile);

  const markdown = nangoFile.content
    ? await convertToMarkdown(
        nangoFile.content,
        nangoFile.contentType,
        (data.syncMetadata as SyncMetadataWithTargetSelectors).includeSelectors,
        (data.syncMetadata as SyncMetadataWithTargetSelectors).excludeSelectors,
        data.syncMetadata.processorOptions,
      )
    : '';
  const checksum = createChecksum(markdown);

  if (
    foundFile &&
    !isFileChanged(
      { path: nangoFile.path, meta: meta || {}, checksum },
      foundFile,
    )
  ) {
    // If checksums match on the Markdown, skip. Note that we don't compare
    // on the raw content, since two different raw versions chould still have
    // the same Markdown, in which case we don't need to recreate the
    // embeddings.
    return;
  }

  const sections = (await splitIntoSections(markdown, MAX_CHUNK_LENGTH)).filter(
    (s) => {
      // Filter out very short sections, to avoid noise
      return s.content.length >= MIN_SECTION_CONTENT_LENGTH;
    },
  );

  const embeddingsResponse = await bulkCreateSectionEmbeddings(
    sections.map((s) => s.content),
  );

  const tokenCount = embeddingsResponse.tokenCount;
  const sectionsWithEmbeddings = embeddingsResponse.embeddings.map((e, i) => {
    return {
      ...sections[i],
      embedding: e,
    };
  });

  const internalMetadata = {
    nangoFileId: nangoFile.id,
    ...(nangoFile.contentType ? { contentType: nangoFile.contentType } : {}),
  };

  const newFileId = await createFile(
    supabase,
    projectId,
    sourceId,
    nangoFile.path,
    meta,
    internalMetadata,
    checksum,
    nangoFile.content || '',
    markdown || '',
    tokenCount,
  );

  if (!newFileId) {
    return;
  }

  const sectionsData = sectionsWithEmbeddings.map<
    Omit<FileSections, 'id' | 'token_count'>
  >((section, index) => {
    return {
      file_id: newFileId,
      content: section.content,
      meta: (section.leadHeading
        ? { leadHeading: section.leadHeading }
        : undefined) as Json,
      embedding: section.embedding as any,
      cf_file_meta: meta as Json,
      cf_project_id: projectId,
      index_in_file: index,
    };
  });

  await batchStoreFileSections(supabase, sectionsData);

  // If previous file existed, delete it here (i.e. once its replacement has
  // been fully indexed, so we avoid a time where the content is not available).
  if (foundFile) {
    await batchDeleteFiles(supabase, [foundFile.id]);
  }
};

export const fetchGitHubFileContent = async (
  owner: string,
  repo: string,
  branch: string,
  path: string,
  connectionId: string,
): Promise<string> => {
  const nango = getNangoServerInstance();

  const res = await nango.proxy({
    method: 'GET',
    endpoint: `/repos/${owner}/${repo}/contents/${path}${
      branch ? `?ref=${branch}` : ''
    }`,
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    providerConfigKey: 'github-repo',
    connectionId: connectionId,
    retries: 10,
  });

  return Buffer.from(res.data?.content, 'base64').toString('utf-8');
};

const getConcurrency = (
  averageExecutionTime: number,
  maxRequestsPerHour: number,
) => {
  const numExecutionsPerHour = (60 * 60 * 1000) / averageExecutionTime;
  return Math.round(maxRequestsPerHour / numExecutionsPerHour);
};

// The train function adheres to the OpenAI rate limits.
const trainFile = inngest.createFunction(
  {
    id: 'train-file',
    // We need to run the functions with concurrency rather than rate limits.
    // Rate limits will just fail the runs that exceed the rate limits. Instead,
    // we estimate how much we can execute in parallel while staying within
    // the OpenAI rate limits.
    concurrency: {
      // Estimate the number of calls we can run concurrently given the OpenAI
      // limits.
      // Note: 100 is the limit of our current plan on Inngest.
      limit: Math.min(
        100,
        getConcurrency(1000, OPENAI_RPM[EMBEDDING_MODEL] * 60),
      ),
    },
  },
  { event: 'markprompt/file.train' },
  async ({ event }) => {
    return runTrainFile(event.data);
  },
);

const fetchAndTrainGitHubFile = async (
  data: FileTrainEventData<GitHubRepoSyncMetadata>,
) => {
  const syncMetadata = data.syncMetadata as GitHubRepoSyncMetadata;
  const content = await fetchGitHubFileContent(
    syncMetadata.owner,
    syncMetadata.repo,
    syncMetadata.branch,
    data.file.path,
    data.connectionId,
  );
  return runTrainFile({
    ...data,
    file: { ...data.file, compressedContent: compressToBase64(content) },
  });
};

// The train function adheres to the GitHub rate limits, which is more
// restrictive than the OpenAI rate limits.
const fetchAndTrainGitHubFileSlow = inngest.createFunction(
  {
    id: 'train-github-file-slow',
    // We need to run the functions with concurrency rather than rate limits.
    // Rate limits will just fail the runs that exceed the rate limits. Instead,
    // we estimate how much we can execute in parallel while staying within
    // the GitHub rate limits.
    concurrency: {
      // Estimate the number of calls we can run concurrently given the GitHub
      // limits.
      // Note: 100 is the limit of our current plan on Inngest.
      limit: Math.min(100, getConcurrency(2_000, GITHUB_RPH)),
    },
  },
  { event: 'markprompt/github-file-slow.train' },
  async ({ event }) => {
    return fetchAndTrainGitHubFile(
      event.data as FileTrainEventData<GitHubRepoSyncMetadata>,
    );
  },
);

// Same as slow, but with maximum concurrency when we are sure to not hit
// rate limits imposed by GitHub. Instead, we just adhere to the OpenAI
// embeddings rate limits.
const fetchAndTrainGitHubFileFast = inngest.createFunction(
  {
    id: 'train-github-file-fast',
    concurrency: {
      limit: Math.min(
        100,
        getConcurrency(1000, OPENAI_RPM[EMBEDDING_MODEL] * 60),
      ),
    },
  },
  { event: 'markprompt/github-file-fast.train' },
  async ({ event }) => {
    return fetchAndTrainGitHubFile(
      event.data as FileTrainEventData<GitHubRepoSyncMetadata>,
    );
  },
);

const deleteFiles = inngest.createFunction(
  { id: 'delete-files' },
  { event: 'markprompt/files.delete' },
  async ({ event, logger }) => {
    logger.debug('Delete files', event.data.ids);

    const supabase = createServiceRoleSupabaseClient();

    await batchDeleteFilesBySourceAndNangoId(
      supabase,
      event.data.sourceId,
      event.data.ids,
    );
  },
);

export default serve({
  client: inngest,
  functions: [
    syncNangoRecords,
    trainFile,
    fetchAndTrainGitHubFileFast,
    fetchAndTrainGitHubFileSlow,
    deleteFiles,
  ],
});
