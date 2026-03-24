/**
 * Integration tests for image_cache.js using real filesystem I/O.
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { Buffer } from 'buffer';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { ensureImageCachedLocally, validateFilename } = require('../../image_cache.js');

describe('image_cache integration', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'image-cache-test-'));
  });

  afterEach(async () => {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  });

  it('returns true on local cache hit and does not call S3', async () => {
    const filename = 'img-hit.jpeg';
    const filePath = path.join(tempDir, filename);
    await fs.promises.writeFile(filePath, Buffer.from([10, 20, 30]));

    const s3Storage = {
      objectKeyForFilename: vi.fn((fn) => `images/${fn}`),
      getObjectBufferByKey: vi.fn(),
    };

    const ok = await ensureImageCachedLocally(filename, tempDir, s3Storage);
    expect(ok).toBe(true);
    expect(s3Storage.objectKeyForFilename).not.toHaveBeenCalled();
    expect(s3Storage.getObjectBufferByKey).not.toHaveBeenCalled();
  });

  it('hydrates local cache from S3 on miss', async () => {
    const filename = 'img-miss.jpeg';
    const s3Bytes = Buffer.from([1, 2, 3, 4]);
    const s3Storage = {
      objectKeyForFilename: vi.fn((fn) => `images/${fn}`),
      getObjectBufferByKey: vi.fn(async () => ({ buffer: s3Bytes, contentType: 'image/jpeg' })),
    };

    const ok = await ensureImageCachedLocally(filename, tempDir, s3Storage);
    expect(ok).toBe(true);
    expect(s3Storage.objectKeyForFilename).toHaveBeenCalledWith(filename);
    expect(s3Storage.getObjectBufferByKey).toHaveBeenCalledWith(`images/${filename}`);

    const written = await fs.promises.readFile(path.join(tempDir, filename));
    expect(Array.from(written)).toEqual(Array.from(s3Bytes));
  });

  it('returns false when S3 misses and local file does not exist', async () => {
    const filename = 'img-not-found.jpeg';
    const s3Storage = {
      objectKeyForFilename: vi.fn((fn) => `images/${fn}`),
      getObjectBufferByKey: vi.fn(async () => null),
    };

    const ok = await ensureImageCachedLocally(filename, tempDir, s3Storage);
    expect(ok).toBe(false);
    await expect(fs.promises.access(path.join(tempDir, filename))).rejects.toBeTruthy();
  });

  it('rejects unsafe filenames', async () => {
    expect(validateFilename('../secret')).toBe(false);
    expect(validateFilename('nested/file.jpeg')).toBe(false);
    expect(validateFilename('safe-file.jpeg')).toBe(true);
  });
});
