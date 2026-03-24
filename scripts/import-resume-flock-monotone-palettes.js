#!/usr/bin/env node
/**
 * Import White_Monotone, Medium_Grey_Monotone, Black_Monotone from resume-flock
 * as palette images. Creates swatch-strip images and appends metadata.
 * Run `npm run migrate:s3` after to upload to S3.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');

const metadataHandler = require('../metadata_handler');
const s3Storage = require('../s3-storage');

const REPO_ROOT = path.join(__dirname, '..');
const UPLOADS_DIR = path.join(REPO_ROOT, 'local-data-cache');
const PALETTES_SRC = path.join(REPO_ROOT, '..', '..', 'workspace-flock', 'resume-flock', 'static_content', 'colorPalettes');

const PALETTE_FILES = ['White_Monotone.json', 'Medium_Grey_Monotone.json', 'Black_Monotone.json'];

function hexToRgb(hex) {
    const n = parseInt(hex.replace(/^#/, ''), 16);
    return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

async function createSwatchImage(colors, width = 360, barHeight = 80) {
    const numColors = Math.max(1, colors.length);
    const barWidth = Math.floor(width / numColors);
    const channels = 3;
    const raw = Buffer.alloc(width * barHeight * channels);

    for (let y = 0; y < barHeight; y++) {
        for (let x = 0; x < width; x++) {
            const idx = Math.min(Math.floor(x / barWidth), numColors - 1);
            const [r, g, b] = hexToRgb(colors[idx]);
            const i = (y * width + x) * channels;
            raw[i] = r;
            raw[i + 1] = g;
            raw[i + 2] = b;
        }
    }

    return sharp(raw, { raw: { width, height: barHeight, channels } })
        .jpeg({ quality: 90 })
        .toBuffer();
}

async function main() {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });

    for (const filename of PALETTE_FILES) {
        const srcPath = path.join(PALETTES_SRC, filename);
        let data;
        try {
            const raw = await fs.readFile(srcPath, 'utf8');
            data = JSON.parse(raw);
        } catch (e) {
            console.warn(`[import] Skip ${filename}: ${e.message}`);
            continue;
        }

        const colors = Array.isArray(data.colors) ? data.colors : [];
        const paletteName = data.name || path.parse(filename).name.replace(/_/g, ' ');
        const backgroundSwatchIndex = typeof data.backgroundSwatchIndex === 'number' ? data.backgroundSwatchIndex : 0;

        if (colors.length === 0) {
            console.warn(`[import] Skip ${filename}: no colors`);
            continue;
        }

        const buffer = await createSwatchImage(colors);
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const outputFilename = `img-${uniqueSuffix}.jpeg`;
        const outputPath = path.join(UPLOADS_DIR, outputFilename);

        await fs.writeFile(outputPath, buffer);
        const stats = await fs.stat(outputPath);

        const record = {
            createdDateTime: new Date().toISOString(),
            uploadedURL: null,
            uploadedFilePath: null,
            cachedFilePath: outputPath,
            width: 360,
            height: 80,
            format: 'jpeg',
            fileSizeBytes: stats.size,
            colorPalette: colors,
            paletteName,
            regions: [],
            regionLabels: [],
            paletteRegion: [],
            backgroundSwatchIndex,
        };

        const s3Put = await s3Storage.putImageFromBuffer(outputFilename, buffer, 'jpeg');
        if (s3Put) {
            record.s3Key = s3Put.s3Key;
            record.imagePublicUrl = s3Put.imagePublicUrl;
        }

        await metadataHandler.appendMetadata(record);
        console.log(`[import] Added: ${paletteName} (${outputFilename})${s3Put ? ' -> S3' : ''}`);
    }

    console.log('[import] Done. Restart the app to see new palettes.');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
