// Node-dependent utilities. Cannot run on edge runtimes or in the browser.
import type { Readable } from 'node:stream';

export const getBufferFromReadable = async (readable: Readable) => {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
};
