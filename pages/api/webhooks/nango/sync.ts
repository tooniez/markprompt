import { NangoSyncWebhookBody } from '@nangohq/node';
import type { NextApiRequest, NextApiResponse } from 'next';

import { inngest } from '../../inngest';

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

  await inngest.send({
    name: 'nango-sync',
    data: req.body as NangoSyncWebhookBody,
  });

  return res.status(200).json({});
}
