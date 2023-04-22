import { LLMInfo, Project, getModelIdWithVendorPrefix } from '@/types/types';

const recordEvent = async (name: string, payload: any) => {
  return fetch(
    `https://api.us-east.tinybird.co/v0/events?name=${name}&wait=true`,
    {
      method: 'POST',
      body: JSON.stringify({
        timestamp: new Date(Date.now()).toISOString(),
        ...payload,
      }),
      headers: {
        Authorization: `Bearer ${process.env.TINYBIRD_API_KEY}`,
      },
    },
  ).then((res) => res.json());
};

export const recordProjectTokenUsage = async (
  projectId: Project['id'],
  count: number,
  model: LLMInfo,
) => {
  return recordEvent('token_count', {
    projectId,
    count,
    model: getModelIdWithVendorPrefix(model),
  });
};
