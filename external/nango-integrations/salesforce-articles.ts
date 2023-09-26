/* eslint-disable @typescript-eslint/no-explicit-any */
import { NangoSync, NangoFile } from './models';

interface Metadata {
  customFields: string[];
  filters: string;
}

export default async function fetchData(nango: NangoSync) {
  const metadata = await nango.getMetadata<Metadata>();

  const fixedFields = ['Id', 'Title', 'LastModifiedDate'];
  const customFields = (metadata?.customFields || []).filter(
    (f) => !fixedFields.includes(f),
  );
  const fields = [...fixedFields, ...customFields];

  const filters = metadata?.filters;

  let query = `SELECT ${fields.join(', ')}
        FROM Knowledge__kav
        WHERE IsLatestVersion = true AND (${filters})`;

  if (nango.lastSyncDate) {
    query += ` WHERE LastModifiedDate > ${nango.lastSyncDate.toISOString()}`;
  }

  let endpoint = '/services/data/v53.0/query';

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const response = await nango.get({
      endpoint: endpoint,
      params: endpoint === '/services/data/v53.0/query' ? { q: query } : {},
    });

    const mappedRecords = mapRecords(response.data.records, customFields);

    await nango.batchSave(mappedRecords, 'NangoFile');

    if (response.data.done) {
      break;
    }

    endpoint = response.data.nextRecordsUrl;
  }
}

function mapRecords(records: any[], customFields: string[]): NangoFile[] {
  return records.map((record: any) => {
    return {
      id: record.Id as string,
      title: record.Name,
      path: record.Name,
      content: customFields
        .map((field: string) => `Field: ${field}\n${record[field]}`)
        .join('\n'),
      last_modified: record.LastModifiedDate,
    };
  });
}
