import type { NangoSync, NangoFile } from './models';

interface Metadata {
  baseUrl: string;
  include?: string[];
  exclude?: string[];
  requestHeaders?: { [key: string]: string };
}

type NangoFileWithNextUrls = { file: NangoFile; nextUrls: string[] };

const removeTrailingSlashQueryParamsAndHash = (url: string) => {
  const urlObj = new URL(url);
  urlObj.search = '';
  urlObj.hash = '';
  return urlObj.toString().replace(/\/+$/, '');
};

const chunkArray = (arr: string[], chunkSize: number) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    chunks.push(arr.slice(i, i + chunkSize));
  }
  return chunks;
};

const unique = (arr: string[]) => {
  const result: string[] = [];

  for (let i = 0; i < arr.length; i++) {
    if (result.indexOf(arr[i]) === -1) {
      result.push(arr[i]);
    }
  }

  return result;
};

const fetchPageAndUrls =
  (
    crawlerRoot: string,
    requestHeaders: { [key: string]: string } | undefined,
    include: string[] | undefined,
    exclude: string[] | undefined,
  ) =>
  async (url: string): Promise<NangoFileWithNextUrls> => {
    // Note that this endpoint returns FULL urls. That is, it has resolved
    // e.g. absolute and relative URLs to their fully specified paths with
    // base URL prepended. It has also applied the glob filters if provided
    // (since doing it here is practically impossible, as `minimatch` cannot
    // be imported).
    const pageRes = await fetch(process.env.CUSTOM_PAGE_FETCH_SERVICE_URL!, {
      method: 'POST',
      body: JSON.stringify({
        url,
        crawlerRoot,
        requestHeaders,
        include,
        exclude,
      }),
      headers: {
        Authorization: `Bearer ${process.env.MARKPROMPT_API_TOKEN}`,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
    });

    let content = '';
    let nextUrls: string[] = [];
    let error: string | undefined = undefined;

    if (pageRes.ok) {
      const { content: _content, urls } = await pageRes.json();
      content = _content;
      nextUrls = urls;
    } else {
      error = await pageRes.text();
    }

    return {
      file: {
        id: url,
        path: url,
        title: undefined,
        content: content,
        contentType: 'html',
        error,
      },
      nextUrls,
    };
  };

const parallelFetchPagesReturnUniqueExtractedUrls = async (
  crawlerRoot: string,
  urls: string[],
  requestHeaders: { [key: string]: string } | undefined,
  include: string[] | undefined,
  exclude: string[] | undefined,
): Promise<NangoFileWithNextUrls[]> => {
  return Promise.all(
    urls.map(fetchPageAndUrls(crawlerRoot, requestHeaders, include, exclude)),
  );
};

const fetchAndStorePagesReturnUniqueExtractedUrls = async (
  crawlerRoot: string,
  urls: string[],
  requestHeaders: { [key: string]: string } | undefined,
  include: string[] | undefined,
  exclude: string[] | undefined,
): Promise<{ files: NangoFile[]; nextUrls: string[] }> => {
  const files: NangoFile[] = [];
  const nextUrls: string[] = [];

  const parallelization = 50;
  const urlChunks = chunkArray(urls, parallelization);

  for (const urlChunk of urlChunks) {
    const filesWithUrls = await parallelFetchPagesReturnUniqueExtractedUrls(
      crawlerRoot,
      urlChunk,
      requestHeaders,
      include,
      exclude,
    );
    const newFiles = filesWithUrls.flatMap((f) => f.file);
    const nextUrlsForChunk = filesWithUrls.flatMap((f) => f.nextUrls);
    nextUrls.concat(nextUrlsForChunk);
    files.concat(newFiles);
  }

  return { files, nextUrls: unique(nextUrls) };
};

export default async function fetchData(nango: NangoSync) {
  if (!nango.connectionId) {
    return;
  }

  const { baseUrl, include, exclude, requestHeaders } =
    await nango.getMetadata<Metadata>();

  const filesToSave: NangoFile[] = [];

  const normalizedBaseUrl = removeTrailingSlashQueryParamsAndHash(baseUrl);
  const processedUrls: string[] = [];
  let linksToProcess = [normalizedBaseUrl];

  const maxAllowedPages = 10000;
  let numProcessedLinks = 0;

  while (linksToProcess.length > 0) {
    try {
      numProcessedLinks += linksToProcess.length;

      const { files, nextUrls } =
        await fetchAndStorePagesReturnUniqueExtractedUrls(
          baseUrl,
          linksToProcess,
          requestHeaders,
          include,
          exclude,
        );

      filesToSave.concat(files);
      processedUrls.concat(linksToProcess);

      linksToProcess = nextUrls
        .filter((url) => !processedUrls.includes(url))
        .slice(0, Math.max(0, maxAllowedPages - numProcessedLinks));
    } catch (e) {
      break;
    }
  }

  await nango.batchSave(filesToSave, 'NangoFile');
}
