/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NangoSync, NangoFile } from './models';

interface Metadata {
  owner: string;
  repo: string;
  branch: string;
  includeRegexes?: string[];
  excludeRegexes?: string[];
}

const LIMIT = 100_000;

const GITHUB_REPO_PROVIDER_CONFIG_KEY = 'github-repo';

export default async function fetchData(nango: NangoSync) {
  const {
    owner,
    repo,
    branch: _branch,
    includeRegexes,
    excludeRegexes,
  } = await nango.getMetadata<Metadata>();

  let branch = _branch;
  if (!branch) {
    branch = await getDefaultBranch(nango, owner, repo);
  }

  if (!nango.lastSyncDate) {
    await saveAllRepositoryFiles(
      nango,
      owner,
      repo,
      branch,
      includeRegexes || [],
      excludeRegexes || [],
    );
  } else {
    await saveFileUpdates(
      nango,
      owner,
      repo,
      includeRegexes || [],
      excludeRegexes || [],
      nango.lastSyncDate,
    );
  }
}

const getDefaultBranch = async (
  nango: NangoSync,
  owner: string,
  repo: string,
) => {
  const res = await nango.proxy({
    method: 'GET',
    endpoint: `/repos/${owner}/${repo}`,
    providerConfigKey: GITHUB_REPO_PROVIDER_CONFIG_KEY,
    connectionId: nango.connectionId!,
    retries: 10,
  });

  return res.data.default_branch;
};

const saveAllRepositoryFiles = async (
  nango: NangoSync,
  owner: string,
  repo: string,
  branch: string | undefined,
  includeRegexes: string[],
  excludeRegexes: string[],
) => {
  let count = 0;

  const endpoint = `/repos/${owner}/${repo}/git/trees/${branch}`;
  const proxyConfig = {
    endpoint,
    params: { recursive: '1' },
    paginate: { response_path: 'tree', limit: LIMIT },
  };

  await nango.log(`Fetching files from endpoint ${endpoint}.`);

  for await (const fileBatch of nango.paginate(proxyConfig)) {
    const blobFiles = fileBatch.filter((item: any) => {
      return (
        item.type === 'blob' &&
        shouldIncludeFile(item.path, includeRegexes, excludeRegexes)
      );
    });
    count += blobFiles.length;
    await nango.batchSave(blobFiles.map(mapToFile), 'NangoFile');
  }
  await nango.log(`Got ${count} file(s).`);
};

const saveFileUpdates = async (
  nango: NangoSync,
  owner: string,
  repo: string,
  includeRegexes: string[],
  excludeRegexes: string[],
  since: Date,
) => {
  const commitsSinceLastSync: any[] = await getCommitsSinceLastSync(
    owner,
    repo,
    since,
    nango,
  );

  for (const commitSummary of commitsSinceLastSync) {
    await saveFilesUpdatedByCommit(
      owner,
      repo,
      commitSummary,
      includeRegexes,
      excludeRegexes,
      nango,
    );
  }
};

const getCommitsSinceLastSync = async (
  owner: string,
  repo: string,
  since: Date,
  nango: NangoSync,
) => {
  let count = 0;
  const endpoint = `/repos/${owner}/${repo}/commits`;

  const proxyConfig = {
    endpoint,
    params: { since: since.toISOString() },
    paginate: {
      limit: LIMIT,
    },
  };

  await nango.log(`Fetching commits from endpoint ${endpoint}.`);

  const commitsSinceLastSync: any[] = [];
  for await (const commitBatch of nango.paginate(proxyConfig)) {
    count += commitBatch.length;
    commitsSinceLastSync.push(...commitBatch);
  }
  await nango.log(`Got ${count} commits(s).`);
  return commitsSinceLastSync;
};

const saveFilesUpdatedByCommit = async (
  owner: string,
  repo: string,
  commitSummary: any,
  includeRegexes: string[],
  excludeRegexes: string[],
  nango: NangoSync,
) => {
  let count = 0;
  const endpoint = `/repos/${owner}/${repo}/commits/${commitSummary.sha}`;
  const proxyConfig = {
    endpoint,
    paginate: {
      response_data_path: 'files',
      limit: LIMIT,
    },
  };

  await nango.log(`Fetching files from endpoint ${endpoint}.`);

  for await (const fileBatch of nango.paginate(proxyConfig)) {
    count += fileBatch.length;
    await nango.batchSave(
      fileBatch
        .filter((file: any) => {
          return (
            file.status !== 'removed' &&
            shouldIncludeFile(file.path, includeRegexes, excludeRegexes)
          );
        })
        .map(mapToFile),
      'NangoFile',
    );
    await nango.batchDelete(
      fileBatch.filter((file: any) => file.status === 'removed').map(mapToFile),
      'NangoFile',
    );
  }
  await nango.log(`Got ${count} file(s).`);
};

const getExtension = (path: string) => {
  return path.split('/')?.slice(-1)[0]?.split('.').slice(-1)[0] || 'md';
};

// Must synchronize with source of truth
const SUPPORTED_EXTENSIONS = [
  'md',
  'mdx',
  'mdoc',
  'rst',
  'txt',
  'text',
  'html',
  'htm',
];

const shouldIncludeFile = (
  path: string,
  includeRegexes: string[],
  excludeRegexes: string[],
) => {
  if (!SUPPORTED_EXTENSIONS.includes(getExtension(path))) {
    return false;
  }

  if (includeRegexes.length === 0 && excludeRegexes.length === 0) {
    return true;
  }

  if (
    includeRegexes.length > 0 &&
    !includeRegexes.some((re) => new RegExp(re, 'g').test(path))
  ) {
    // If the URL does not match the include pattern when this pattern is
    // provided, exclude.
    return false;
  }

  if (
    excludeRegexes.length > 0 &&
    excludeRegexes.some((re) => new RegExp(re, 'g').test(path))
  ) {
    // If the URL matches the exclude pattern when this pattern is
    // provided, exclude.
    return false;
  }

  return true;
};

const mapToFile = (file: any): NangoFile => {
  // The Nango sync only extracts file metadata. The content is fetched in
  // Inngest runs, as it is easier in Inngest to handle the rate limits (5000
  // API calls per hour) imposed by GitHub.
  return {
    id: file.path,
    path: file.path,
    title: undefined,
    content: undefined,
    contentType: getExtension(file.path),
    meta: undefined,
    lastModified: file.committer?.date
      ? new Date(file.committer?.date)
      : new Date(),
    error: undefined,
  };
};
