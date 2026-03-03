/**
 * Utility functions for Color Palette Maker
 */

export function getFilenameFromMeta(meta) {
  if (!meta?.cachedFilePath) return null;
  return meta.cachedFilePath.split(/[/\\]/).pop();
}

/** Returns true if meta corresponds to the given filename. */
export function isSelectedImage(meta, filename) {
  return meta != null && getFilenameFromMeta(meta) === filename;
}

export function getFilenameWithoutExt(filename) {
  if (!filename || typeof filename !== 'string') return '';
  return filename.includes('.') ? filename.substring(0, filename.lastIndexOf('.')) : filename;
}

export function formatFileSize(bytes) {
  if (typeof bytes !== 'number') return 'N/A';
  if (bytes > 1024 * 1024) {
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }
  if (bytes > 1024) {
    return (bytes / 1024).toFixed(1) + ' KB';
  }
  return bytes + ' Bytes';
}

export function rgbToHex(r, g, b) {
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/** Format hex for display: always 7 chars (#rrggbb), lowercase. Expands #rgb to #rrggbb. */
export function formatHexDisplay(hex) {
  if (!hex || typeof hex !== 'string') return '';
  const h = hex.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(h)) return h;
  const m = h.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/);
  if (m) return `#${m[1]}${m[1]}${m[2]}${m[2]}${m[3]}${m[3]}`;
  return h.startsWith('#') ? h : `#${h}`;
}

/** Parse hex color to { r, g, b } (0-255). Returns null if invalid. */
export function hexToRgb(hex) {
  const h = formatHexDisplay(hex);
  if (!h || !/^#[0-9a-f]{6}$/.test(h)) return null;
  return {
    r: parseInt(h.slice(1, 3), 16),
    g: parseInt(h.slice(3, 5), 16),
    b: parseInt(h.slice(5, 7), 16),
  };
}

/** Convert RGB (0-255) to HSV. Returns { h: 0-360, s: 0-1, v: 0-1 }. */
export function rgbToHsv(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  if (d !== 0) {
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      default: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: h * 360, s, v };
}

/** Convert HSV (h: 0-360, s: 0-1, v: 0-1) to RGB (0-255). */
export function hsvToRgb(h, s, v) {
  h = h / 60;
  const c = v * s;
  const x = c * (1 - Math.abs((h % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 1) { r = c; g = x; b = 0; } else if (h < 2) { r = x; g = c; b = 0; } else if (h < 3) { r = 0; g = c; b = x; } else if (h < 4) { r = 0; g = x; b = c; } else if (h < 5) { r = x; g = 0; b = c; } else { r = c; g = 0; b = x; }
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

/** Relative luminance (0-1). Used for contrast. */
function getLuminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0.5;
  const { r, g, b } = rgb;
  const [rs, gs, bs] = [r, g, b].map((n) => {
    const x = n / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/** Returns black or white hex for best contrast on the given background. */
export function getHighContrastMono(hex) {
  return getLuminance(hex) > 0.5 ? '#000000' : '#ffffff';
}

const ICON_BASE = '/static-content/icons/anchors';

/**
 * Returns paths for url, back, and img icons. Uses black PNGs only; when variant
 * is 'white', apply CSS filter: invert(1) to render white. Matches the contrast
 * color for the given background.
 * @param {string} hex - Background hex color
 * @returns {{ url: string, back: string, img: string, variant: 'black'|'white' }}
 */
export function getContrastIconSet(hex) {
  const variant = getHighContrastMono(hex) === '#000000' ? 'black' : 'white';
  return {
    url: `${ICON_BASE}/icons8-url-16-black.png`,
    back: `${ICON_BASE}/icons8-back-16-black.png`,
    img: `${ICON_BASE}/icons8-img-16-black.png`,
    variant,
  };
}

const SWATCH_HIGHLIGHT_MULTIPLIER =
  (Number(import.meta.env.VITE_SWATCH_HIGHLIGHT_PERCENTAGE) || 135) / 100;

// --- sRGB ↔ linear (0–1) ---
function srgbToLinear(c) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function linearToSrgb(c) {
  if (c <= 0.0031308) return 12.92 * c;
  return 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

// --- RGB (0–255) ↔ XYZ (D65) ---
function rgbToXyz(r, g, b) {
  const R = srgbToLinear(r / 255);
  const G = srgbToLinear(g / 255);
  const B = srgbToLinear(b / 255);
  return {
    x: 0.4124564 * R + 0.3575761 * G + 0.1804375 * B,
    y: 0.2126729 * R + 0.7151522 * G + 0.072175 * B,
    z: 0.0193339 * R + 0.119192 * G + 0.9503041 * B,
  };
}
function xyzToRgb(x, y, z) {
  const R = 3.2404542 * x - 1.5371385 * y - 0.4985314 * z;
  const G = -0.969266 * x + 1.8760108 * y + 0.041556 * z;
  const B = 0.0556434 * x - 0.2040259 * y + 1.0572252 * z;
  return {
    r: Math.round(Math.min(255, Math.max(0, linearToSrgb(R) * 255))),
    g: Math.round(Math.min(255, Math.max(0, linearToSrgb(G) * 255))),
    b: Math.round(Math.min(255, Math.max(0, linearToSrgb(B) * 255))),
  };
}

// --- XYZ ↔ LAB (D65 white point) ---
const LAB_D65 = { xn: 0.95047, yn: 1, zn: 1.08883 };
function f(t) {
  const d = 6 / 29;
  return t > d * d * d ? Math.pow(t, 1 / 3) : t / (3 * d * d) + 4 / 29;
}
function invF(t) {
  const d = 6 / 29;
  return t > d ? t * t * t : 3 * d * d * (t - 4 / 29);
}
function xyzToLab(x, y, z) {
  const { xn, yn, zn } = LAB_D65;
  const fy = f(y / yn);
  return {
    L: 116 * fy - 16,
    a: 500 * (f(x / xn) - fy),
    b: 200 * (fy - f(z / zn)),
  };
}
function labToXyz(L, a, b) {
  const { xn, yn, zn } = LAB_D65;
  const y = (L + 16) / 116;
  return {
    x: xn * invF(y + a / 500),
    y: yn * invF(y),
    z: zn * invF(y - b / 200),
  };
}

/** RGB (0–255) to LAB. L in [0,100], a and b unbounded. */
function rgbToLab(r, g, b) {
  const { x, y, z } = rgbToXyz(r, g, b);
  return xyzToLab(x, y, z);
}

/** LAB to RGB (0–255). */
function labToRgb(L, a, b) {
  const { x, y, z } = labToXyz(L, a, b);
  return xyzToRgb(x, y, z);
}

// --- LAB ↔ LCH (lightness, chroma, hue) ---
function labToLch(L, a, b) {
  const C = Math.sqrt(a * a + b * b);
  const H = C < 1e-10 ? 0 : (Math.atan2(b, a) * 180) / Math.PI;
  return { L, C, H: H < 0 ? H + 360 : H };
}
function lchToLab(L, C, H) {
  const rad = (H * Math.PI) / 180;
  return { L, a: C * Math.cos(rad), b: C * Math.sin(rad) };
}

const NEARLY_WHITE_L_THRESHOLD = 85;

/** Perceptually distinct highlight: brighter for most colors; for nearly white, darker (L divided by multiplier). */
export function getHighlightColor(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const lab = rgbToLab(rgb.r, rgb.g, rgb.b);
  const lch = labToLch(lab.L, lab.a, lab.b);
  let L2;
  if (lch.L >= NEARLY_WHITE_L_THRESHOLD) {
    L2 = lch.L / SWATCH_HIGHLIGHT_MULTIPLIER;
  } else {
    L2 = Math.min(100, lch.L * SWATCH_HIGHLIGHT_MULTIPLIER);
  }
  const lab2 = lchToLab(L2, lch.C, lch.H);
  const out = labToRgb(lab2.L, lab2.a, lab2.b);
  return rgbToHex(out.r, out.g, out.b);
}
