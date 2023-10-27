import { describe, expect, it } from 'vitest';

import { markdownToFileSectionData } from './markdown';

const heading = 'Heading';

const loremIpsum = `[Lorem](/blog/post-1.mdx) ipsum dolor sit amet, consectetur adipiscing elit. Vivamus lacinia odio vitae vestibulum. Donec in efficitur ipsum, in egestas mauris.`;

const loremIpsumLinkTransformed = `[Lorem](/blog/post-1) ipsum dolor sit amet, consectetur adipiscing elit. Vivamus lacinia odio vitae vestibulum. Donec in efficitur ipsum, in egestas mauris.`;

const sampleContent = `# ${heading}

${loremIpsum}`;

const sections = (linkTransformed: boolean) => ({
  leadFileHeading: heading,
  meta: {},
  sections: [
    {
      content: `# ${heading}\n\n${
        linkTransformed ? loremIpsumLinkTransformed : loremIpsum
      }\n`,
      leadHeading: {
        depth: 1,
        value: heading,
      },
    },
  ],
});

const options = {
  processorOptions: {
    linkRewrite: {
      rules: [{ pattern: '\\.mdx?', replace: '' }],
    },
  },
};

describe('markdown', () => {
  describe('markdownToFileSectionData', () => {
    it('should chunk Markdown content', () => {
      expect(markdownToFileSectionData(sampleContent, false, {})).toStrictEqual(
        sections(false),
      );
    });
    it('should transform links', () => {
      expect(
        markdownToFileSectionData(sampleContent, false, options),
      ).toStrictEqual(sections(true));
    });
  });
});
