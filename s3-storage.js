/**
 * Optional S3 storage for palette source images.
 * Enable with S3_IMAGES_BUCKET (required). Region and credentials use the same rules as the AWS CLI:
 *
 * - Region: AWS_REGION env, else `region` on the active profile in ~/.aws/config (default profile unless AWS_PROFILE is set).
 * - Credentials: env vars, else default credential chain (~/.aws/credentials [default], IAM role, etc.).
 *
 * Env:
 *   S3_IMAGES_BUCKET   — bucket name (required to enable S3)
 *   AWS_REGION         — optional if set in ~/.aws/config for your profile
 *   S3_IMAGES_PREFIX   — object key prefix, default "images" (no leading slash)
 *   S3_PUBLIC_URL_BASE — optional; e.g. https://d111111abcdef8.cloudfront.net (no trailing slash)
 *                        If unset, uses virtual-hosted–style https://{bucket}.s3.{region}.amazonaws.com/{key}
 *   S3_PALETTES_JSONL_KEY — optional; object key for color_palettes.jsonl (default metadata/color_palettes.jsonl).
 *                           Same bucket as images; use bucket policy public GetObject on this key (like images/*) for consumer read-only access.
 *   AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY — optional; omit to use ~/.aws/credentials
 */

const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, CopyObjectCommand } = require('@aws-sdk/client-s3');
const { loadConfig } = require('@smithy/node-config-provider');
const { NODE_REGION_CONFIG_OPTIONS, NODE_REGION_CONFIG_FILE_OPTIONS } = require('@smithy/config-resolver');

/** Same resolution order as the AWS SDK: env, then shared config files (profile from AWS_PROFILE or "default"). */
const loadRegionFromAwsFiles = loadConfig(
    { ...NODE_REGION_CONFIG_OPTIONS, default: undefined },
    NODE_REGION_CONFIG_FILE_OPTIONS
);

function getBucket() {
    return process.env.S3_IMAGES_BUCKET || '';
}

let regionCachePromise = null;

/**
 * Resolved region for S3 and public URLs: AWS_REGION, else ~/.aws/config profile `region`.
 * @returns {Promise<string|undefined>}
 */
async function getRegion() {
    const fromEnv = process.env.AWS_REGION?.trim();
    if (fromEnv) return fromEnv;
    if (!regionCachePromise) {
        regionCachePromise = (async () => {
            try {
                const r = await loadRegionFromAwsFiles();
                return typeof r === 'string' && r.trim() ? r.trim() : undefined;
            } catch {
                return undefined;
            }
        })();
    }
    return regionCachePromise;
}

/**
 * @returns {Promise<boolean>}
 */
async function isS3Enabled() {
    const bucket = getBucket();
    if (!bucket) return false;
    const region = await getRegion();
    return Boolean(region);
}

function objectKeyForFilename(filename) {
    const prefix = (process.env.S3_IMAGES_PREFIX || 'images').replace(/^\/+|\/+$/g, '');
    return prefix ? `${prefix}/${filename}` : filename;
}

/** Object key for palette metadata JSONL (same bucket as images; keep private — no anon GetObject). */
function palettesJsonlObjectKey() {
    const k = (process.env.S3_PALETTES_JSONL_KEY || 'metadata/color_palettes.jsonl').replace(/^\/+/, '');
    return k;
}

function isNoSuchKeyError(err) {
    return err?.name === 'NoSuchKey' || err?.$metadata?.httpStatusCode === 404;
}

/**
 * Read color_palettes.jsonl body from S3.
 * @returns {Promise<string|null>} File UTF-8 contents, or null if object missing / S3 error (caller may fall back to local).
 */
async function readPalettesJsonl() {
    if (!(await isS3Enabled())) return null;
    try {
        const client = await getClient();
        if (!client) return null;
        const key = palettesJsonlObjectKey();
        const response = await client.send(
            new GetObjectCommand({
                Bucket: getBucket(),
                Key: key,
            })
        );
        const body = await response.Body.transformToString();
        return typeof body === 'string' ? body : '';
    } catch (err) {
        if (isNoSuchKeyError(err)) {
            console.log(`[S3] Palettes JSONL not found at ${palettesJsonlObjectKey()}, treating as empty catalog.`);
            return '';
        }
        console.error('[S3] GetObject palettes jsonl failed:', err.message || err);
        throw err;
    }
}

/**
 * Write full JSONL file to S3 (after local write). Empty string is allowed.
 */
async function writePalettesJsonl(utf8Content) {
    if (!(await isS3Enabled())) return;
    const key = palettesJsonlObjectKey();
    try {
        const client = await getClient();
        if (!client) return;
        await client.send(
            new PutObjectCommand({
                Bucket: getBucket(),
                Key: key,
                Body: utf8Content ?? '',
                ContentType: 'application/x-ndjson; charset=utf-8',
            })
        );
        console.log(`[S3] PutObject OK (palettes): s3://${getBucket()}/${key}`);
    } catch (err) {
        console.error('[S3] PutObject palettes jsonl failed:', err.message || err);
        throw err;
    }
}

/** HTTPS URL consumers can GET (anonymous read) when bucket policy allows GetObject on this key. */
async function publicUrlForPalettesJsonl() {
    if (!(await isS3Enabled())) return null;
    return publicUrlForKey(palettesJsonlObjectKey());
}

/**
 * Public HTTPS URL for an object key (for browser <img> and exports).
 * @returns {Promise<string>}
 */
async function publicUrlForKey(key) {
    const base = (process.env.S3_PUBLIC_URL_BASE || '').replace(/\/+$/, '');
    if (base) {
        return `${base}/${key}`;
    }
    const bucket = getBucket();
    const region = (await getRegion()) || 'us-east-1';
    const encodedKey = key.split('/').map(encodeURIComponent).join('/');
    return `https://${bucket}.s3.${region}.amazonaws.com/${encodedKey}`;
}

let clientSingleton = null;

async function getClient() {
    if (!clientSingleton) {
        const bucket = getBucket();
        const region = await getRegion();
        if (!bucket || !region) return null;
        clientSingleton = new S3Client({ region });
    }
    return clientSingleton;
}

const CONTENT_TYPE_BY_FORMAT = {
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    tiff: 'image/tiff',
    avif: 'image/avif',
};

/**
 * Upload image bytes to S3. Returns { s3Key, imagePublicUrl } or null if S3 disabled or upload fails.
 */
async function putImageFromBuffer(filename, buffer, format) {
    if (!(await isS3Enabled()) || !buffer?.length) return null;
    const key = objectKeyForFilename(filename);
    const contentType = CONTENT_TYPE_BY_FORMAT[String(format).toLowerCase()] || 'application/octet-stream';
    try {
        const client = await getClient();
        if (!client) return null;
        await client.send(
            new PutObjectCommand({
                Bucket: getBucket(),
                Key: key,
                Body: buffer,
                ContentType: contentType,
            })
        );
        console.log(`[S3] PutObject OK: s3://${getBucket()}/${key}`);
        return { s3Key: key, imagePublicUrl: await publicUrlForKey(key) };
    } catch (err) {
        console.error('[S3] PutObject failed:', err.message || err);
        return null;
    }
}

/**
 * Delete object if metadata has s3Key.
 */
async function deleteObjectByKey(s3Key) {
    if (!(await isS3Enabled()) || !s3Key || typeof s3Key !== 'string') return;
    try {
        const client = await getClient();
        if (!client) return;
        await client.send(
            new DeleteObjectCommand({
                Bucket: getBucket(),
                Key: s3Key,
            })
        );
        console.log(`[S3] DeleteObject OK: ${s3Key}`);
    } catch (err) {
        console.warn('[S3] DeleteObject failed:', err.message || err);
    }
}

/**
 * Copy object for duplicate flow. Returns { s3Key, imagePublicUrl } or null.
 */
async function copyObjectToNewFilename(sourceS3Key, newFilename) {
    if (!(await isS3Enabled()) || !sourceS3Key) return null;
    const destKey = objectKeyForFilename(newFilename);
    const bucket = getBucket();
    try {
        const client = await getClient();
        if (!client) return null;
        const copySource = `${bucket}/${encodeURIComponent(sourceS3Key).replace(/%2F/g, '/')}`;
        await client.send(
            new CopyObjectCommand({
                Bucket: bucket,
                Key: destKey,
                CopySource: copySource,
            })
        );
        console.log(`[S3] CopyObject OK: ${sourceS3Key} -> ${destKey}`);
        return { s3Key: destKey, imagePublicUrl: await publicUrlForKey(destKey) };
    } catch (err) {
        console.error('[S3] CopyObject failed:', err.message || err);
        return null;
    }
}

/**
 * Read image bytes from S3 by key.
 * @returns {Promise<{ buffer: Buffer, contentType: string } | null>}
 */
async function getObjectBufferByKey(s3Key) {
    if (!(await isS3Enabled()) || !s3Key || typeof s3Key !== 'string') return null;
    try {
        const client = await getClient();
        if (!client) return null;
        const response = await client.send(
            new GetObjectCommand({
                Bucket: getBucket(),
                Key: s3Key,
            })
        );
        const bytes = await response.Body.transformToByteArray();
        return {
            buffer: Buffer.from(bytes),
            contentType: response.ContentType || 'application/octet-stream',
        };
    } catch (err) {
        if (isNoSuchKeyError(err)) return null;
        console.error('[S3] GetObject image failed:', err.message || err);
        return null;
    }
}

/**
 * Verify IAM credentials can PutObject, GetObject, and DeleteObject (probe under metadata/).
 * @returns {Promise<{ ok: true, probeKey: string } | { ok: false, error: string }>}
 */
async function verifyIamAccess() {
    if (!(await isS3Enabled())) {
        return {
            ok: false,
            error:
                'S3 not enabled: set S3_IMAGES_BUCKET and AWS_REGION (or region in ~/.aws/config for your profile).',
        };
    }
    const client = await getClient();
    if (!client) {
        return { ok: false, error: 'Could not create S3 client (missing bucket or region).' };
    }
    const bucket = getBucket();
    const probeKey = `metadata/.s3-access-verify-${Date.now()}.txt`;
    const body = `color-palette-maker s3 verify ${new Date().toISOString()}`;
    try {
        await client.send(
            new PutObjectCommand({
                Bucket: bucket,
                Key: probeKey,
                Body: body,
                ContentType: 'text/plain; charset=utf-8',
            })
        );
        const getRes = await client.send(
            new GetObjectCommand({
                Bucket: bucket,
                Key: probeKey,
            })
        );
        const text = await getRes.Body.transformToString();
        if (text !== body) {
            await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: probeKey })).catch(() => {});
            return { ok: false, error: 'GetObject body did not match PutObject payload.' };
        }
        await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: probeKey }));
        return { ok: true, probeKey };
    } catch (err) {
        const msg = err?.message || String(err);
        try {
            await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: probeKey })).catch(() => {});
        } catch {
            /* ignore */
        }
        return { ok: false, error: msg };
    }
}

/**
 * Verify anonymous read of the public palette catalog URL (bucket policy).
 * @returns {Promise<{ ok: true, url: string } | { ok: false, error: string, url?: string }>}
 */
async function verifyPublicPalettesCatalogUrl() {
    if (!(await isS3Enabled())) {
        return { ok: false, error: 'S3 not enabled; cannot resolve catalog URL.' };
    }
    const url = await publicUrlForPalettesJsonl();
    if (!url) {
        return { ok: false, error: 'Could not build public URL for palettes JSONL.' };
    }
    try {
        const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
        if (!res.ok) {
            return {
                ok: false,
                error: `HTTP ${res.status} ${res.statusText} (anonymous read may be blocked by bucket policy)`,
                url,
            };
        }
        return { ok: true, url };
    } catch (err) {
        return { ok: false, error: err?.message || String(err), url };
    }
}

module.exports = {
    getRegion,
    isS3Enabled,
    objectKeyForFilename,
    palettesJsonlObjectKey,
    publicUrlForKey,
    putImageFromBuffer,
    readPalettesJsonl,
    writePalettesJsonl,
    publicUrlForPalettesJsonl,
    deleteObjectByKey,
    copyObjectToNewFilename,
    getObjectBufferByKey,
    verifyIamAccess,
    verifyPublicPalettesCatalogUrl,
};
