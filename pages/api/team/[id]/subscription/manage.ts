import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import type { NextApiRequest, NextApiResponse } from 'next';

import { withTeamAdminAccess } from '@/lib/middleware/common';
import { stripe } from '@/lib/stripe/server';
import { getTeamSlugAndStripeCustomerId } from '@/lib/supabase';
import { getAppOrigin } from '@/lib/utils.edge';
import { Database } from '@/types/supabase';
import { DbTeam } from '@/types/types';

type Data =
  | {
      status?: string;
      error?: string;
    }
  | { url: string };

const allowedMethods = ['POST'];

export default withTeamAdminAccess(
  allowedMethods,
  async (req: NextApiRequest, res: NextApiResponse<Data>) => {
    const supabase = createServerSupabaseClient<Database>({ req, res });

    const teamId = req.query.id as DbTeam['id'];
    const info = await getTeamSlugAndStripeCustomerId(supabase, teamId);

    if (!info?.stripeCustomerId) {
      return res.status(400).json({ error: 'Customer not found.' });
    }

    const { url } = await stripe.billingPortal.sessions.create({
      customer: info.stripeCustomerId,
      return_url: `${getAppOrigin()}/settings/${info.slug}/plans`,
    });

    return res.status(200).json({ url });
  },
);
