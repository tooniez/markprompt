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

  console.log('Webhook body', JSON.stringify(req.body, null, 2));
  // {
  //   "connectionId": "1390471b-0a75-4115-8b09-4deeb7eecce5",
  //   "providerConfigKey": "salesforce-sandbox",
  //   "syncName": "salesforce-articles",
  //   "model": "NangoFile",
  //   "responseResults": {
  //     "added": 4,
  //     "updated": 0,
  //     "deleted": 0
  //   },
  //   "syncType": "INCREMENTAL",
  //   "queryTimeStamp": "2023-10-02T23:24:59.196Z"
  // }

  // syncNangoRecords(req.body as NangoSyncWebhookBody);

  return res.status(200).json({});
}
