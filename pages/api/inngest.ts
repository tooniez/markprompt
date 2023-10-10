import { NangoSyncWebhookBody } from '@nangohq/node';
import { EventSchemas, Inngest } from 'inngest';
import { serve } from 'inngest/next';
import { isPresent } from 'ts-is-present';

import { EMBEDDING_MODEL, MAX_CHUNK_LENGTH, OPENAI_RPM } from '@/lib/constants';
import { createSectionEmbedding } from '@/lib/file-processing';
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
} from '@/lib/supabase';
import { Json } from '@/types/supabase';
import {
  DbSource,
  FileSections,
  NangoFileWithMetadata,
  Project,
} from '@/types/types';

type Events = {
  'nango/sync': { data: NangoSyncWebhookBody };
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
  async ({ event, step }) => {
    const sourceId = getSourceId(event.data.connectionId);

    const records = (await nango.getRecords<any>({
      providerConfigKey: event.data.providerConfigKey,
      connectionId: event.data.connectionId,
      model: event.data.model,
      delta: event.data.queryTimeStamp || undefined,
    })) as NangoFileWithMetadata[];

    const projectId = await getProjectIdFromSource(supabase, sourceId);

    if (!projectId) {
      return;
    }

    const config = await getProjectConfigData(supabase, projectId);

    console.log('records', JSON.stringify(records, null, 2));

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
    logger.debug('train-file', JSON.stringify(event, null, 2));

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
    console.log('Found', JSON.stringify(foundIds, null, 2));
    if (foundIds.length > 0) {
      logger.debug('train-file. Delete', foundIds);
      // await batchDeleteFiles(supabase, foundIds);
      await batchDeleteFilesBySourceAndNangoId(supabase, event.data.sourceId, [
        file.id,
      ]);
    }

    let meta = await extractMeta(file.content, file.contentType);
    const markdown = await convertToMarkdown(file.content, file.contentType);
    const sections = await splitIntoSections(
      markdown,
      event.data.processorOptions,
      MAX_CHUNK_LENGTH,
    );

    const sectionsWithEmbeddings = (
      await Promise.all(
        sections.map(async (section) => {
          const embedding = await createSectionEmbedding(section.content);
          if (!embedding) {
            return undefined;
          }
          return { ...section, ...embedding };
        }),
      )
    ).filter(isPresent);

    const fileTokenCount = sectionsWithEmbeddings.reduce(
      (acc, section) => acc + section.tokenCount,
      0,
    );

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

    logger.debug('train-file. Create file', file.path, {
      ...file.meta,
      ...meta,
    });

    const newFileId = await createFile(
      supabase,
      projectId,
      sourceId,
      file.path,
      meta,
      internalMetadata,
      '',
      file.content,
      fileTokenCount,
    );

    if (!newFileId) {
      return;
    }

    const dbSections = sectionsWithEmbeddings.map<Omit<FileSections, 'id'>>(
      (section) => {
        return {
          file_id: newFileId,
          content: section.content,
          meta: (section.leadHeading
            ? { leadHeading: section.leadHeading }
            : undefined) as Json,
          embedding: section.embedding as any,
          token_count: section.tokenCount ?? 0,
          cf_file_meta: meta as Json,
          cf_project_id: projectId,
        };
      },
    );

    await batchStoreFileSections(supabase, dbSections);
  },
);

const deleteFile = inngest.createFunction(
  { id: 'delete-files' },
  { event: 'markprompt/files.delete' },
  async ({ event, logger }) => {
    logger.debug('delete-files', JSON.stringify(event, null, 2));

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
