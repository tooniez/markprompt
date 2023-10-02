import { NangoSyncWebhookBody } from '@nangohq/node';
import type { NextApiRequest, NextApiResponse } from 'next';

import { syncNangoRecords } from '@/lib/sync/api';

type Data =
  | {
      status?: string;
      error?: string;
    }
  | { content: string };

const allowedMethods = ['POST'];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
) {
  if (!req.method || !allowedMethods.includes(req.method)) {
    res.setHeader('Allow', allowedMethods);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  // {
  //   "connectionId": "<user-id>",
  //   "providerConfigKey": "<integration-id>",
  //   "syncName": "<sync-name>",
  //   "model": "<data-model>",
  //   "responseResults": { "<DataModel>": { "added": 123, "updated": 123, "deleted": 123 } },
  //   "syncType": "INITIAL" | "INCREMENTAL",
  //   "queryTimeStamp": "2023-05-31T11:46:13.390Z",
  // }

  syncNangoRecords(JSON.parse(req.body) as NangoSyncWebhookBody);

  return res.status(200).json({});
}
