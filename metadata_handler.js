// Handles metadata reading and writing for color_palettes.jsonl
// When S3 is enabled (same bucket as images): writes go to S3 first, then local mirror; reads prefer S3.

const fs = require('fs').promises;
const path = require('path');
const s3Storage = require('./s3-storage');

const NEWLINE = '\n';
const metadataFile = path.join(__dirname, 'local-data-cache', 'color_palettes.jsonl');
const METADATA_CACHE_TTL_MS = Math.max(0, Number(process.env.METADATA_CACHE_TTL_MS) || 5000);
let metadataCache = {
    expiresAt: 0,
    value: null,
};

function parseMetadataContent(data) {
    const s = typeof data === 'string' ? data : '';
    if (!s.trim()) return [];
    return s
        .trim()
        .split(NEWLINE)
        .filter((line) => line.length > 0)
        .map((line) => JSON.parse(line));
}

function serializeMetadataArray(metadataArray) {
    return (
        metadataArray.map((obj) => JSON.stringify(obj)).join(NEWLINE) + (metadataArray.length > 0 ? NEWLINE : '')
    );
}

async function readFromLocal(targetFile) {
    const data = await fs.readFile(targetFile, 'utf8');
    const metadataArray = parseMetadataContent(data);
    console.log(`[Metadata] Read ${metadataArray.length} records from local file.`);
    return metadataArray;
}

/** When S3 is on: PutObject full JSONL first, then write local mirror. S3 failures propagate to the caller. */
async function persistMetadataToS3ThenLocal(dataToWrite, targetFile) {
    await s3Storage.writePalettesJsonl(dataToWrite);
    await fs.writeFile(targetFile, dataToWrite, 'utf8');
}

function setMetadataCache(value) {
    metadataCache = {
        expiresAt: Date.now() + METADATA_CACHE_TTL_MS,
        value,
    };
}

function invalidateMetadataCache() {
    metadataCache = {
        expiresAt: 0,
        value: null,
    };
}

// --- Metadata Reading ---
async function readMetadata(overridePath) {
    const targetFile = overridePath ?? metadataFile;
    const useS3 = !overridePath && (await s3Storage.isS3Enabled());

    console.log('[Metadata] Reading metadata...');

    if (useS3) {
        if (metadataCache.value && metadataCache.expiresAt > Date.now()) {
            return metadataCache.value;
        }
        const s3Text = await s3Storage.readPalettesJsonl();
        const metadataArray = parseMetadataContent(s3Text || '');
        setMetadataCache(metadataArray);
        console.log(`[Metadata] Read ${metadataArray.length} records from S3.`);
        return metadataArray;
    }

    try {
        return await readFromLocal(targetFile);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('[Metadata] Metadata file not found, returning empty array.');
            return [];
        }
        console.error('[Metadata] Error reading metadata file:', error);
        throw error;
    }
}

// --- Metadata Appending ---
async function appendMetadata(metadataObject, overridePath) {
    const targetFile = overridePath ?? metadataFile;
    console.log('[Metadata] Appending metadata record...', metadataObject);
    try {
        if (overridePath) {
            const jsonLine = JSON.stringify(metadataObject) + NEWLINE;
            await fs.appendFile(targetFile, jsonLine, 'utf8');
            console.log('[Metadata] Appended record successfully.');
            return;
        }

        if (await s3Storage.isS3Enabled()) {
            const all = await readMetadata();
            all.push(metadataObject);
            const dataToWrite = serializeMetadataArray(all);
            await persistMetadataToS3ThenLocal(dataToWrite, targetFile);
            setMetadataCache(all);
            console.log('[Metadata] Appended record successfully (S3 + local).');
            return;
        }

        const jsonLine = JSON.stringify(metadataObject) + NEWLINE;
        await fs.appendFile(targetFile, jsonLine, 'utf8');
        console.log('[Metadata] Appended record successfully.');
    } catch (error) {
        invalidateMetadataCache();
        console.error('[Metadata] Error appending to metadata file:', error);
        throw error;
    }
}

// --- Metadata Rewriting ---
async function rewriteMetadata(metadataArray, overridePath) {
    const targetFile = overridePath ?? metadataFile;
    console.log(`[Metadata] Rewriting metadata file with ${metadataArray.length} records...`);
    try {
        const dataToWrite = serializeMetadataArray(metadataArray);
        if (overridePath) {
            await fs.writeFile(targetFile, dataToWrite, 'utf8');
        } else if (await s3Storage.isS3Enabled()) {
            await persistMetadataToS3ThenLocal(dataToWrite, targetFile);
            setMetadataCache(metadataArray);
        } else {
            await fs.writeFile(targetFile, dataToWrite, 'utf8');
        }
        console.log('[Metadata] Rewrote file successfully.');
    } catch (error) {
        invalidateMetadataCache();
        console.error('[Metadata] Error rewriting metadata file:', error);
        throw error;
    }
}

module.exports = {
    readMetadata,
    appendMetadata,
    rewriteMetadata,
    metadataFile, // Export file path if needed elsewhere
};
