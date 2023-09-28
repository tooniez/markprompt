import type { NextApiRequest, NextApiResponse } from 'next';

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
  console.log('IN HERE!', req.method);
  if (!req.method || !allowedMethods.includes(req.method)) {
    res.setHeader('Allow', allowedMethods);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  console.log('BODY', JSON.stringify(req.body, null, 2));

  return res.status(200).json({});
}
