/**
 * Utility functions for Color Palette Maker
 * Color logic lives in utils/color_utils.js; re-exported here with app config.
 */

import {
  formatHexDisplay as _formatHexDisplay,
  getContrastIconSet as _getContrastIconSet,
  getHighlightColor as _getHighlightColor,
  getHighContrastMono as _getHighContrastMono,
  hexToRgb as _hexToRgb,
  rgbToHex,
} from '../../utils/color_utils.js';

// --- App-specific (non-color) ---
export function getFilenameFromMeta(meta) {
  if (!meta?.cachedFilePath) return null;
  return meta.cachedFilePath.split(/[/\\]/).pop();
}

/** Image URL for <img src>: proxied S3 URL when imagePublicUrl present (avoids CORS), else same-origin /palette-images/... */
export function getImageUrlForMeta(meta) {
  if (meta?.imagePublicUrl && typeof meta.imagePublicUrl === 'string') {
    return `/api/image-proxy?url=${encodeURIComponent(meta.imagePublicUrl)}`;
  }
  const fn = getFilenameFromMeta(meta) || 'unknown';
  return `/palette-images/${encodeURIComponent(fn)}`;
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

// --- Color: re-exports from utils with app config ---
export const formatHexDisplay = _formatHexDisplay;
export const hexToRgb = _hexToRgb;
export { rgbToHex };

export function getHighContrastMono(hex) {
  return _getHighContrastMono(hex);
}

const HIGHLIGHT_PERCENT = Number(import.meta.env.VITE_SWATCH_HIGHLIGHT_PERCENTAGE) || 135;
const ICON_BASE = '/static_content/icons/anchors';

export function getHighlightColor(hex) {
  return _getHighlightColor(hex, { highlightPercent: HIGHLIGHT_PERCENT });
}

export function getContrastIconSet(hex) {
  return _getContrastIconSet(hex, { iconBase: ICON_BASE });
}
