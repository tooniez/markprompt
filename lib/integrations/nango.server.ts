import { Nango } from '@nangohq/node';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/supabase';
import { DbSource } from '@/types/types';

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

// Currently, we use the source ID as connection ID.
export const getSourceId = async (
  supabase: SupabaseClient<Database>,
  connectionId: string,
): Promise<DbSource['id'] | undefined> => {
  const { data } = await supabase
    .from('sources')
    .select('id')
    .eq('data->>connectionId', connectionId)
    .limit(1)
    .maybeSingle();
  return data?.id;
};
