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
 *   AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY — optional; omit to use ~/.aws/credentials
 */

const { S3Client, PutObjectCommand, DeleteObjectCommand, CopyObjectCommand } = require('@aws-sdk/client-s3');
const { loadConfig } = require('@smithy/node-config-provider');
const { NODE_REGION_CONFIG_OPTIONS, NODE_REGION_CONFIG_FILE_OPTIONS } = require('@smithy/config-resolver');

/** Same resolution order as the AWS SDK: env, then shared config files (profile from AWS_PROFILE or "default"). */
const loadRegionFromAwsFiles = loadConfig(
    { ...NODE_REGION_CONFIG_OPTIONS, default: undefined },
    NODE_REGION_CONFIG_FILE_OPTIONS
);

function getBucket() {
    return process.env.S3_IMAGES_BUCKET || process.env.AWS_S3_BUCKET || '';
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

module.exports = {
    getRegion,
    isS3Enabled,
    objectKeyForFilename,
    publicUrlForKey,
    putImageFromBuffer,
    deleteObjectByKey,
    copyObjectToNewFilename,
};
