// Utilities that run without dependencies on any runtime, like
// edge, node or browser. Anything in here can run anywhere.
import { DbSource, Source } from '@/types/types';

import { APPROX_CHARS_PER_TOKEN } from './constants';

export const getNameFromUrlOrPath = (url: string) => {
  // When processing a text file, the type of a file (md, mdoc, html, etc)
  // is determined by the file name, specifically by its extension. In
  // the case where we are parsing websites, the URL of the page might
  // not contain the HTML extension, we nevertheless consider it as an
  // HTML file.
  const baseName = url.split('/').slice(-1)[0];
  if (/\.html$/.test(baseName)) {
    return baseName;
  } else if (baseName.length > 0) {
    return `${baseName}.html`;
  } else {
    return 'index.html';
  }
};

export const getFileNameForSourceAtPath = (source: Source, path: string) => {
  switch (source.type) {
    case 'website': {
      // Handles e.g. index.html when last path component is empty
      return getNameFromUrlOrPath(path);
    }
    default:
      return path.split('/').slice(-1)[0];
  }
};

export const getNameForPath = (
  sources: DbSource[],
  sourceId: DbSource['id'],
  path: string,
) => {
  const source = sources.find((s) => s.id === sourceId);
  if (!source) {
    return path;
  }
  return getFileNameForSourceAtPath(source, path);
};

export const isFalsyQueryParam = (param: unknown): param is false => {
  if (typeof param === 'string') {
    return param === 'false' || param === '0';
  } else if (typeof param === 'number') {
    return param === 0;
  } else {
    return param === false;
  }
};

export const isTruthyQueryParam = (param: unknown): param is true => {
  if (typeof param === 'string') {
    return param === 'true' || param === '1';
  } else if (typeof param === 'number') {
    return param === 1;
  } else {
    return param === true;
  }
};

export const roundToLowerOrderDecimal = (n: number) => {
  const order = Math.pow(10, Math.round(Math.log10(n)));
  const roundedNumber = Math.round(n / order) * order;
  return roundedNumber;
};

// Fast approximate token count. We use a slightly smaller value
// to ensure we stay within boundaries.
export const approximatedTokenCount = (text: string) => {
  return Math.round(text.length / APPROX_CHARS_PER_TOKEN);
};

const includesWithComparison = <T>(
  array: T[],
  element: T,
  comparisonFunction?: (item1: T, item2: T) => boolean,
) => {
  if (!comparisonFunction) {
    return array.includes(element);
  }

  for (let i = 0; i < array.length; i++) {
    if (comparisonFunction(array[i], element)) {
      return true;
    }
  }
  return false;
};

export const arrayEquals = <T>(
  arr1: T[],
  arr2: T[],
  comparisonFunction?: (item1: T, item2: T) => boolean,
) => {
  if (arr1.length !== arr2.length) {
    return false;
  }

  return arr1.every((item) =>
    includesWithComparison(arr2, item, comparisonFunction),
  );
};
