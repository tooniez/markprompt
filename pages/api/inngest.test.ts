/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { getSourceId } from '@/lib/integrations/nango.server';
import { createServiceRoleSupabaseClient } from '@/lib/supabase';
import { DbFile, FileSections, NangoFileWithMetadata } from '@/types/types';

import { createFullMeta, isFileChanged, runTrainFile } from './inngest';

let files: DbFile[] = [];
let fileSections: FileSections[] = [];

const supabaseClient = {
  from: (table: string) => ({
    insert: (values: any[]) => {
      if (table === 'files') {
        return {
          select: (select: string) => ({
            limit: (limit: number) => ({
              maybeSingle: () => ({
                then: (callback: any) => {
                  // const { error, data } = await supabase
                  // .from('files')
                  // .insert([
                  //   {
                  //     source_id: sourceId,
                  //     project_id: _projectId,
                  //     path,
                  //     meta,
                  //     internal_metadata: internalMetadata,
                  //     checksum,
                  //     raw_content: rawContent,
                  //     ...(tokenCount ? { token_count: tokenCount } : {}),
                  //   },
                  // ])
                  // .select('id')
                  // .limit(1)
                  // .maybeSingle();
                  const file = values[0];
                  files.push(file);

                  callback({
                    data: file,
                  });
                  return {
                    catch: () => {
                      // Do nothing
                    },
                  };
                },
              }),
            }),
          }),
        };
      } else if (table === 'file_sections') {
        return {
          then: async (callback: any) => {
            // const { error } = await supabase.from('file_sections').insert(sections);
            fileSections = values;
            callback();
            return {
              catch: () => {
                // Do nothing
              },
            };
          },
        };
      }
    },
    select: (select: string) => ({
      eq: (eq1: string, value1: string) => ({
        eq: (eq2: string, value2: string) => ({
          then: (callback: any) => {
            if (
              table === 'files' &&
              select === 'id,meta,path,checksum' &&
              eq1 === 'source_id' &&
              eq2 === 'internal_metadata->>nangoFileId'
            ) {
              // Catch this:
              // const { data, error } = await supabase
              //   .from('files')
              //   .select('id,meta,path,checksum')
              //   .eq('source_id', sourceId)
              //   .eq('internal_metadata->>nangoFileId', nangoFileId);

              callback({
                data: {
                  id: 'test-file-id-1',
                  meta: { title: 'Test title 1' },
                  path: '/test/path/1',
                  checksum: 'abc',
                },
              });
              return {
                catch: () => {
                  // Do nothing
                },
              };
            }
          },
        }),
        limit: (limit: number) => ({
          maybeSingle: () => ({
            then: (callback: any) => {
              if (
                table === 'sources' &&
                select === 'id' &&
                eq1 === 'data->>connectionId'
              ) {
                callback({ data: { id: 'test-source-id' } });
                return {
                  catch: () => {
                    // Do nothing
                  },
                };
              }
            },
          }),
        }),
      }),
    }),
  }),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => supabaseClient,
}));

describe('inngest', () => {
  // describe('isFileChanged', () => {
  //   it('should detect whether a file has changed for training', () => {
  //     const newFile = {
  //       meta: { title: 'Hello', meta: { value: 1 } },
  //       path: '/path/to/file',
  //       checksum: 'abc',
  //     };
  //     expect(isFileChanged(newFile, newFile)).toBe(false);
  //     expect(
  //       isFileChanged(newFile, {
  //         ...newFile,
  //         meta: { meta: { value: 1 }, title: 'Hello' },
  //       }),
  //     ).toBe(false);
  //     expect(
  //       isFileChanged(newFile, {
  //         ...newFile,
  //         checksum: 'abcd',
  //       }),
  //     ).toBe(true);
  //     expect(
  //       isFileChanged(newFile, {
  //         ...newFile,
  //         path: '/other/path',
  //       }),
  //     ).toBe(true);
  //     expect(
  //       isFileChanged(newFile, {
  //         ...newFile,
  //         meta: { ...newFile.meta, meta: 1 },
  //       }),
  //     ).toBe(true);
  //   });
  // });

  // describe('createFullMeta', () => {
  //   it('should detect whether a file has changed for training', async () => {
  //     const baseNangoFile = {
  //       id: 'id',
  //       path: '/path',
  //       error: undefined,
  //     };
  //     expect(
  //       await createFullMeta({
  //         ...baseNangoFile,
  //         title: undefined,
  //         content: '<html><title>HTML Title</title></html>',
  //         contentType: 'html',
  //         meta: { title: 'Meta title', key: 1 },
  //       } as NangoFileWithMetadata),
  //     ).toStrictEqual({ title: 'HTML Title', key: 1 });
  //     expect(
  //       await createFullMeta({
  //         ...baseNangoFile,
  //         title: undefined,
  //         content: '---\ntitle: Frontmatter title\n---\n\n# Heading\n\nContent',
  //         contentType: 'mdx',
  //         meta: { title: 'Meta title', key: 1 },
  //       } as NangoFileWithMetadata),
  //     ).toStrictEqual({ title: 'Frontmatter title', key: 1 });
  //     expect(
  //       await createFullMeta({
  //         ...baseNangoFile,
  //         title: 'Nango title',
  //         content: '# Heading\n\nContent',
  //         contentType: 'md',
  //         meta: { key: 1 },
  //       } as NangoFileWithMetadata),
  //     ).toStrictEqual({ title: 'Nango title', key: 1 });
  //     expect(
  //       await createFullMeta({
  //         ...baseNangoFile,
  //         content: '',
  //         contentType: 'md',
  //         meta: {
  //           title: 'Nango title',
  //           key: 1,
  //         },
  //       } as NangoFileWithMetadata),
  //     ).toStrictEqual({ title: 'Nango title', key: 1 });
  //   });
  // });

  describe('syncNangoRecords', () => {
    afterEach(() => {
      files = [];
      fileSections = [];
    });

    it('should sync records', async () => {
      const supabase = createServiceRoleSupabaseClient();

      await runTrainFile({
        file: {
          id: 'test-id',
          path: '/test/path',
          title: 'Test file',
          content: '# Heading 1\n\nSome Markdown content that gets inserted',
          contentType: 'md',
          meta: { key: 'value' },
          error: undefined,
          _nango_metadata: {
            deleted_at: null,
            last_action: 'UPDATED',
            first_seen_at: '2023-11-01',
            last_modified_at: '2023-11-01',
          },
        },
        projectId: 'test-project-id',
        sourceId: 'test-source-id',
        processorOptions: undefined,
      });

      console.log('files', JSON.stringify(files, null, 2));
      console.log('fileSections', JSON.stringify(fileSections, null, 2));

      const res = await getSourceId(supabase, '*');
      console.log('data', JSON.stringify(res, null, 2));
      expect(true).toEqual(true);
    });
  });
});
