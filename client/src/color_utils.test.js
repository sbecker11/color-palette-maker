import { describe, expect, it } from 'vitest';
import {
  formatHexDisplay,
  getContrastIconSet,
  getHighlightColor,
  getHighContrastMono,
  hexToRgb,
  rgbToHex,
} from '../../utils/color_utils.js';

describe('utils/color_utils.js', () => {
  describe('formatHexDisplay', () => {
    it('returns 7-char lowercase hex for #rrggbb', () => {
      expect(formatHexDisplay('#ff0000')).toBe('#ff0000');
      expect(formatHexDisplay('#FF0000')).toBe('#ff0000');
      expect(formatHexDisplay('#aAbBcC')).toBe('#aabbcc');
    });

    it('expands #rgb to #rrggbb', () => {
      expect(formatHexDisplay('#f00')).toBe('#ff0000');
      expect(formatHexDisplay('#abc')).toBe('#aabbcc');
    });

    it('returns empty string for invalid input', () => {
      expect(formatHexDisplay('')).toBe('');
      expect(formatHexDisplay(null)).toBe('');
    });

    it('adds # prefix when hex has no leading #', () => {
      expect(formatHexDisplay('ff0000')).toBe('#ff0000');
    });

    it('returns as-is for partial hex that does not match #rrggbb or #rgb', () => {
      expect(formatHexDisplay('#a')).toBe('#a');
      expect(formatHexDisplay('#12')).toBe('#12');
    });
  });

  describe('rgbToHex', () => {
    it('converts RGB to hex', () => {
      expect(rgbToHex(255, 0, 0)).toBe('#ff0000');
      expect(rgbToHex(0, 255, 0)).toBe('#00ff00');
      expect(rgbToHex(0, 0, 255)).toBe('#0000ff');
      expect(rgbToHex(0, 0, 0)).toBe('#000000');
      expect(rgbToHex(255, 255, 255)).toBe('#ffffff');
    });

    it('pads single hex digits', () => {
      expect(rgbToHex(0, 15, 0)).toBe('#000f00');
    });
  });

  describe('hexToRgb', () => {
    it('parses valid 6-digit hex', () => {
      expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
      expect(hexToRgb('#00ff00')).toEqual({ r: 0, g: 255, b: 0 });
    });

    it('normalizes via formatHexDisplay', () => {
      expect(hexToRgb('#f00')).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('returns null for invalid', () => {
      expect(hexToRgb('')).toBe(null);
      expect(hexToRgb('#gg0000')).toBe(null);
    });
  });

  describe('getHighContrastMono', () => {
    it('returns black on light backgrounds', () => {
      expect(getHighContrastMono('#ffffff')).toBe('#000000');
      expect(getHighContrastMono('#ffff00')).toBe('#000000');
    });

    it('returns white on dark backgrounds', () => {
      expect(getHighContrastMono('#000000')).toBe('#ffffff');
      expect(getHighContrastMono('#000080')).toBe('#ffffff');
    });
  });

  describe('getHighlightColor', () => {
    it('returns hex string for valid color', () => {
      const out = getHighlightColor('#c1543c', { highlightPercent: 135 });
      expect(out).toMatch(/^#[0-9a-f]{6}$/);
    });

    it('changes output with highlightPercent', () => {
      const a = getHighlightColor('#4080c0', { highlightPercent: 110 });
      const b = getHighlightColor('#4080c0', { highlightPercent: 150 });
      expect(a).not.toBe(b);
    });

    it('returns original arg when hex cannot be parsed', () => {
      expect(getHighlightColor('not-a-color')).toBe('not-a-color');
    });

    it('brightens dark colors', () => {
      const dark = '#222222';
      const h = getHighlightColor(dark, { highlightPercent: 135 });
      const a = hexToRgb(dark);
      const b = hexToRgb(h);
      expect(b.r + b.g + b.b).toBeGreaterThan(a.r + a.g + a.b);
    });
  });

  describe('getContrastIconSet', () => {
    it('uses default icon base and sets variant from contrast', () => {
      const light = getContrastIconSet('#ffffff');
      expect(light.variant).toBe('black');
      expect(light.url).toContain('/static_content/icons/anchors/');
      expect(light.url).toContain('icons8-url-16-black.png');

      const dark = getContrastIconSet('#000000');
      expect(dark.variant).toBe('white');
    });

    it('respects custom iconBase', () => {
      const s = getContrastIconSet('#fff', { iconBase: '/custom/icons' });
      expect(s.url).toBe('/custom/icons/icons8-url-16-black.png');
      expect(s.back).toBe('/custom/icons/icons8-back-16-black.png');
      expect(s.img).toBe('/custom/icons/icons8-img-16-black.png');
    });
  });
});
