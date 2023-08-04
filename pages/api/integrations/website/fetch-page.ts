import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import type { NextApiRequest, NextApiResponse } from 'next';

import { Database } from '@/types/supabase';

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

  const supabase = createServerSupabaseClient<Database>({ req, res });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const url = req.body.url as string;
  if (!url) {
    return res.status(400).json({
      error: 'Invalid request. Please provide a url.',
    });
  }

  try {
    const immediate = req.body.immediate as boolean;
    const useCustomPageFetcher = req.body.useCustomPageFetcher as boolean;

    // For simple page fetching, like a sitemap with no hydration,
    // use a plain fetch approach.
    if (immediate || !useCustomPageFetcher) {
      const websiteRes = await fetch(url);
      if (websiteRes.ok) {
        const content = await websiteRes.text();
        return res.status(200).json({ content });
      } else {
        const text = await websiteRes.text();
        console.error(text.substring(0, 500));
        return res.status(400).json({ status: text.substring(0, 500) });
      }
    } else {
      const pageRes = await fetch(process.env.CUSTOM_PAGE_FETCH_SERVICE_URL!, {
        method: 'POST',
        body: JSON.stringify({ url }),
        headers: {
          Authorization: `Bearer ${process.env.MARKPROMPT_API_TOKEN}`,
          'Content-Type': 'application/json',
          accept: 'application/json',
        },
      });
      if (pageRes.ok) {
        const { content } = await pageRes.json();
        return res.status(200).json({ content });
      } else {
        const text = await pageRes.text();
        console.error(text.substring(0, 500));
        return res.status(400).json({ status: text.substring(0, 500) });
      }
    }
  } catch {
    // Handle below
  }

  return res.status(400).json({ status: 'Page is not accessible' });
}
