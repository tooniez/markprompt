import { NangoSyncWebhookBody } from '@nangohq/node';
import { EventSchemas, Inngest } from 'inngest';
import { serve } from 'inngest/next';

import { OPENAI_RPM } from '@/lib/constants';
import { getSourceId } from '@/lib/integrations/nango';
import { getNangoServerInstance } from '@/lib/integrations/nango.server';
import {
  createServiceRoleSupabaseClient,
  bacthDeleteFileBySourceAndNangoId,
  getFileBySourceAndNangoId,
} from '@/lib/supabase';
import { NangoFileWithMetadata } from '@/types/types';

type Events = {
  'nango/sync': { data: NangoSyncWebhookBody };
  'markprompt/file.train': {
    data: { file: NangoFileWithMetadata; sourceId: string };
  };
  'markprompt/file.delete': {
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
          data: { file: record, sourceId },
        };
      });

    const filesToDelete = records
      .filter((record) => {
        return record._nango_metadata.last_action === 'DELETED';
      })
      .map((record) => record.id);

    await step.sendEvent('delete-files', {
      name: 'markprompt/file.delete',
      data: { ids: filesToDelete, sourceId },
    });
    await step.sendEvent('train-files', trainEvents);

    return { updated: trainEvents.length, deleted: filesToDelete.length };
  },
);

// The train function adheres to the OpenAI rate limits.
const trainFile = inngest.createFunction(
  {
    id: 'train-file',
    rateLimit: {
      limit: OPENAI_RPM['text-embedding-ada-002'],
      period: '1m',
    },
  },
  { event: 'markprompt/file.train' },
  async ({ event, logger }) => {
    logger.debug(JSON.stringify(event, null, 2));

    const file = event.data.file;
    const sourceId = event.data.sourceId;

    if (!file?.id) {
      return;
    }

    const found = await getFileBySourceAndNangoId(supabase, sourceId, file.id);
    if (found) {
      await bacthDeleteFileBySourceAndNangoId(supabase, sourceId, [file.id]);
    }
  },
);

const deleteFile = inngest.createFunction(
  { id: 'delete-file' },
  { event: 'markprompt/file.delete' },
  async ({ event, logger }) => {
    logger.debug(JSON.stringify(event, null, 2));

    await bacthDeleteFileBySourceAndNangoId(
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
