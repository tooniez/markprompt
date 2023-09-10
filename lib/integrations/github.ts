import JSZip from 'jszip';
import { isPresent } from 'ts-is-present';

import { ApiError, FileData, PathContentData } from '@/types/types';

import { extractRepoContentFromZip } from './github.node';
import { getFileType, getNameFromPath, parseGitHubURL } from '../utils';

// Note also that GitHub archives include a repo id at the rooth of the paths.
export const getMarkpromptPathFromGitHubArchivePath = (path: string) => {
  return path.split('/').slice(1).join('/');
};

const downloadAndExtractRepo = async (
  owner: string,
  repo: string,
  branch: string | undefined,
  offset: number,
  includeGlobs: string[],
  excludeGlobs: string[],
  onUpdate: (message: string) => void,
): Promise<PathContentData[]> => {
  onUpdate('Fetching repository');
  const res = await fetch('/api/github/fetch-archive', {
    method: 'POST',
    body: JSON.stringify({
      owner,
      repo,
      branch,
      offset,
      includeGlobs,
      excludeGlobs,
    }),
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok || !res.body) {
    throw new ApiError(res.status, await res.text());
  }

  onUpdate('Extracting repository archive');
  const reader = res.body.getReader();
  let done = false;
  const chunks = [];

  let numChunk = 0;
  while (!done) {
    numChunk++;
    const { value, done: doneReading } = await reader.read();
    done = doneReading;
    if (value) {
      chunks.push(value);
    }
    if (numChunk % 1000 === 0) {
      console.info('Streaming chunk', numChunk);
    }
  }

  const buffer = Buffer.concat(chunks);
  const jsZip = new JSZip();
  const zip = await jsZip.loadAsync(buffer);

  return extractRepoContentFromZip(zip.files, 0, includeGlobs, excludeGlobs);
};

export const getGitHubFiles = async (
  url: string,
  branch: string | undefined,
  includeGlobs: string[],
  excludeGlobs: string[],
  onMessage: (message: string) => void,
): Promise<FileData[]> => {
  const info = parseGitHubURL(url);
  if (!info?.owner && !info?.repo) {
    return [];
  }

  const data = await downloadAndExtractRepo(
    info.owner,
    info.repo,
    branch,
    0,
    includeGlobs,
    excludeGlobs,
    onMessage,
  );

  return data
    .map((fileData) => {
      const name = getNameFromPath(fileData.path);
      const fileType = getFileType(name);
      // GitHub archives also include folders, which
      // we omit here.
      if (fileData.path?.endsWith('/')) {
        return undefined;
      }
      return {
        ...fileData,
        fileType,
        name: getNameFromPath(fileData.path),
      };
    })
    .filter(isPresent);
};
