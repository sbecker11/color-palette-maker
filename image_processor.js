// Handles image processing, specifically palette generation.

const getPixels = require('get-pixels');
const quantize = require('quantize');
const diff = require('color-diff');

// Constants for palette generation (can be adjusted)
const INITIAL_K = 30; 
const FINAL_K_MAX = 15;
const DELTA_E_THRESHOLD = 12;

async function generateDistinctPalette(imagePath) {
    console.log(`[Image Processor] Starting palette generation for: ${imagePath}`);
    let extractedPalette = [];

    try {
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

        const pixelArray = [];
        const pixelDataArray = pixelsData.data;
        for (let i = 0; i < pixelDataArray.length; i += 4) {
            if (pixelDataArray[i + 3] > 128) { // Alpha threshold
                pixelArray.push([pixelDataArray[i], pixelDataArray[i + 1], pixelDataArray[i + 2]]);
            }
        }
        console.log(`[Image Processor] Prepared pixel array with ${pixelArray.length} pixels.`);

        if (pixelArray.length > 0) {
            console.log(`[Image Processor] Calling quantize with k=${INITIAL_K}...`);
            const cmap = quantize(pixelArray, INITIAL_K);
            console.log('[Image Processor] quantize call returned.');

            if (cmap && typeof cmap.palette === 'function') {
                const candidateRgbPalette = cmap.palette();
                console.log(`[Image Processor] quantize returned initial palette with ${candidateRgbPalette ? candidateRgbPalette.length : 0} colors.`);

                if (candidateRgbPalette && candidateRgbPalette.length > 0) {
                    const finalRgbPalette = [];
                    const finalLabColors = [];

                    const firstRgb = candidateRgbPalette[0];
                    finalRgbPalette.push(firstRgb);
                    finalLabColors.push(diff.rgb_to_lab({ R: firstRgb[0], G: firstRgb[1], B: firstRgb[2] }));

                    for (let i = 1; i < candidateRgbPalette.length; i++) {
                        if (finalRgbPalette.length >= FINAL_K_MAX) {
                            console.log(`[Image Processor] Reached max final colors (${FINAL_K_MAX}). Stopping filtering.`);
                            break;
                        }

                        const candidateRgb = candidateRgbPalette[i];
                        const candidateLab = diff.rgb_to_lab({ R: candidateRgb[0], G: candidateRgb[1], B: candidateRgb[2] });
                        let minDifference = Infinity;

                        for (const finalLab of finalLabColors) {
                            const delta = diff.diff(candidateLab, finalLab);
                            if (delta < minDifference) {
                                minDifference = delta;
                            }
                        }

                        if (minDifference >= DELTA_E_THRESHOLD) {
                            finalRgbPalette.push(candidateRgb);
                            finalLabColors.push(candidateLab);
                        }
                    }
                    console.log(`[Image Processor] Filtered palette down to ${finalRgbPalette.length} distinct colors.`);

                    extractedPalette = finalRgbPalette.map(rgb => {
                        const r = rgb[0].toString(16).padStart(2, '0');
                        const g = rgb[1].toString(16).padStart(2, '0');
                        const b = rgb[2].toString(16).padStart(2, '0');
                        return `#${r}${g}${b}`;
                    });

                } else {
                    console.warn('[Image Processor] quantize cmap.palette() returned empty or null.');
                }
            } else {
                console.warn('[Image Processor] quantize returned invalid cmap or cmap without palette method.');
            }
        } else {
             console.warn("[Image Processor] No opaque pixels found or pixel array is empty.");
        }
    } catch (error) {
        console.error("*** Error during generateDistinctPalette processing:", error);
        extractedPalette = []; // Return empty palette on error
    }
    
    console.log(`[Image Processor] Finished palette generation. Returning ${extractedPalette.length} colors.`);
    return extractedPalette;
}

module.exports = {
    generateDistinctPalette
};
