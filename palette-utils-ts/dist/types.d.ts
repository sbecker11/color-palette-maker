/**
 * Types for Color Palette Maker exported palette JSON and color utilities.
 * Use these when loading and consuming .json files exported from the app.
 */
/** Exported palette file shape: { name, colors, backgroundSwatchIndex?, imagePath?, imageUrl? } as written by Export Palette. */
export interface ExportedPalette {
    name: string;
    colors: string[];
    /** Optional 0-based index into colors to use as background. Omitted when not set. */
    backgroundSwatchIndex?: number;
    /** Optional path to the source image (e.g. /uploads/img-xxx.jpeg). Omitted when not available. */
    imagePath?: string;
    /** Optional URL the image was loaded from. Omitted when not available. */
    imageUrl?: string;
    /** Optional public HTTPS URL of the image in S3 (or CDN). Omitted when not using S3. */
    imagePublicUrl?: string;
}
/** RGB channels 0–255. */
export interface RGB {
    r: number;
    g: number;
    b: number;
}
/** XYZ (D65). */
export interface XYZ {
    x: number;
    y: number;
    z: number;
}
/** LAB (L in [0,100], a/b unbounded). */
export interface LAB {
    L: number;
    a: number;
    b: number;
}
/** LCH (lightness, chroma, hue in degrees). */
export interface LCH {
    L: number;
    C: number;
    H: number;
}
/** Contrast icon set: paths and variant for CSS (e.g. filter: invert(1)). */
export interface ContrastIconSet {
    url: string;
    back: string;
    img: string;
    variant: 'black' | 'white';
}
/** Options for getHighlightColor. */
export interface GetHighlightColorOptions {
    highlightPercent?: number;
    nearlyWhiteL?: number;
}
/** Options for getContrastIconSet. */
export interface GetContrastIconSetOptions {
    iconBase?: string;
}
//# sourceMappingURL=types.d.ts.map