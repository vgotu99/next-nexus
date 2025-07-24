import type { RevalidateTagsInput } from '@/types/revalidate';
import {
  normalizeRevalidateInput,
  validateRevalidateInput,
  logRevalidation,
  logRevalidationError,
} from '@/utils/revalidateUtils';

jest.mock('@/utils/environmentUtils', () => ({
  isDevelopment: jest.fn(() => true),
}));

describe('revalidateUtils', () => {
  describe('normalizeRevalidateInput', () => {
    it('should normalize array input correctly', () => {
      const input: RevalidateTagsInput = ['PRODUCTS', 'reviews', '  users  '];
      const result = normalizeRevalidateInput(input);

      expect(result).toEqual({
        serverTags: ['products', 'reviews', 'users'],
        clientTags: ['products', 'reviews', 'users'],
      });
    });

    it('should normalize object input correctly', () => {
      const input: RevalidateTagsInput = {
        server: ['SERVER-TAG'],
        client: ['client-tag'],
      };
      const result = normalizeRevalidateInput(input);

      expect(result).toEqual({
        serverTags: ['server-tag'],
        clientTags: ['client-tag'],
      });
    });

    it('should handle empty arrays in object input', () => {
      const input: RevalidateTagsInput = {
        server: [],
        client: ['client-tag'],
      };
      const result = normalizeRevalidateInput(input);

      expect(result).toEqual({
        serverTags: [],
        clientTags: ['client-tag'],
      });
    });

    it('should handle undefined properties in object input', () => {
      const input: RevalidateTagsInput = {
        server: undefined,
        client: ['client-tag'],
      };
      const result = normalizeRevalidateInput(input);

      expect(result).toEqual({
        serverTags: [],
        clientTags: ['client-tag'],
      });
    });
  });

  describe('validateRevalidateInput', () => {
    it('should validate array input with valid tags', () => {
      const input: RevalidateTagsInput = ['tag1', 'tag2'];
      const result = validateRevalidateInput(input);

      expect(result).toBe(true);
    });

    it('should reject empty array input', () => {
      const input: RevalidateTagsInput = [];
      const result = validateRevalidateInput(input);

      expect(result).toBe(false);
    });

    it('should reject array with empty strings', () => {
      const input: RevalidateTagsInput = ['tag1', '', 'tag2'];
      const result = validateRevalidateInput(input);

      expect(result).toBe(true);
    });

    it('should validate object input with server tags', () => {
      const input: RevalidateTagsInput = { server: ['tag1', 'tag2'] };
      const result = validateRevalidateInput(input);

      expect(result).toBe(true);
    });

    it('should validate object input with client tags', () => {
      const input: RevalidateTagsInput = { client: ['tag1', 'tag2'] };
      const result = validateRevalidateInput(input);

      expect(result).toBe(true);
    });

    it('should validate object input with both server and client tags', () => {
      const input: RevalidateTagsInput = {
        server: ['server-tag'],
        client: ['client-tag'],
      };
      const result = validateRevalidateInput(input);

      expect(result).toBe(true);
    });

    it('should reject object input with no tags', () => {
      const input: RevalidateTagsInput = { server: [], client: [] };
      const result = validateRevalidateInput(input);

      expect(result).toBe(false);
    });

    it('should reject object input with undefined tags', () => {
      const input: RevalidateTagsInput = {};
      const result = validateRevalidateInput(input);

      expect(result).toBe(false);
    });
  });

  describe('logRevalidation', () => {
    it('should log server and client tags', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      logRevalidation(['server-tag'], ['client-tag']);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[next-fetch] Revalidating cache - Server: [server-tag], Client: [client-tag]'
      );

      consoleSpy.mockRestore();
    });

    it('should log "none" for empty tags', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      logRevalidation([], []);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[next-fetch] Revalidating cache - Server: [none], Client: [none]'
      );

      consoleSpy.mockRestore();
    });

    it('should log multiple tags correctly', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      logRevalidation(['tag1', 'tag2'], ['tag3']);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[next-fetch] Revalidating cache - Server: [tag1, tag2], Client: [tag3]'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('logRevalidationError', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should log error with tags', () => {
      const error = new Error('Test error');
      logRevalidationError(error, ['tag1', 'tag2'], 'server');

      expect(consoleSpy).toHaveBeenCalledWith(
        '[next-fetch] Revalidation failed (server tags: tag1, tag2):',
        error
      );
    });

    it('should log error without tags', () => {
      const error = new Error('Test error');
      logRevalidationError(error);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[next-fetch] Revalidation failed:',
        error
      );
    });
  });
});
