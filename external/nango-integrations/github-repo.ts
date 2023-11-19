/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NangoSync, NangoFile } from './models';

// interface Metadata {
//   owner: string;
//   repo: string;
//   branch: string;
// }

const LIMIT = 100;

export default async function fetchData(nango: NangoSync) {
  // const { owner, repo, branch } = await nango.getMetadata<Metadata>();

  const owner = 'motifland';
  const repo = 'markprompt-sample-docs';
  const branch = 'main';
  const includeRegexes: string[] = ['^docs/.*$', '^blog.*$'];
  const excludeRegexes: string[] = ['^blog/api.mdoc$'];

  if (!nango.lastSyncDate) {
    await saveAllRepositoryFiles(
      nango,
      owner,
      repo,
      branch,
      includeRegexes,
      excludeRegexes,
    );
  } else {
    await saveFileUpdates(
      nango,
      owner,
      repo,
      nango.lastSyncDate,
      includeRegexes,
      excludeRegexes,
    );
  }
}

const shouldIncludeFile = (
  url: string,
  includeRegexes: string[],
  excludeRegexes: string[],
) => {
  if (includeRegexes.length === 0 && excludeRegexes.length === 0) {
    return true;
  }

  if (
    includeRegexes.length > 0 &&
    !includeRegexes.some((re) => new RegExp(re, 'g').test(url))
  ) {
    // If the URL does not match the include pattern when this pattern is
    // provided, exclude.
    return false;
  }

  if (
    excludeRegexes.length > 0 &&
    excludeRegexes.some((re) => new RegExp(re, 'g').test(url))
  ) {
    // If the URL matches the exclude pattern when this pattern is
    // provided, exclude.
    return false;
  }

  return true;
};

async function saveAllRepositoryFiles(
  nango: NangoSync,
  owner: string,
  repo: string,
  branch: string,
  includeRegexes: string[],
  excludeRegexes: string[],
) {
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
}

async function saveFileUpdates(
  nango: NangoSync,
  owner: string,
  repo: string,
  since: Date,
  includeRegexes: string[],
  excludeRegexes: string[],
) {
  const commitsSinceLastSync: any[] = await getCommitsSinceLastSync(
    owner,
    repo,
    since,
    nango,
    includeRegexes,
    excludeRegexes,
  );

  for (const commitSummary of commitsSinceLastSync) {
    await saveFilesUpdatedByCommit(owner, repo, commitSummary, nango);
  }
}

async function getCommitsSinceLastSync(
  owner: string,
  repo: string,
  since: Date,
  nango: NangoSync,
  includeRegexes: string[] | undefined,
  excludeRegexes: string[] | undefined,
) {
  console.log(includeRegexes, excludeRegexes);

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
}

async function saveFilesUpdatedByCommit(
  owner: string,
  repo: string,
  commitSummary: any,
  nango: NangoSync,
) {
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
      fileBatch.filter((file: any) => file.status !== 'removed').map(mapToFile),
      'NangoFile',
    );
    await nango.batchDelete(
      fileBatch.filter((file: any) => file.status === 'removed').map(mapToFile),
      'NangoFile',
    );
  }
  await nango.log(`Got ${count} file(s).`);
}

const getExtension = (path: string) => {
  return path.split('/')?.slice(-1)[0]?.split('.').slice(-1)[0] || 'md';
};

function mapToFile(file: any): NangoFile {
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

  // return {
  //   id: file.sha,
  //   name: file.path || file.filename,
  //   url: file.url || file.blob_url,
  //   last_modified_date: file.committer?.date
  //     ? new Date(file.committer?.date)
  //     : new Date(), // Use commit date or current date
  // };
}
