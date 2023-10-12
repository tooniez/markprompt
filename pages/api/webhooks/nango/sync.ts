import type { NextApiRequest, NextApiResponse } from 'next';

import { NangoSyncPayload, inngest } from '../../inngest';

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

  console.debug('[NANGO] Webhook called');

  await inngest.send({
    name: 'nango/sync',
    data: req.body as NangoSyncPayload,
  });

  return res.status(200).json({});
}
