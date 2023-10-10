import type { NextApiRequest, NextApiResponse } from 'next';

import { NangoModel } from '@/external/nango-integrations/models';
import { getNangoServerInstance } from '@/lib/integrations/nango.server';
import { withProjectAccess } from '@/lib/middleware/common';
import { inngest } from '@/pages/api/inngest';

type Data = {
  status?: string;
  error?: string;
};

const allowedMethods = ['POST'];

const nango = getNangoServerInstance();

export default withProjectAccess(
  allowedMethods,
  async (req: NextApiRequest, res: NextApiResponse<Data>) => {
    if (req.method === 'POST') {
      if (!req.body.integrationId) {
        return res.status(400).json({ error: 'No integration id provided.' });
      } else if (!req.body.connectionId) {
        return res.status(400).json({ error: 'No connection id provided.' });
      }

      await nango.triggerSync(
        req.body.integrationId,
        req.body.connectionId,
        req.body.syncIds,
      );

      await inngest.send({
        name: 'nango/sync',
        data: {
          providerConfigKey: req.body.integrationId,
          connectionId: req.body.connectionId,
          model: NangoModel,
          queryTimeStamp: null,
        },
      });

      return res.status(200).json({});
    }

    return res.status(400).end();
  },
);
