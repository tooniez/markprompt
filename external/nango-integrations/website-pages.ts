import type { NangoSync, NangoFile } from './models';

interface Metadata {
  baseUrl: string;
  includeGlobs?: string[];
  excludeGlobs?: string[];
  requestHeaders?: { [key: string]: string };
}

type NangoFileWithNextUrls = {
  file: Omit<NangoFile, 'last_modified'>;
  nextUrls: string[];
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
    const v = arr[i] as string;
    if (result.indexOf(v) === -1) {
      result.push(v);
    }
  }

  return result;
};

const WEBSITE_PAGES_PROVIDER_CONFIG_KEY = 'website-pages';

const fetchPageAndUrls =
  (
    nango: NangoSync,
    pageFetcherServiceBaseUrl: string,
    pageFetcherServicePath: string,
    pageFetcherServiceAPIToken: string,
    crawlerRoot: string,
    requestHeaders: { [key: string]: string } | undefined,
    includeGlobs: string[] | undefined,
    excludeGlobs: string[] | undefined,
  ) =>
  async (url: string): Promise<NangoFileWithNextUrls> => {
    await nango.log(
      'FETCHING: ' +
        JSON.stringify({
          method: 'POST',
          baseUrlOverride: pageFetcherServiceBaseUrl,
          endpoint: pageFetcherServicePath,
          providerConfigKey: WEBSITE_PAGES_PROVIDER_CONFIG_KEY,
          connectionId: nango.connectionId!,
          retries: 5,
          data: JSON.stringify({
            url,
            crawlerRoot,
            includePageUrls: true,
            requestHeaders,
            includeGlobs,
            excludeGlobs,
          }),
          headers: {
            'Content-Type': 'application/json',
            accept: 'application/json',
          },
        }),
    );
    // Note that this endpoint returns FULL urls. That is, it has resolved
    // e.g. absolute and relative URLs to their fully specified paths with
    // base URL prepended. It has also applied the glob filters if provided
    // (since doing it here is practically impossible, as `minimatch` cannot
    // be imported).

    const res = await nango.proxy({
      method: 'POST',
      baseUrlOverride: pageFetcherServiceBaseUrl,
      endpoint: pageFetcherServicePath,
      providerConfigKey: WEBSITE_PAGES_PROVIDER_CONFIG_KEY,
      connectionId: nango.connectionId!,
      retries: 5,
      data: JSON.stringify({
        url,
        crawlerRoot,
        includePageUrls: true,
        requestHeaders,
        includeGlobs,
        excludeGlobs,
      }),
      headers: {
        Authorization: `Bearer ${pageFetcherServiceAPIToken}`,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
    });

    console.log('Response', JSON.stringify(res.data, null, 2));

    // const pageRes = await fetch(pageFetcherServiceUrl, {
    //   method: 'POST',
    //   body: JSON.stringify({
    //     url,
    //     crawlerRoot,
    //     includePageUrls: true,
    //     requestHeaders,
    //     includeGlobs,
    //     excludeGlobs,
    //   }),
    //   headers: {
    //     Authorization: `Bearer ${pageFetcherServiceAPIToken}`,
    //     'Content-Type': 'application/json',
    //     accept: 'application/json',
    //   },
    // });

    let content = '';
    let nextUrls: string[] = [];
    let error: string | undefined = undefined;

    content = 'abc';
    nextUrls = ['123'];
    error = undefined;

    // if (pageRes.ok) {
    //   const { content: _content, urls } = await pageRes.json();
    //   content = _content;
    //   nextUrls = urls;
    // } else {
    //   error = await pageRes.text();
    // }

    return {
      file: {
        id: url,
        path: url,
        title: undefined,
        content: content,
        contentType: 'html',
        meta: undefined,
        error,
      },
      nextUrls,
    };
  };

const parallelFetchPages = async (
  nango: NangoSync,
  pageFetcherServiceBaseUrl: string,
  pageFetcherServicePath: string,
  pageFetcherServiceAPIToken: string,
  crawlerRoot: string,
  urls: string[],
  requestHeaders: { [key: string]: string } | undefined,
  includeGlobs: string[] | undefined,
  excludeGlobs: string[] | undefined,
): Promise<NangoFileWithNextUrls[]> => {
  return Promise.all(
    urls.map(
      fetchPageAndUrls(
        nango,
        pageFetcherServiceBaseUrl,
        pageFetcherServicePath,
        pageFetcherServiceAPIToken,
        crawlerRoot,
        requestHeaders,
        includeGlobs,
        excludeGlobs,
      ),
    ),
  );
};

const fetchPages = async (
  nango: NangoSync,
  pageFetcherServiceBaseUrl: string,
  pageFetcherServicePath: string,
  pageFetcherServiceAPIToken: string,
  crawlerRoot: string,
  urls: string[],
  requestHeaders: { [key: string]: string } | undefined,
  includeGlobs: string[] | undefined,
  excludeGlobs: string[] | undefined,
): Promise<{ files: NangoFile[]; nextUrls: string[] }> => {
  const files: NangoFile[] = [];
  const nextUrls: string[] = [];

  const parallelization = 50;
  const urlChunks = chunkArray(urls, parallelization);

  for (const urlChunk of urlChunks) {
    const filesWithUrls = await parallelFetchPages(
      nango,
      pageFetcherServiceBaseUrl,
      pageFetcherServicePath,
      pageFetcherServiceAPIToken,
      crawlerRoot,
      urlChunk,
      requestHeaders,
      includeGlobs,
      excludeGlobs,
    );
    filesWithUrls
      .flatMap((f) => f.file)
      .forEach((f) => {
        files.push(f);
      });
    filesWithUrls
      .flatMap((f) => f.nextUrls)
      .forEach((url) => {
        nextUrls.push(url);
      });
  }

  return { files, nextUrls: unique(nextUrls) };
};

export default async function fetchData(nango: NangoSync) {
  if (!nango.connectionId) {
    return;
  }

  const { baseUrl, includeGlobs, excludeGlobs, requestHeaders } =
    await nango.getMetadata<Metadata>();

  await nango.log('baseUrl: ' + baseUrl);

  if (!baseUrl) {
    throw new Error('Missing base URL.');
  }

  const envVariables = await nango.getEnvironmentVariables();
  const pageFetcherServiceBaseUrl = envVariables?.find(
    (v) => v.name === 'CUSTOM_PAGE_FETCH_SERVICE_BASE_URL',
  )?.value;
  const pageFetcherServicePath = envVariables?.find(
    (v) => v.name === 'CUSTOM_PAGE_FETCH_SERVICE_PATH',
  )?.value;
  const pageFetcherServiceAPIToken = envVariables?.find(
    (v) => v.name === 'MARKPROMPT_API_TOKEN',
  )?.value;

  if (
    !pageFetcherServiceBaseUrl ||
    !pageFetcherServicePath ||
    !pageFetcherServiceAPIToken
  ) {
    throw new Error('Missing page fetcher service URL or API token.');
  }

  const filesToSave: NangoFile[] = [];

  const processedUrls: string[] = [];
  let linksToProcess = [baseUrl];

  const maxAllowedPages = 10000;
  let numProcessedLinks = 0;

  await nango.log(`linksToProcess: ${JSON.stringify(linksToProcess)}`);

  while (linksToProcess.length > 0) {
    try {
      numProcessedLinks += linksToProcess.length;

      const { files, nextUrls } = await fetchPages(
        nango,
        pageFetcherServiceBaseUrl,
        pageFetcherServicePath,
        pageFetcherServiceAPIToken,
        baseUrl,
        linksToProcess,
        requestHeaders,
        includeGlobs,
        excludeGlobs,
      );

      files.forEach((file) => {
        filesToSave.push(file);
      });

      linksToProcess.forEach((url) => {
        processedUrls.push(url);
      });

      linksToProcess = nextUrls
        .filter((url) => !processedUrls.includes(url))
        .slice(0, Math.max(0, maxAllowedPages - numProcessedLinks));
    } catch (e) {
      await nango.log(`[website-pages] ERROR: ${e}`);
      break;
    }
  }

  await nango.log(`Files to save: ${filesToSave.length}`);

  await nango.batchSave(filesToSave, 'NangoFile');
}
