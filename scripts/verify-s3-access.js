#!/usr/bin/env node
/**
 * Verify S3 setup for this project:
 * 1) IAM read/write: PutObject + GetObject + DeleteObject on a probe key under metadata/
 * 2) Public read: anonymous HEAD on the palette catalog URL (same as color-palette-utils-ts consumers)
 *
 * Loads root .env (same as the server). Run from repo root:
 *   npm run verify:s3
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const {
    verifyIamAccess,
    verifyPublicPalettesCatalogUrl,
    isS3Enabled,
    getRegion,
} = require('../s3-storage');

async function main() {
    const bucket =
        process.env.S3_IMAGES_BUCKET?.trim() || process.env.AWS_S3_BUCKET?.trim() || '(not set)';
    const regionFromEnv = process.env.AWS_REGION?.trim();
    const regionResolved = (await getRegion()) || '(could not resolve — check ~/.aws/config)';

    console.log('[verify:s3] Bucket (env):', bucket);
    console.log('[verify:s3] Region (env):', regionFromEnv || '(not set)');
    console.log('[verify:s3] Region (resolved):', regionResolved);

    if (!(await isS3Enabled())) {
        console.error('\n[verify:s3] FAIL: S3 is not enabled. Set S3_IMAGES_BUCKET and region.');
        process.exit(1);
    }

    console.log('\n[verify:s3] Checking IAM PutObject / GetObject / DeleteObject…');
    const iam = await verifyIamAccess();
    if (!iam.ok) {
        console.error('[verify:s3] FAIL (IAM):', iam.error);
        process.exit(1);
    }
    console.log('[verify:s3] OK (IAM): probe object written, read, and deleted:', iam.probeKey);

    console.log('\n[verify:s3] Checking anonymous read of palette catalog URL…');
    const pub = await verifyPublicPalettesCatalogUrl();
    if (!pub.ok) {
        console.error('[verify:s3] FAIL (public catalog):', pub.error);
        if (pub.url) console.error('[verify:s3] URL:', pub.url);
        console.error(
            '[verify:s3] Fix: run scripts/create-s3-palette-bucket.sh — see docs/S3-STORAGE.md'
        );
        process.exit(1);
    }
    console.log('[verify:s3] OK (public catalog):', pub.url);

    console.log('\n[verify:s3] All checks passed.');
}

main().catch((err) => {
    console.error('[verify:s3] Unexpected error:', err);
    process.exit(1);
});
