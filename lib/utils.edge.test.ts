/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from 'vitest';

import {
  deepMerge,
  getApiUrl,
  getAppHost,
  getAppOrigin,
  getDomain,
  isAppHost,
  isRequestFromMarkprompt,
  removeSchema,
  safeParseInt,
  safeParseIntOrUndefined,
  safeParseJSON,
} from './utils.edge';

describe('utils.edge', () => {
  describe('getAppHost', () => {
    it('should return localhost in dev environment', () => {
      expect(getAppHost()).toBe('localhost:3000');
      expect(getAppHost('api')).toBe('api.localhost:3000');
      expect(getAppHost('api', true)).toBe('api.markprompt.com');
    });
  });

  describe('getAppOrigin', () => {
    it('should return localhost in dev environment', () => {
      expect(getAppOrigin()).toBe('http://localhost:3000');
      expect(getAppOrigin('api')).toBe('http://api.localhost:3000');
      expect(getAppOrigin('api', true)).toBe('https://api.markprompt.com');
    });
  });

  describe('getApiUrl', () => {
    it('should return correct API urls', () => {
      const apis = [
        'embeddings',
        'completions',
        'chat',
        'sections',
        'search',
        'feedback',
      ] as (
        | 'embeddings'
        | 'completions'
        | 'chat'
        | 'sections'
        | 'search'
        | 'feedback'
      )[];
      for (const api of apis) {
        expect(getApiUrl(api)).toBe(`http://api.localhost:3000/v1/${api}`);
      }
    });
  });

  describe('isAppHost', () => {
    it('should detect app host', () => {
      expect(isAppHost('localhost:3000')).toBe(true);
    });
  });

  describe('removeSchema', () => {
    it('should remove schema', () => {
      expect(removeSchema('http://localhost:3000')).toBe('localhost:3000');
      expect(removeSchema('https://markprompt.com')).toBe('markprompt.com');
    });
  });

  describe('getDomain', () => {
    it('should get the domain', () => {
      expect(getDomain('http://localhost:3000')).toBe('localhost');
      expect(getDomain('https://markprompt.com')).toBe('markprompt.com');
      expect(getDomain('https://www.example.com')).toBe('example.com');
      expect(getDomain('localhost:3000')).toBe('localhost');
      expect(getDomain('www.example.com')).toBe('example.com');
    });
  });

  describe('safeParseInt', () => {
    it('should parse a string into an int', () => {
      expect(safeParseInt('123', 234)).toBe(123);
      expect(safeParseInt('blabla', 234)).toBe(234);
      expect(safeParseInt(1 as any, 234)).toBe(234);
    });
  });

  describe('safeParseIntOrUndefined', () => {
    it('should parse a string into an int', () => {
      expect(safeParseIntOrUndefined('123')).toBe(123);
    });
    it('should return undefined on non-string input', () => {
      expect(safeParseIntOrUndefined(undefined)).toBe(undefined);
      expect(safeParseIntOrUndefined('blabla')).toBe(undefined);
      expect(safeParseIntOrUndefined(123 as any)).toBe(undefined);
    });
  });

  describe('safeParseJSON', () => {
    it('should parse a JSON string', () => {
      expect(safeParseJSON(1 as any, { status: 'error' })).toStrictEqual({
        status: 'error',
      });
      expect(
        safeParseJSON('{ "a": 1, "b" : { "c": "d" } }', {
          status: 'error',
        }),
      ).toStrictEqual({ a: 1, b: { c: 'd' } });
      expect(
        safeParseJSON('non-json', {
          status: 'error',
        }),
      ).toStrictEqual({ status: 'error' });
    });
  });

  describe('isRequestFromMarkprompt', () => {
    it('should check whether request is from Markprompt origin', () => {
      expect(isRequestFromMarkprompt('http://localhost:3000')).toBe(true);
      expect(isRequestFromMarkprompt('http://api.localhost:3000')).toBe(false);
      expect(isRequestFromMarkprompt('https://example.com')).toBe(false);
    });
  });

  describe('deepMerge', () => {
    it('should deep merge two objects', () => {
      const obj1 = {
        a: 1,
        b: {
          c: 'd',
          g: { h: 4 },
        },
      };
      const obj2 = {
        e: 2,
        b: {
          c: 3,
          f: 4,
        },
      };
      expect(deepMerge(obj1, obj2)).toStrictEqual({
        a: 1,
        e: 2,
        b: {
          c: 3,
          f: 4,
          g: { h: 4 },
        },
      });
    });
  });
});
