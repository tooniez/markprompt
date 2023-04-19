import { parse, transform } from '@markdoc/markdoc';
import yaml from 'js-yaml';

import {
  collapseGroupTag,
  collapseTag,
  createTOC,
  fenceNode,
  headingNode,
  noteTag,
  playgroundTag,
} from '@/components/layouts/MarkdocLayout';

import { DEFAULT_PROMPT_TEMPLATE } from './prompt';

export const getMarkdocStaticProps = async (pageId: string) => {
  const res = await fetch(`https://api.motif.land/v1/exports/raw/${pageId}`);
  const rawText = await res.text();
  const ast = parse(rawText);
  const config = {
    nodes: {
      fence: fenceNode,
      heading: headingNode,
    },
    tags: {
      playground: playgroundTag,
      note: noteTag,
      collapsegroup: collapseGroupTag,
      collapse: collapseTag,
    },
    variables: {
      defaultPromptTemplate: DEFAULT_PROMPT_TEMPLATE,
    },
  };

  const frontmatter = ast.attributes.frontmatter
    ? yaml.load(ast.attributes.frontmatter)
    : {};

  const content = transform(ast, config);
  const toc = createTOC(content);

  return {
    props: { content: JSON.stringify(content), toc, frontmatter },
    revalidate: 60,
  };
};
