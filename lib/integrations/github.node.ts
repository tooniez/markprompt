import { sign } from 'jsonwebtoken';
import JSZip from 'jszip';
import { Octokit } from 'octokit';
import { isPresent } from 'ts-is-present';

import { PathContentData } from '@/types/types';

import { getMarkpromptPathFromGitHubArchivePath } from './github';
import {
  getNameFromPath,
  parseGitHubURL,
  shouldIncludeFileWithPath,
} from '../utils';

export const isGitHubRepoAccessible = async (
  url: string,
  branch: string | null,
  accessToken?: string,
) => {
  const octokit = new Octokit(accessToken ? { auth: accessToken } : {});
  const info = parseGitHubURL(url);
  if (!info?.owner && !info?.repo) {
    return false;
  }
  try {
    let requestUrl = `/repos/${info.owner}/${info.repo}`;
    if (branch && branch.length > 0) {
      requestUrl = requestUrl + `/branches/${branch}`;
    }
    const res = await octokit.request(`GET ${requestUrl}`);
    if (res.status === 200) {
      return true;
    }
  } catch (e) {
    //
  }
  return false;
};

const getRepo = async (owner: string, repo: string, octokit: Octokit) => {
  const res = await octokit.request('GET /repos/{owner}/{repo}', {
    owner,
    repo,
  });
  return res.data;
};

const getDefaultBranch = async (
  owner: string,
  repo: string,
  octokit: Octokit,
) => {
  const _repo = await getRepo(owner, repo, octokit);

  const branchRes = await octokit.request(
    `GET /repos/{owner}/{repo}/branches/{branch}`,
    { owner, repo, branch: _repo.default_branch },
  );

  return branchRes.data;
};

const getTree = async (owner: string, repo: string, octokit: Octokit) => {
  const defaultBranch = await getDefaultBranch(owner, repo, octokit);

  const tree = await octokit.request(
    'GET /repos/{owner}/{repo}/git/trees/{tree_sha}',
    {
      owner,
      repo,
      tree_sha: defaultBranch.commit.sha,
      recursive: '1',
    },
  );

  return tree.data.tree;
};

export const getRepositoryMDFilesInfo = async (
  url: string,
  includeGlobs: string[],
  excludeGlobs: string[],
  accessToken: string | undefined,
): Promise<{ name: string; path: string; url: string; sha: string }[]> => {
  const info = parseGitHubURL(url);
  if (!info?.owner && !info?.repo) {
    return [];
  }

  // We don't require the user to provide an access token in order to
  // fetch the repository file info, e.g. for public repos.
  let octokit: Octokit;
  if (accessToken) {
    octokit = new Octokit({
      auth: accessToken,
    });
  } else {
    octokit = new Octokit();
  }

  const tree = await getTree(info.owner, info.repo, octokit);

  const mdFileUrls = tree
    .map((f) => {
      if (
        f.url &&
        f.path &&
        shouldIncludeFileWithPath(f.path, includeGlobs, excludeGlobs, false)
      ) {
        let path = f.path;
        if (!path.startsWith('/')) {
          path = '/' + path;
        }
        return {
          name: getNameFromPath(f.path),
          path,
          url: f.url,
          sha: f.sha || '',
        };
      }
      return undefined;
    })
    .filter(isPresent);
  return mdFileUrls;
};

export const getJWT = () => {
  if (!process.env.GITHUB_PRIVATE_KEY) {
    throw new Error('Missing GitHub private key');
  }

  const payload = {
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 10 * 60, // Token expires in 10 minutes
    iss: process.env.GITHUB_MARKPROMPT_APP_ID,
  };

  return sign(payload, process.env.GITHUB_PRIVATE_KEY, {
    algorithm: 'RS256',
  });
};

export const extractRepoContentFromZip = async (
  zipFiles: typeof JSZip.files,
  offset = 0,
  includeGlobs: string[],
  excludeGlobs: string[],
): Promise<PathContentData[]> => {
  const mdFileData: PathContentData[] = [];

  // Remove all non-md files here, we don't want to carry an
  // entire repo over the wire. We sort the keys, as I am not
  // sure that two subsequent calls to download a zip archive
  // from GitHub always produces that same file structure.
  const relativePaths = Object.keys(zipFiles)
    .sort()
    .filter((p) => {
      // Ignore files with unsupported extensions and files in dot
      // folders, like .github.
      const pathWithoutRepoId = getMarkpromptPathFromGitHubArchivePath(p);
      return shouldIncludeFileWithPath(
        pathWithoutRepoId,
        includeGlobs,
        excludeGlobs,
        false,
      );
    });

  for (let i = offset; i < relativePaths.length; i++) {
    const relativePath = relativePaths[i];

    // In a GitHub archive, the file tree is contained in a top-level
    // parent folder named `<repo>-<branch>`. We don't want to have
    // references to this folder in the exposed file tree.
    let path = relativePath.split('/').slice(1).join('/');
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    const content = await zipFiles[relativePath].async('text');
    mdFileData.push({ path, content });
  }

  return mdFileData;
};
