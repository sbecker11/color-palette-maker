#!/usr/bin/env node
/**
 * One-time migration: upload local uploads/ files to S3 and set s3Key + imagePublicUrl on each metadata row.
 *
 * Prerequisites:
 *   - .env with S3_IMAGES_BUCKET (+ AWS_REGION or ~/.aws/config region)
 *   - AWS credentials (env or ~/.aws/credentials)
 *   - Bucket policy / public read on prefix already applied (see docs/S3-STORAGE.md)
 *
 * Usage (from repo root):
 *   node scripts/migrate-uploads-to-s3.js              # skip rows that already have s3Key
 *   node scripts/migrate-uploads-to-s3.js --dry-run    # print plan only
 *   node scripts/migrate-uploads-to-s3.js --force      # re-upload and refresh URLs even if s3Key exists
 *
 * Always back up image_metadata.jsonl first:
 *   cp image_metadata.jsonl image_metadata.jsonl.bak
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs').promises;
const path = require('path');

const metadataHandler = require('../metadata_handler');
const s3Storage = require('../s3-storage');

const uploadsDir = path.join(__dirname, '..', 'uploads');

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const force = args.has('--force');

const EXT_TO_FORMAT = {
    '.jpg': 'jpeg',
    '.jpeg': 'jpeg',
    '.png': 'png',
    '.webp': 'webp',
    '.gif': 'gif',
    '.tiff': 'tiff',
    '.tif': 'tiff',
    '.avif': 'avif',
};

function formatForRecord(entry, filename) {
    if (entry.format && typeof entry.format === 'string') {
        return entry.format.toLowerCase();
    }
    const ext = path.extname(filename).toLowerCase();
    return EXT_TO_FORMAT[ext] || 'jpeg';
}

async function main() {
    if (!(await s3Storage.isS3Enabled())) {
        console.error(
            '[migrate] S3 is not enabled. Set S3_IMAGES_BUCKET and AWS_REGION (or region in ~/.aws/config).'
        );
        process.exit(1);
    }

    const all = await metadataHandler.readMetadata();
    if (all.length === 0) {
        console.log('[migrate] No metadata records.');
        return;
    }

    let updated = 0;
    let skipped = 0;
    let failed = 0;
    const out = [];

    for (const entry of all) {
        const filename = path.basename(entry.cachedFilePath || '');
        if (!filename) {
            console.warn('[migrate] Skip record with no cachedFilePath:', JSON.stringify(entry).slice(0, 120));
            out.push(entry);
            continue;
        }

        if (!force && entry.s3Key && entry.imagePublicUrl) {
            console.log(`[migrate] Skip (already on S3): ${filename}`);
            skipped += 1;
            out.push(entry);
            continue;
        }

        const filePath = path.join(uploadsDir, filename);
        let buffer;
        try {
            buffer = await fs.readFile(filePath);
        } catch (e) {
            console.error(`[migrate] Missing file, skip: ${filePath}`, e.message);
            failed += 1;
            out.push(entry);
            continue;
        }

        if (!buffer.length) {
            console.error(`[migrate] Empty file, skip: ${filename}`);
            failed += 1;
            out.push(entry);
            continue;
        }

        const fmt = formatForRecord(entry, filename);
        const key = s3Storage.objectKeyForFilename(filename);

        if (dryRun) {
            console.log(`[migrate] dry-run: would upload ${filename} -> s3://${process.env.S3_IMAGES_BUCKET}/${key}`);
            out.push(entry);
            continue;
        }

        const put = await s3Storage.putImageFromBuffer(filename, buffer, fmt);
        if (!put) {
            console.error(`[migrate] PutObject failed: ${filename}`);
            failed += 1;
            out.push(entry);
            continue;
        }

        const merged = { ...entry, s3Key: put.s3Key, imagePublicUrl: put.imagePublicUrl };
        out.push(merged);
        updated += 1;
        console.log(`[migrate] OK: ${filename} -> ${put.imagePublicUrl}`);
    }

    if (dryRun) {
        console.log(`[migrate] dry-run complete. ${all.length} records examined.`);
        return;
    }

    await metadataHandler.rewriteMetadata(out);
    console.log(
        `[migrate] Done. updated=${updated} skipped=${skipped} failed/missing=${failed} total=${all.length}`
    );
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
