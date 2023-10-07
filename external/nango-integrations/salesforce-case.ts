/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NangoSync, NangoFile } from './models';

interface Metadata {
  customFields: string[];
  filters: string;
  mappings: {
    title: string | undefined;
    content: string | undefined;
    path: string | undefined;
  };
  metadataFields: string[];
}

export default async function fetchData(nango: NangoSync) {
  const metadata = await nango.getMetadata<Metadata>();

  const fixedFields = ['Id', 'CaseNumber', 'Subject', 'LastModifiedDate'];
  const customFields = (metadata?.customFields || []).filter(
    (f) => !fixedFields.includes(f),
  );
  const fields = [...fixedFields, ...customFields];

  let query = `SELECT ${fields.join(
    ', ',
  )}, (SELECT Id, CommentBody, CreatedDate FROM CaseComments) FROM Case`;

  const filters = metadata?.filters;

  let didSetWhere = false;
  if (filters?.length > 0) {
    didSetWhere = true;
    query += ` WHERE (${filters})`;
  }

  if (nango.lastSyncDate) {
    query += ` ${
      didSetWhere ? 'AND' : 'WHERE'
    } LastModifiedDate > ${nango.lastSyncDate.toISOString()}`;
  }

  let endpoint = '/services/data/v53.0/query';

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const response = await nango.get({
      endpoint: endpoint,
      params: endpoint === '/services/data/v53.0/query' ? { q: query } : {},
    });

    const mappedRecords = mapRecords(
      response.data.records,
      metadata?.mappings,
      metadata?.metadataFields,
    );

    await nango.batchSave(mappedRecords, 'NangoFile');

    if (response.data.done) {
      break;
    }

    endpoint = response.data.nextRecordsUrl;
  }
}

function mapRecords(
  records: any[],
  mappings: Metadata['mappings'],
  metadataFields: Metadata['metadataFields'],
): NangoFile[] {
  return records.map((record: any) => {
    return {
      id: record.Id,
      path: mappings.path ? record[mappings.path] : record.CaseNumber,
      title: mappings.title ? record[mappings.title] : record.Subject,
      content: mappings.content
        ? record[mappings.content]
        : (record.Description ? record.Description + '\n\n' : '') +
          (
            record.CaseComments?.records.map((comment: any) => {
              return comment.CommentBody;
            }) || []
          ).join('\n\n'),
      contentType: 'md',
      meta: {
        ...(metadataFields || []).reduce((acc, key) => {
          return { ...acc, [key]: record[key] };
        }, {}),
      },
    };
  });
}
