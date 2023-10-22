/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from 'vitest';

import { arrayEquals, removeSchema, safeParseInt } from './utils.nodeps';

const customComparison = (obj1: any, obj2: any): boolean => {
  return obj1.id === obj2.id;
};

describe('utils.nodeps', () => {
  describe('arrayEquals', () => {
    it('should return true for equal arrays with default comparison', () => {
      const arr1 = [1, 2, 3];
      const arr2 = [1, 2, 3];
      const result = arrayEquals(arr1, arr2);
      expect(result).toBe(true);
    });
    it('should return false for arrays with different lengths', () => {
      const arr1 = [1, 2, 3];
      const arr2 = [1, 2];
      const result = arrayEquals(arr1, arr2);
      expect(result).toBe(false);
    });
    it('should return true for equal arrays with custom comparison', () => {
      const arr1 = [{ id: 1 }, { id: 2 }];
      const arr2 = [{ id: 2 }, { id: 1 }];
      const result = arrayEquals(arr1, arr2, customComparison);
      expect(result).toBe(true);
    });
    it('should return false for arrays with different elements', () => {
      const arr1 = [{ id: 1 }, { id: 2 }];
      const arr2 = [{ id: 2 }, { id: 3 }];
      const result = arrayEquals(arr1, arr2, customComparison);
      expect(result).toBe(false);
    });
  });

  describe('safeParseInt', () => {
    it('should parse a string into an int', () => {
      expect(safeParseInt('123', 0)).toBe(123);
      expect(safeParseInt('0123', 0)).toBe(123);
      expect(safeParseInt('2.3', 0)).toBe(2);
    });
    it('should fallback to default value when it is not a string', () => {
      expect(safeParseInt(undefined, 345)).toBe(345);
      expect(safeParseInt(null, 345)).toBe(345);
    });
    it('should callback to default value', () => {
      expect(safeParseInt('abc', 234)).toBe(234);
    });
  });
  describe('removeSchema', () => {
    it('should remove schema', () => {
      expect(removeSchema('https://markprompt.com')).toBe('markprompt.com');
      expect(removeSchema('ftp://example.com')).toBe('example.com');
      expect(removeSchema('http://acme.com')).toBe('acme.com');
      expect(removeSchema('globex.com')).toBe('globex.com');
    });
  });
});
