import { Inngest } from 'inngest';
import { serve } from 'inngest/next';

export const inngest = new Inngest({ id: 'markprompt' });

const helloWorld = inngest.createFunction(
  { id: 'hello-world' },
  { event: 'test/hello.world' },
  async ({ event, step }) => {
    await step.sleep('wait-a-moment', '1s');
    return { event, body: 'Hello, World!' };
  },
);

export default serve({
  client: inngest,
  functions: [helloWorld],
});
