import { describe, it, expect } from 'vitest';
import {
  getFilenameFromMeta,
  getFilenameWithoutExt,
  getImageUrlForMeta,
  formatFileSize,
} from './utils';

describe('utils', () => {
  describe('getFilenameFromMeta', () => {
    it('extracts filename from cachedFilePath', () => {
      expect(
        getFilenameFromMeta({ cachedFilePath: '/path/to/img-123.jpeg' })
      ).toBe('img-123.jpeg');
    });

    it('returns null when meta is null', () => {
      expect(getFilenameFromMeta(null)).toBe(null);
    });

    it('returns null when cachedFilePath is missing', () => {
      expect(getFilenameFromMeta({})).toBe(null);
    });

    it('handles Windows-style path with backslash', () => {
      expect(getFilenameFromMeta({ cachedFilePath: 'C:\\uploads\\img-123.jpeg' })).toBe('img-123.jpeg');
    });
  });

  describe('getImageUrlForMeta', () => {
    it('returns proxied URL when imagePublicUrl is set (avoids CORS)', () => {
      const url = 'https://cdn.example.com/images/x.jpeg';
      expect(
        getImageUrlForMeta({
          cachedFilePath: '/palette-images/x.jpeg',
          imagePublicUrl: url,
        })
      ).toBe(`/api/image-proxy?url=${encodeURIComponent(url)}`);
    });
    it('returns /palette-images/ URL when no imagePublicUrl', () => {
      expect(getImageUrlForMeta({ cachedFilePath: '/palette-images/img-1.jpeg' })).toBe('/palette-images/img-1.jpeg');
    });
    it('uses unknown filename when cachedFilePath missing (library edge case)', () => {
      expect(getImageUrlForMeta({ paletteName: 'x' })).toBe('/palette-images/unknown');
    });
  });

  describe('getFilenameWithoutExt', () => {
    it('removes extension from filename', () => {
      expect(getFilenameWithoutExt('img-123.jpeg')).toBe('img-123');
    });

    it('returns empty string for empty input', () => {
      expect(getFilenameWithoutExt('')).toBe('');
    });

    it('returns filename as-is when no extension', () => {
      expect(getFilenameWithoutExt('noext')).toBe('noext');
    });

    it('returns empty string for null or non-string', () => {
      expect(getFilenameWithoutExt(null)).toBe('');
      expect(getFilenameWithoutExt(123)).toBe('');
    });
  });

  describe('formatFileSize', () => {
    it('formats bytes', () => {
      expect(formatFileSize(500)).toBe('500 Bytes');
    });

    it('formats kilobytes', () => {
      expect(formatFileSize(2048)).toBe('2.0 KB');
    });

    it('formats megabytes', () => {
      expect(formatFileSize(2 * 1024 * 1024)).toBe('2.00 MB');
    });

    it('returns N/A for non-number', () => {
      expect(formatFileSize('invalid')).toBe('N/A');
    });

    it('formats 1025 bytes as KB', () => {
      expect(formatFileSize(1025)).toBe('1.0 KB');
    });

    it('formats 1048577 bytes as MB', () => {
      expect(formatFileSize(1024 * 1024 + 1)).toBe('1.00 MB');
    });
  });

});
