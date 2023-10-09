import { Inngest } from 'inngest';
import { serve } from 'inngest/next';

export const inngest = new Inngest({ id: 'markprompt' });

const sync = inngest.createFunction(
  { id: 'nango-sync' },
  { event: 'nango-sync' },
  async ({ event, step }) => {
    console.log('Received event', JSON.stringify(event, null, 2));
    // await step.sleep('wait-a-moment', '1s');
    return { event, body: 'Hello, World!' };
  },
);

export default serve({
  client: inngest,
  functions: [sync],
});
