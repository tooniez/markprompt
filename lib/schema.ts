import Ajv, { JTDSchemaType } from 'ajv/dist/jtd';

import { RemarkImageSourceRewriteOptions } from './remark/remark-image-source-rewrite';
import { RemarkLinkRewriteOptions } from './remark/remark-link-rewrite';

export type MarkdownProcessorOptions = {
  imageSourceRewrite?: RemarkImageSourceRewriteOptions;
  linkRewrite?: RemarkLinkRewriteOptions;
};

export type MarkpromptConfig = {
  include?: string[];
  exclude?: string[];
  processorOptions?: MarkdownProcessorOptions;
  insightsMetadataFields?: string[];
};

export const MARKPROMPT_CONFIG_SCHEMA: JTDSchemaType<MarkpromptConfig> = {
  optionalProperties: {
    include: { elements: { type: 'string' } },
    exclude: { elements: { type: 'string' } },
    processorOptions: {
      optionalProperties: {
        linkRewrite: {
          properties: {
            rules: {
              elements: {
                properties: {
                  pattern: { type: 'string' },
                  replace: { type: 'string' },
                },
              },
            },
          },
          optionalProperties: {
            excludeExternalLinks: { type: 'boolean' },
          },
        },
        imageSourceRewrite: {
          properties: {
            rules: {
              elements: {
                properties: {
                  pattern: { type: 'string' },
                  replace: { type: 'string' },
                },
              },
            },
          },
          optionalProperties: {
            excludeExternalLinks: { type: 'boolean' },
          },
        },
      },
    },
    insightsMetadataFields: { elements: { type: 'string' } },
  },
};

const ajv = new Ajv();

export const parse = ajv.compileParser(MARKPROMPT_CONFIG_SCHEMA);
