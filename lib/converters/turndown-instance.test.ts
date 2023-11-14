import { describe, expect, it } from 'vitest';

import { turndownService } from './turndown-instance';

describe('turndown-instance', () => {
  describe('turndownService', () => {
    it('should create the instance', () => {
      expect(turndownService).toBeDefined();
    });
    it('should apply special rules', () => {
      const md = turndownService.turndown(
        '<pre data-language="js">var i = 0</pre>',
      );
      expect(md).toEqual('```js\nvar i = 0\n```');
    });
  });
});
