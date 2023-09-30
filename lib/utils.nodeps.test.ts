/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from 'vitest';

import { arrayEquals } from './utils.nodeps';

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
});
