const path = require('path');
const fs = require('fs');
const fsp = require('fs').promises;

/** Returns true if filename is safe (no path traversal or path separators). */
function validateFilename(filename) {
    return typeof filename === 'string' && filename.length > 0
        && !filename.includes('..') && !filename.includes('/') && !filename.includes('\\');
}

/**
 * Ensures a palette image exists in local cache, hydrating from S3 on cache miss.
 * Returns true when local file is available after hydration attempt.
 */
async function ensureImageCachedLocally(filename, uploadsDir, s3Storage) {
    if (!validateFilename(filename)) return false;
    const imagePath = path.join(uploadsDir, filename);
    try {
        await fsp.access(imagePath, fs.constants.F_OK);
        return true;
    } catch {
        const s3Key = s3Storage.objectKeyForFilename(filename);
        const s3Obj = await s3Storage.getObjectBufferByKey(s3Key);
        if (!s3Obj?.buffer?.length) return false;
        await fsp.writeFile(imagePath, s3Obj.buffer);
        return true;
    }
}

module.exports = {
    validateFilename,
    ensureImageCachedLocally,
};
