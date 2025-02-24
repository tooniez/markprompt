export const I_DONT_KNOW = 'Sorry, I am not sure how to answer that.';
export const MIN_CONTENT_LENGTH = 5;
export const MAX_PROMPT_LENGTH = 200;
export const STREAM_SEPARATOR = '___START_RESPONSE_STREAM___';
export const CONTEXT_TOKENS_CUTOFF = 4000;
export const CONTEXT_TOKENS_CUTOFF_GPT_3_5_TURBO = 2048;
export const APPROX_CHARS_PER_TOKEN = 3.8;
export const SAMPLE_REPO_URL =
  'https://github.com/motifland/markprompt-sample-docs';
export const MIN_SLUG_LENGTH = 3;

export const DEFAULT_MARKPROMPT_CONFIG = `{
  "include": [
    "**/*"
  ],
  "exclude": [],
  "processorOptions": {}
}`;

export const MARKPROMPT_JS_PACKAGE_VERSIONS = {
  css: '0.11.0',
  web: '0.14.3',
  react: '0.18.0',
  'docusaurus-theme-search': '0.8.1',
};
