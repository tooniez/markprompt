/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from 'vitest';

import { NangoFileWithMetadata } from '@/types/types';

import { createFullMeta, isFileChanged } from './inngest';

describe('inngest', () => {
  describe('isFileChanged', () => {
    it('should detect whether a file has changed for training', () => {
      const newFile = {
        meta: { title: 'Hello', meta: { value: 1 } },
        path: '/path/to/file',
        checksum: 'abc',
      };
      expect(isFileChanged(newFile, newFile)).toBe(false);
      expect(
        isFileChanged(newFile, {
          ...newFile,
          meta: { meta: { value: 1 }, title: 'Hello' },
        }),
      ).toBe(false);
      expect(
        isFileChanged(newFile, {
          ...newFile,
          checksum: 'abcd',
        }),
      ).toBe(true);
      expect(
        isFileChanged(newFile, {
          ...newFile,
          path: '/other/path',
        }),
      ).toBe(true);
      expect(
        isFileChanged(newFile, {
          ...newFile,
          meta: { ...newFile.meta, meta: 1 },
        }),
      ).toBe(true);
    });
  });

  describe('createFullMeta', () => {
    it('should detect whether a file has changed for training', async () => {
      const baseNangoFile = {
        id: 'id',
        path: '/path',
        error: undefined,
      };
      expect(
        await createFullMeta({
          ...baseNangoFile,
          title: undefined,
          content: '<html><title>HTML Title</title></html>',
          contentType: 'html',
          meta: { title: 'Meta title', key: 1 },
        } as NangoFileWithMetadata),
      ).toStrictEqual({ title: 'HTML Title', key: 1 });
      expect(
        await createFullMeta({
          ...baseNangoFile,
          title: undefined,
          content: '---\ntitle: Frontmatter title\n---\n\n# Heading\n\nContent',
          contentType: 'mdx',
          meta: { title: 'Meta title', key: 1 },
        } as NangoFileWithMetadata),
      ).toStrictEqual({ title: 'Frontmatter title', key: 1 });
      expect(
        await createFullMeta({
          ...baseNangoFile,
          title: 'Nango title',
          content: '# Heading\n\nContent',
          contentType: 'md',
          meta: { key: 1 },
        } as NangoFileWithMetadata),
      ).toStrictEqual({ title: 'Nango title', key: 1 });
      expect(
        await createFullMeta({
          ...baseNangoFile,
          content: '',
          contentType: 'md',
          meta: {
            title: 'Nango title',
            key: 1,
          },
        } as NangoFileWithMetadata),
      ).toStrictEqual({ title: 'Nango title', key: 1 });
    });
  });
});
