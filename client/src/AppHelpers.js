/**
 * Pure helper functions extracted from App.jsx for better testability and branch coverage.
 */
import { getFilenameFromMeta, getFilenameWithoutExt } from './utils';

/** Returns true if meta needs palette generation (no or empty colorPalette) */
export function needsPaletteGeneration(meta) {
  return (
    !meta?.colorPalette ||
    !Array.isArray(meta.colorPalette) ||
    meta.colorPalette.length === 0
  );
}

/**
 * Returns next selection { meta, imageUrl } after deleting a file, or null.
 * @param {Object[]} remaining - Images left after deletion
 * @returns {{ meta: Object, imageUrl: string } | null}
 */
export function getNextSelectionAfterDeletion(remaining) {
  if (!remaining || remaining.length === 0) return null;
  const first = remaining[0];
  const fn = getFilenameFromMeta(first);
  if (!fn) return null;
  return {
    meta: first,
    imageUrl: `/uploads/${encodeURIComponent(fn)}`,
  };
}

/**
 * Computes reordered images and filenames for reorder API.
 * @returns {{ reordered: Object[], filenames: string[] } | null} null if invalid
 */
export function computeReorderedState(images, index, direction) {
  if (!images || index < 0 || index >= images.length) return null;
  const newIndex = direction === 'up' ? index - 1 : index + 1;
  if (newIndex < 0 || newIndex >= images.length) return null;

  const reordered = [...images];
  [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];
  const filenames = reordered.map((m) => getFilenameFromMeta(m)).filter(Boolean);
  return { reordered, filenames };
}

/**
 * Returns true if palette name should be saved (has changed and is valid).
 */
export function shouldSavePaletteName(selectedMeta, paletteName) {
  if (!selectedMeta || !paletteName?.trim()) return false;
  const filename = getFilenameFromMeta(selectedMeta);
  if (!filename) return false;
  if (selectedMeta.paletteName === paletteName.trim()) return false;
  return true;
}

/**
 * Builds export payload. Returns { name, colors } or null if nothing to export.
 */
export function buildExportData(selectedMeta, paletteName) {
  if (!selectedMeta) return null;
  const palette = selectedMeta.colorPalette || [];
  if (!Array.isArray(palette) || palette.length === 0) return null;

  const name =
    paletteName?.trim() ||
    getFilenameWithoutExt(getFilenameFromMeta(selectedMeta) || '') ||
    'palette';
  return { name, colors: palette };
}

/**
 * Returns meta with colorPalette updated.
 */
export function applyPaletteToMeta(meta, palette) {
  if (!meta) return meta;
  return { ...meta, colorPalette: palette };
}

/**
 * Returns images array with palette updated for the file matching filename.
 */
export function applyPaletteToImages(images, filename, palette) {
  if (!images) return [];
  return images.map((m) =>
    getFilenameFromMeta(m) === filename ? { ...m, colorPalette: palette } : m
  );
}

/**
 * Returns images array with paletteName updated for the file matching filename.
 */
export function applyPaletteNameToImages(images, filename, paletteName) {
  if (!images) return [];
  const name = paletteName.trim();
  return images.map((m) =>
    getFilenameFromMeta(m) === filename ? { ...m, paletteName: name } : m
  );
}
