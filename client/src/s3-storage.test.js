/**
 * Unit tests for s3-storage.js (root)
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@smithy/node-config-provider', () => ({
    loadConfig: vi.fn(() => () => Promise.resolve('us-east-1')),
}));

vi.mock('@smithy/config-resolver', () => ({
    NODE_REGION_CONFIG_OPTIONS: {},
    NODE_REGION_CONFIG_FILE_OPTIONS: {},
}));

async function loadS3Storage() {
    const mod = await import('@root/s3-storage');
    return mod.default ?? mod;
}

describe('s3-storage', () => {
    let s3Storage;

    beforeEach(async () => {
        vi.resetModules();
        process.env.S3_IMAGES_BUCKET = 'test-bucket';
        process.env.AWS_REGION = 'us-east-1';
        delete process.env.S3_IMAGES_PREFIX;
        delete process.env.S3_PUBLIC_URL_BASE;
        s3Storage = await loadS3Storage();
    });

    afterEach(() => {
        delete process.env.S3_IMAGES_BUCKET;
        delete process.env.AWS_S3_BUCKET;
        delete process.env.AWS_REGION;
        delete process.env.S3_IMAGES_PREFIX;
        delete process.env.S3_PUBLIC_URL_BASE;
    });

    describe('objectKeyForFilename', () => {
        it('returns prefix/filename when prefix is images', () => {
            expect(s3Storage.objectKeyForFilename('img-123.jpeg')).toBe('images/img-123.jpeg');
        });

        it('uses S3_IMAGES_PREFIX when set', async () => {
            process.env.S3_IMAGES_PREFIX = 'my-prefix';
            vi.resetModules();
            const mod = await loadS3Storage();
            expect(mod.objectKeyForFilename('x.jpg')).toBe('my-prefix/x.jpg');
        });

        it('strips leading/trailing slashes from prefix', async () => {
            process.env.S3_IMAGES_PREFIX = '/foo/';
            vi.resetModules();
            const mod = await loadS3Storage();
            expect(mod.objectKeyForFilename('a.png')).toBe('foo/a.png');
        });
    });

    describe('isS3Enabled', () => {
        it('returns true when bucket and region set', async () => {
            expect(await s3Storage.isS3Enabled()).toBe(true);
        });

        it('returns false when bucket not set', async () => {
            delete process.env.S3_IMAGES_BUCKET;
            vi.resetModules();
            const mod = await loadS3Storage();
            expect(await mod.isS3Enabled()).toBe(false);
        });

        it('uses AWS_S3_BUCKET as fallback for bucket', async () => {
            delete process.env.S3_IMAGES_BUCKET;
            process.env.AWS_S3_BUCKET = 'fallback-bucket';
            process.env.AWS_REGION = 'us-west-2';
            vi.resetModules();
            const mod = await loadS3Storage();
            expect(await mod.isS3Enabled()).toBe(true);
        });
    });

    describe('publicUrlForKey', () => {
        it('returns S3 virtual-hosted URL when S3_PUBLIC_URL_BASE not set', async () => {
            const url = await s3Storage.publicUrlForKey('images/img-123.jpeg');
            expect(url).toMatch(/^https:\/\/test-bucket\.s3\.us-east-1\.amazonaws\.com\//);
            expect(url).toContain('images');
            expect(url).toContain('img-123.jpeg');
        });

        it('uses S3_PUBLIC_URL_BASE when set', async () => {
            process.env.S3_PUBLIC_URL_BASE = 'https://cdn.example.com';
            vi.resetModules();
            const mod = await loadS3Storage();
            const url = await mod.publicUrlForKey('images/x.jpg');
            expect(url).toBe('https://cdn.example.com/images/x.jpg');
        });

        it('strips trailing slash from S3_PUBLIC_URL_BASE', async () => {
            process.env.S3_PUBLIC_URL_BASE = 'https://cdn.example.com/';
            vi.resetModules();
            const mod = await loadS3Storage();
            const url = await mod.publicUrlForKey('x');
            expect(url).toBe('https://cdn.example.com/x');
        });
    });

    describe('putImageFromBuffer', () => {
        it('returns null when S3 disabled', async () => {
            delete process.env.S3_IMAGES_BUCKET;
            vi.resetModules();
            const mod = await loadS3Storage();
            const result = await mod.putImageFromBuffer('x.jpg', Buffer.from([1, 2, 3]), 'jpeg');
            expect(result).toBeNull();
        });

        it('returns null when buffer empty', async () => {
            const result = await s3Storage.putImageFromBuffer('x.jpg', Buffer.alloc(0), 'jpeg');
            expect(result).toBeNull();
        });

        // Success path requires mocked S3Client; mock does not apply when loading root CJS via alias
    });

    describe('deleteObjectByKey', () => {
        it('does nothing when S3 disabled', async () => {
            delete process.env.S3_IMAGES_BUCKET;
            vi.resetModules();
            const mod = await loadS3Storage();
            await mod.deleteObjectByKey('images/x.jpg');
        });

        it('does nothing when s3Key empty or invalid', async () => {
            await s3Storage.deleteObjectByKey('');
            await s3Storage.deleteObjectByKey(null);
            await s3Storage.deleteObjectByKey(123);
        });
    });

    describe('copyObjectToNewFilename', () => {
        it('returns null when S3 disabled', async () => {
            delete process.env.S3_IMAGES_BUCKET;
            vi.resetModules();
            const mod = await loadS3Storage();
            const result = await mod.copyObjectToNewFilename('images/a.jpg', 'b.jpg');
            expect(result).toBeNull();
        });

        it('returns null when sourceS3Key empty', async () => {
            const result = await s3Storage.copyObjectToNewFilename('', 'b.jpg');
            expect(result).toBeNull();
        });
    });
});
