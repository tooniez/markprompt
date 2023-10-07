import { Nango } from '@nangohq/node';

import { FileData, NangoIntegrationId, Project } from '@/types/types';

import { NangoModel } from './salesforce';
import { getResponseOrThrow } from '../utils';

export const getNangoServerInstance = () => {
  return new Nango({
    secretKey:
      process.env.NODE_ENV === 'production'
        ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          process.env.NANGO_SECRET_KEY_PROD!
        : // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          process.env.NANGO_SECRET_KEY_DEV!,
  });
};
