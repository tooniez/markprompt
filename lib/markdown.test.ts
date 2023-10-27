import { describe, expect, it } from 'vitest';

import { markdownToFileSectionData } from './markdown';

const content = `# Heading

[A link](/blog/index.mdx) ipsum dolor sit amet, consectetur adipiscing elit. Vivamus lacinia odio vitae vestibulum. Donec in efficitur ipsum, in egestas mauris.

![Lorem](https://example.com/assets/image.jpg)

<img src="https://example.com/assets/image.jpg" />
`;

const contentTransformed = `# Heading

[A link](/blog/index) ipsum dolor sit amet, consectetur adipiscing elit. Vivamus lacinia odio vitae vestibulum. Donec in efficitur ipsum, in egestas mauris.

![Lorem](https://globex.com/image.jpg)

<img src="https://globex.com/image.jpg" />
`;

const options = {
  processorOptions: {
    linkRewrite: {
      rules: [{ pattern: '\\.mdx?', replace: '' }],
    },
    imageSourceRewrite: {
      rules: [
        {
          pattern: '^https://example.com/assets',
          replace: 'https://globex.com',
        },
      ],
    },
  },
};

describe('markdown', () => {
  describe('markdownToFileSectionData', () => {
    it('should transform Markdown content', () => {
      expect(markdownToFileSectionData(content, false, options)).toStrictEqual(
        markdownToFileSectionData(contentTransformed, false, {}),
      );
    });
  });
});
