import { NangoSyncWebhookBody } from '@nangohq/node';
import { EventSchemas, Inngest } from 'inngest';
import { serve } from 'inngest/next';

import {
  EMBEDDING_MODEL,
  MAX_CHUNK_LENGTH,
  MIN_SECTION_CONTENT_LENGTH,
  OPENAI_RPM,
} from '@/lib/constants';
import { bulkCreateSectionEmbeddings } from '@/lib/file-processing';
import { getSourceId } from '@/lib/integrations/nango';
import { getNangoServerInstance } from '@/lib/integrations/nango.server';
import {
  convertToMarkdown,
  extractMeta,
  splitIntoSections,
} from '@/lib/markdown';
import { MarkdownProcessorOptions } from '@/lib/schema';
import {
  createServiceRoleSupabaseClient,
  getProjectIdFromSource,
  getProjectConfigData,
  createFile,
  batchStoreFileSections,
  getFileIdsBySourceAndNangoId,
  batchDeleteFiles,
  batchDeleteFilesBySourceAndNangoId,
  getOrCreateRunningSyncQueueForSource,
  updateSyncQueue,
} from '@/lib/supabase';
import { pluralize } from '@/lib/utils';
import { Json } from '@/types/supabase';
import {
  DbSource,
  DbSyncQueue,
  FileSections,
  NangoFileWithMetadata,
  Project,
} from '@/types/types';

// Payload for the webhook and manual sync bodies that we send
// to Inngest.
export type NangoSyncPayload = Pick<
  NangoSyncWebhookBody,
  'providerConfigKey' | 'connectionId' | 'model' | 'queryTimeStamp'
> & { syncQueueId?: DbSyncQueue['id'] };

type Events = {
  'nango/sync': {
    data: NangoSyncPayload;
  };
  'markprompt/file.train': {
    data: {
      file: NangoFileWithMetadata;
      projectId: Project['id'];
      sourceId: DbSource['id'];
      processorOptions: MarkdownProcessorOptions | undefined;
    };
  };
  'markprompt/files.delete': {
    data: { ids: NangoFileWithMetadata['id'][]; sourceId: string };
  };
};

type NamedEvent<T extends keyof Events> = Events[T] & { name: T };

const nango = getNangoServerInstance();

const supabase = createServiceRoleSupabaseClient();

export const inngest = new Inngest({
  id: 'markprompt',
  schemas: new EventSchemas().fromRecord<Events>(),
});

const sync = inngest.createFunction(
  { id: 'sync-nango-records' },
  { event: 'nango/sync' },
  async ({ event, step, logger }) => {
    const sourceId = getSourceId(event.data.connectionId);
    const syncQueueId =
      event.data.syncQueueId ??
      (await getOrCreateRunningSyncQueueForSource(supabase, sourceId));

    logger.debug('Calling getRecords');

    const records = (await nango.getRecords<any>({
      providerConfigKey: event.data.providerConfigKey,
      connectionId: event.data.connectionId,
      model: event.data.model,
      delta: event.data.queryTimeStamp || undefined,
    })) as NangoFileWithMetadata[];

    const projectId = await getProjectIdFromSource(supabase, sourceId);

    if (!projectId) {
      await updateSyncQueue(supabase, syncQueueId, 'errored', {
        message: 'Project not found',
        level: 'error',
      });
      return;
    }

    const config = await getProjectConfigData(supabase, projectId);

    const trainEvents = records
      .filter((record) => {
        return (
          record._nango_metadata.last_action === 'ADDED' ||
          record._nango_metadata.last_action === 'UPDATED'
        );
      })
      .map<NamedEvent<'markprompt/file.train'>>((record) => {
        return {
          name: 'markprompt/file.train',
          data: {
            file: record,
            sourceId,
            projectId,
            processorOptions: config.markpromptConfig.processorOptions,
          },
        };
      });

    const filesToDelete = records
      .filter((record) => {
        return record._nango_metadata.last_action === 'DELETED';
      })
      .map((record) => record.id);

    // Files to delete
    if (filesToDelete.length > 0) {
      await step.sendEvent('delete-files', {
        name: 'markprompt/files.delete',
        data: { ids: filesToDelete, sourceId },
      });
    }

    // Files to update
    if (trainEvents.length > 0) {
      await step.sendEvent('train-files', trainEvents);
    }

    await updateSyncQueue(supabase, syncQueueId, 'complete', {
      message: `Updated ${pluralize(
        trainEvents.length,
        'file',
        'files',
      )}. Deleted ${pluralize(filesToDelete.length, 'file', 'files')}`,
      level: 'info',
    });

    return { updated: trainEvents.length, deleted: filesToDelete.length };
  },
);

// The train function adheres to the OpenAI rate limits.
const trainFile = inngest.createFunction(
  {
    id: 'train-file',
    rateLimit: {
      limit: OPENAI_RPM[EMBEDDING_MODEL],
      period: '1m',
    },
  },
  { event: 'markprompt/file.train' },
  async ({ event, logger }) => {
    logger.debug('Train file', event.data.file.id);
    const file = event.data.file;
    const sourceId = event.data.sourceId;
    const projectId = event.data.projectId;

    if (!file?.id) {
      return;
    }

    const foundIds = await getFileIdsBySourceAndNangoId(
      supabase,
      sourceId,
      file.id,
    );

    if (foundIds.length > 0) {
      await batchDeleteFiles(supabase, foundIds);
    }

    let meta = await extractMeta(file.content, file.contentType);
    const markdown = await convertToMarkdown(file.content, file.contentType);

    const sections = (
      await splitIntoSections(
        markdown,
        event.data.processorOptions,
        MAX_CHUNK_LENGTH,
      )
    ).filter((s) => {
      // Filter out very short sections, to avoid noise
      return s.content.length >= MIN_SECTION_CONTENT_LENGTH;
    });

    const ts = Date.now();
    const embeddingsResponse = await bulkCreateSectionEmbeddings(
      sections.map((s) => s.content),
    );
    logger.debug('Embeddings took', Date.now() - ts);

    const tokenCount = embeddingsResponse.tokenCount;
    const sectionsWithEmbeddings = embeddingsResponse.embeddings.map((e, i) => {
      return {
        ...sections[i],
        embedding: e,
      };
    });

    const internalMetadata = {
      nangoFileId: file.id,
      ...(file.contentType
        ? {
            contentType: file.contentType,
          }
        : {}),
    };

    meta = { ...file.meta, ...meta };
    if (file.title) {
      meta = { title: file.title, ...meta };
    }

    const newFileId = await createFile(
      supabase,
      projectId,
      sourceId,
      file.path,
      meta,
      internalMetadata,
      '',
      file.content,
      tokenCount,
    );

    if (!newFileId) {
      return;
    }

    const sectionsData = sectionsWithEmbeddings.map<
      Omit<FileSections, 'id' | 'token_count'>
    >((section) => {
      return {
        file_id: newFileId,
        content: section.content,
        meta: (section.leadHeading
          ? { leadHeading: section.leadHeading }
          : undefined) as Json,
        embedding: section.embedding as any,
        cf_file_meta: meta as Json,
        cf_project_id: projectId,
      };
    });

    await batchStoreFileSections(supabase, sectionsData);
  },
);

const deleteFile = inngest.createFunction(
  { id: 'delete-files' },
  { event: 'markprompt/files.delete' },
  async ({ event, logger }) => {
    logger.debug('Delete files', event.data.ids);
    await batchDeleteFilesBySourceAndNangoId(
      supabase,
      event.data.sourceId,
      event.data.ids,
    );
  },
);

export default serve({
  client: inngest,
  functions: [sync, trainFile, deleteFile],
});
