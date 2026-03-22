// Handles metadata reading and writing for color_palettes.jsonl
// When S3 is enabled (same bucket as images): writes go to S3 first, then local mirror; reads prefer S3.

const fs = require('fs').promises;
const path = require('path');
const s3Storage = require('./s3-storage');

const NEWLINE = '\n';
const metadataFile = path.join(__dirname, 'color_palettes.jsonl');

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

/** When S3 is on: PutObject full JSONL first, then write local (mirror). S3 errors are logged; local still updated. */
async function persistMetadataToS3ThenLocal(dataToWrite, targetFile) {
    try {
        await s3Storage.writePalettesJsonl(dataToWrite);
    } catch (e) {
        console.error('[Metadata] Failed to write palettes JSONL to S3 (will still write local file):', e.message || e);
    }
    await fs.writeFile(targetFile, dataToWrite, 'utf8');
}

// --- Metadata Reading ---
async function readMetadata(overridePath) {
    const targetFile = overridePath ?? metadataFile;
    const useS3 = !overridePath && (await s3Storage.isS3Enabled());

    console.log('[Metadata] Reading metadata...');

    if (useS3) {
        const s3Text = await s3Storage.readPalettesJsonl();
        if (s3Text !== null) {
            try {
                const metadataArray = parseMetadataContent(s3Text);
                console.log(`[Metadata] Read ${metadataArray.length} records from S3.`);
                return metadataArray;
            } catch (e) {
                console.error('[Metadata] Invalid JSONL from S3, falling back to local:', e.message);
            }
        }
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
            console.log('[Metadata] Appended record successfully (S3 + local).');
            return;
        }

        const jsonLine = JSON.stringify(metadataObject) + NEWLINE;
        await fs.appendFile(targetFile, jsonLine, 'utf8');
        console.log('[Metadata] Appended record successfully.');
    } catch (error) {
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
        } else {
            await fs.writeFile(targetFile, dataToWrite, 'utf8');
        }
        console.log('[Metadata] Rewrote file successfully.');
    } catch (error) {
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
