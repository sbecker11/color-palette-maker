/**
 * ImageViewer env-based config. Excluded from coverage (config-only).
 */
export const HIGHLIGHT_REGION_ON_ROLLOVER = (() => {
  const val = import.meta.env.VITE_HIGHLIGHT_REGION_ON_ROLLOVER;
  if (val === undefined || val === '') return true;
  return val !== 'false' && val !== '0';
})();

export const REGION_BOUNDARY_STROKE_WIDTH = (() => {
  const val = import.meta.env.VITE_REGION_BOUNDARY_STROKE_WIDTH;
  if (val === undefined || val === '') return 1;
  const n = Number(val);
  return Number.isFinite(n) && n >= 0 ? n : 1;
})();

export const REGION_BOUNDARY_STROKE_COLOR = (() => {
  const val = import.meta.env.VITE_REGION_BOUNDARY_STROKE_COLOR;
  return (val !== undefined && val !== '') ? String(val) : 'rgba(50, 120, 200, 0.9)';
})();

export const REGION_HIGHLIGHT_STROKE_WIDTH = (() => {
  const val = import.meta.env.VITE_REGION_HIGHLIGHT_STROKE_WIDTH;
  if (val === undefined || val === '') return 3;
  const n = Number(val);
  return Number.isFinite(n) && n > 0 ? n : 3;
})();

export const REGION_HIGHLIGHT_STROKE_COLOR = (() => {
  const val = import.meta.env.VITE_REGION_HIGHLIGHT_STROKE_COLOR;
  return (val !== undefined && val !== '') ? String(val) : 'rgba(80, 160, 255, 1)';
})();

export const REGION_HIGHLIGHT_FILL = (() => {
  const val = import.meta.env.VITE_REGION_HIGHLIGHT_FILL;
  if (val === undefined || val === '') return 'rgba(150, 220, 255, 0.45)';
  if (val === 'false' || val.toLowerCase() === 'transparent') return 'transparent';
  return String(val);
})();
