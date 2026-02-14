// Handles image processing, specifically palette generation using K-means and luminance threshold filtering.

const getPixels = require('get-pixels');
const { clusterize } = require('node-kmeans'); // Import K-means
const colorDiff = require('color-diff');

// --- Palette Generation Configuration ---

// Number of clusters (colors) to find using K-means.
// We find 7, then filter based on luminance thresholds.
const K_CLUSTERS = 7; 
const FINAL_PALETTE_SIZE = 5;

// Luminance thresholds to filter out near-black and near-white clusters.
const MIN_LUMINANCE_THRESHOLD = 25;
const MAX_LUMINANCE_THRESHOLD = 185;

// CIEDE2000 delta-E threshold for merging centroids (e.g., when image has fewer distinct colors than k).
const COLOR_SIMILARITY_THRESHOLD = 5;

function minPairwiseColorDistance(centroidsRgb) {
    if (centroidsRgb.length < 2) return null;
    let minD = Infinity;
    for (let i = 0; i < centroidsRgb.length; i++) {
        const a = { R: centroidsRgb[i][0], G: centroidsRgb[i][1], B: centroidsRgb[i][2] };
        for (let j = i + 1; j < centroidsRgb.length; j++) {
            const b = { R: centroidsRgb[j][0], G: centroidsRgb[j][1], B: centroidsRgb[j][2] };
            const d = colorDiff.diff(a, b);
            if (d < minD) minD = d;
        }
    }
    return minD === Infinity ? null : minD;
}

// // Define pure black and white for seeding and filtering (REMOVED)
// const PURE_BLACK_RGB = [0, 0, 0];
// const PURE_WHITE_RGB = [255, 255, 255];

// // Calculates the Euclidean distance between two RGB colors. (REMOVED)
// function calculateRgbDistance(rgb1, rgb2) {
//     const dr = rgb1[0] - rgb2[0];
//     const dg = rgb1[1] - rgb2[1];
//     const db = rgb1[2] - rgb2[2];
//     return Math.sqrt(dr*dr + dg*dg + db*db);
// }

/**
 * Calculates the perceived luminance of an RGB color.
 * Uses the standard formula for relative luminance.
 * @param {number[]} rgb - Array of RGB values [r, g, b] (0-255).
 * @returns {number} Luminance value (0-255).
 */
function calculateLuminance(rgb) {
    // Normalize RGB to 0-1 range for standard calculation
    const r = rgb[0] / 255;
    const g = rgb[1] / 255;
    const b = rgb[2] / 255;
    // Standard relative luminance calculation
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    // Scale back to 0-255 range (optional, but keeps it consistent with input)
    return luminance * 255;
}

/**
 * Generates a palette of up to 5 dominant colors from an image using K-means,
 * filtering clusters based on luminance thresholds (removing near-blacks/whites),
 * and returning the remaining colors sorted by luminance (darkest to lightest).
 * @param {string} imagePath - The path to the image file.
 * @param {{ k?: number }} [options] - Optional. k: number of clusters (2–20, default 7).
 * @returns {Promise<string[]>} A promise that resolves to an array of hex color strings (e.g., ['#RRGGBB']).
 */
async function generateDistinctPalette(imagePath, options = {}) {
    const k = options.k != null ? Math.min(20, Math.max(2, Math.floor(options.k))) : K_CLUSTERS;
    console.log(`[Image Processor] Starting K-means palette generation (k=${k}, luminance threshold filtered) for: ${imagePath}`);
    let extractedPalette = [];

    try {
        // 1. Read pixel data from the image file.
        const pixelsData = await new Promise((resolve, reject) => {
            console.log(`[Image Processor] Calling getPixels with imagePath: ${imagePath}`);
            getPixels(imagePath, (err, pixels) => {
                if (err) {
                    console.error('[Image Processor] *** getPixels callback error:', err);
                    return reject(err);
                }
                console.log('[Image Processor] getPixels callback success.');
                resolve(pixels);
            });
        });
        console.log('[Image Processor] getPixels promise resolved.');

        // 2. Prepare the pixel array for K-means (exclude transparent, near-black, near-white).
        const pixelArray = []; // Array of [R, G, B] vectors
        const pixelDataArray = pixelsData.data;
        for (let i = 0; i < pixelDataArray.length; i += 4) {
            if (pixelDataArray[i + 3] <= 128) continue; // Skip mostly transparent
            const rgb = [pixelDataArray[i], pixelDataArray[i + 1], pixelDataArray[i + 2]];
            const lum = calculateLuminance(rgb);
            if (lum < MIN_LUMINANCE_THRESHOLD || lum > MAX_LUMINANCE_THRESHOLD) continue; // Exclude near-black/white
            pixelArray.push(rgb);
        }
        console.log(`[Image Processor] Prepared pixel array with ${pixelArray.length} pixels (excluding near-black/white).`);

        if (pixelArray.length > 0) {

            // 3. Perform K-means clustering (unseeded).
            const result = await new Promise((resolve, reject) => {
                console.log(`[Image Processor] Calling K-means clusterize with k=${k}...`);
                clusterize(pixelArray, { k }, (err, res) => {
                    if (err) {
                        console.error('[Image Processor] *** K-means callback error:', err);
                        return reject(err);
                    }
                    console.log('[Image Processor] K-means callback success.');
                    resolve(res);
                });
            });
            console.log('[Image Processor] K-means promise resolved.');

            if (result && Array.isArray(result) && result.length > 0) {
                const allCentroidsRgb = result.map(cluster => cluster.centroid.map(Math.round));
                console.log(`[Image Processor] Extracted ${allCentroidsRgb.length} centroids (colors).`);
                const minDistKmeans = minPairwiseColorDistance(allCentroidsRgb);
                if (minDistKmeans != null) {
                    console.log(`[Image Processor] After K-means: minimal color distance = ${minDistKmeans.toFixed(4)}`);
                }
                extractedPalette = centroidsToPalette(allCentroidsRgb, options);
                console.log(`[Image Processor] Selected final ${extractedPalette.length} centroids.`);
            } else {
                console.warn('[Image Processor] K-means did not return valid results.');
            }
        } else {
             console.warn("[Image Processor] No opaque pixels found or pixel array is empty.");
        }
    } catch (error) {
        console.error("*** Error during K-means palette processing:", error);
        extractedPalette = []; // Return empty palette on error
    }
    
    console.log(`[Image Processor] Finished K-means palette generation. Returning ${extractedPalette.length} colors.`);
    return extractedPalette;
}

// Helper function for formatting (optional, used in fallback)
function rgbToHex(rgb) {
    const r = rgb[0].toString(16).padStart(2, '0');
    const g = rgb[1].toString(16).padStart(2, '0');
    const b = rgb[2].toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
}

/**
 * Converts raw K-means centroids (RGB arrays) to a palette of hex strings.
 * Filters by luminance, sorts by luminance, and takes up to maxColors.
 * @param {number[][]} centroidsRgb - Array of [r,g,b] arrays (0-255).
 * @param {{ k?: number }} [options] - Optional. k: max palette size when specified.
 * @returns {string[]} Array of hex color strings.
 */
function centroidsToPalette(centroidsRgb, options = {}) {
    const k = options.k != null ? Math.min(20, Math.max(2, Math.floor(options.k))) : K_CLUSTERS;
    const maxColors = options.k != null ? k : FINAL_PALETTE_SIZE;

    const centroidsWithLuminance = centroidsRgb.map(rgb => ({
        rgb: rgb,
        luminance: calculateLuminance(rgb)
    }));

    const filtered = centroidsWithLuminance.filter(item =>
        item.luminance >= MIN_LUMINANCE_THRESHOLD && item.luminance <= MAX_LUMINANCE_THRESHOLD
    );
    filtered.sort((a, b) => a.luminance - b.luminance);

    const filteredRgb = filtered.map((item) => item.rgb);
    const minDistBeforeMerge = minPairwiseColorDistance(filteredRgb);
    if (minDistBeforeMerge != null) {
        console.log(`[Image Processor] Before merge centroids: minimal color distance = ${minDistBeforeMerge.toFixed(4)} (${filtered.length} centroids)`);
    }

    // Merge centroids within COLOR_SIMILARITY_THRESHOLD (handles images with fewer distinct colors than k)
    const merged = [];
    for (const item of filtered) {
        const c = { R: item.rgb[0], G: item.rgb[1], B: item.rgb[2] };
        const shouldMerge = merged.some((existing) =>
            colorDiff.diff(c, { R: existing.rgb[0], G: existing.rgb[1], B: existing.rgb[2] }) < COLOR_SIMILARITY_THRESHOLD
        );
        if (!shouldMerge) merged.push(item);
        if (merged.length >= maxColors) break;
    }

    const mergedRgb = merged.map((item) => item.rgb);
    const minDistMerged = minPairwiseColorDistance(mergedRgb);
    if (minDistMerged != null) {
        console.log(`[Image Processor] After merge centroids: minimal color distance = ${minDistMerged.toFixed(4)} (${merged.length} centroids)`);
    }

    const finalCentroids = merged.slice(0, maxColors);
    return finalCentroids.map(item => rgbToHex(item.rgb));
}

module.exports = {
    generateDistinctPalette,
    centroidsToPalette,
    calculateLuminance,
    minPairwiseColorDistance
};
