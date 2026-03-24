import { describe, it, expect } from 'vitest';
import {
  needsPaletteGeneration,
  getNextSelectionAfterDeletion,
  computeReorderedState,
  shouldSavePaletteName,
  buildExportData,
  adjustBackgroundSwatchIndexAfterDelete,
  applyPaletteToMeta,
  applyPaletteToImages,
  applyPaletteNameToImages,
  applyBackgroundSwatchIndexToImages,
  indexToLabel,
  computeSwatchLabels,
  computeRegionLabels,
  applyRegionsToMeta,
  normalizeMetaPaletteRegion,
} from './AppHelpers';

describe('AppHelpers', () => {
  describe('needsPaletteGeneration', () => {
    it('returns true when meta has no colorPalette', () => {
      expect(needsPaletteGeneration({ cachedFilePath: '/x.jpeg' })).toBe(true);
    });
    it('returns true when colorPalette is empty array', () => {
      expect(needsPaletteGeneration({ colorPalette: [] })).toBe(true);
    });
    it('returns true when colorPalette is not an array', () => {
      expect(needsPaletteGeneration({ colorPalette: 'invalid' })).toBe(true);
    });
    it('returns false when colorPalette has items', () => {
      expect(needsPaletteGeneration({ colorPalette: ['#ff0000'] })).toBe(false);
    });
    it('returns true when meta is null/undefined', () => {
      expect(needsPaletteGeneration(null)).toBe(true);
    });
  });

  describe('getNextSelectionAfterDeletion', () => {
    it('returns null for empty array', () => {
      expect(getNextSelectionAfterDeletion([])).toBe(null);
    });
    it('returns null for null/undefined', () => {
      expect(getNextSelectionAfterDeletion(null)).toBe(null);
    });
    it('returns selection when first item has cachedFilePath', () => {
      const remaining = [{ cachedFilePath: '/palette-images/img.jpeg', paletteName: 'img' }];
      const result = getNextSelectionAfterDeletion(remaining);
      expect(result).toEqual({
        meta: remaining[0],
        imageUrl: '/palette-images/img.jpeg',
      });
    });
    it('returns null when first item has no cachedFilePath', () => {
      const remaining = [{ paletteName: 'img' }];
      expect(getNextSelectionAfterDeletion(remaining)).toBe(null);
    });
  });

  describe('computeReorderedState', () => {
    const images = [
      { cachedFilePath: '/palette-images/a.jpeg' },
      { cachedFilePath: '/palette-images/b.jpeg' },
      { cachedFilePath: '/palette-images/c.jpeg' },
    ];

    it('returns null when index is out of bounds', () => {
      expect(computeReorderedState(images, -1, 'down')).toBe(null);
      expect(computeReorderedState(images, 3, 'down')).toBe(null);
    });
    it('returns null when moving up at top', () => {
      expect(computeReorderedState(images, 0, 'up')).toBe(null);
    });
    it('returns null when moving down at bottom', () => {
      expect(computeReorderedState(images, 2, 'down')).toBe(null);
    });
    it('returns null when moving to top when already at top', () => {
      expect(computeReorderedState(images, 0, 'top')).toBe(null);
    });
    it('returns null when moving to bottom when already at bottom', () => {
      expect(computeReorderedState(images, 2, 'bottom')).toBe(null);
    });
    it('returns reordered state when moving to top', () => {
      const result = computeReorderedState(images, 2, 'top');
      expect(result).not.toBe(null);
      expect(result.reordered[0]).toBe(images[2]);
      expect(result.reordered[1]).toBe(images[0]);
      expect(result.reordered[2]).toBe(images[1]);
    });
    it('returns reordered state when moving to bottom', () => {
      const result = computeReorderedState(images, 0, 'bottom');
      expect(result).not.toBe(null);
      expect(result.reordered[0]).toBe(images[1]);
      expect(result.reordered[1]).toBe(images[2]);
      expect(result.reordered[2]).toBe(images[0]);
    });
    it('returns reordered state when moving down', () => {
      const result = computeReorderedState(images, 0, 'down');
      expect(result).not.toBe(null);
      expect(result.reordered[0]).toBe(images[1]);
      expect(result.reordered[1]).toBe(images[0]);
      expect(result.filenames).toEqual(['b.jpeg', 'a.jpeg', 'c.jpeg']);
    });
    it('returns reordered state when moving up', () => {
      const result = computeReorderedState(images, 1, 'up');
      expect(result).not.toBe(null);
      expect(result.reordered[0]).toBe(images[1]);
      expect(result.reordered[1]).toBe(images[0]);
    });
    it('returns null for invalid direction', () => {
      expect(computeReorderedState(images, 1, 'left')).toBe(null);
      expect(computeReorderedState(images, 1, '')).toBe(null);
    });
  });

  describe('shouldSavePaletteName', () => {
    it('returns false when selectedMeta is null', () => {
      expect(shouldSavePaletteName(null, 'name')).toBe(false);
    });
    it('returns false when paletteName is empty', () => {
      expect(shouldSavePaletteName({ cachedFilePath: '/x.jpeg' }, '')).toBe(false);
    });
    it('returns false when meta has no cachedFilePath', () => {
      expect(shouldSavePaletteName({}, 'newname')).toBe(false);
    });
    it('returns false when name unchanged', () => {
      expect(shouldSavePaletteName({ cachedFilePath: '/x.jpeg', paletteName: 'same' }, 'same')).toBe(false);
    });
    it('returns true when name changed and valid', () => {
      expect(shouldSavePaletteName({ cachedFilePath: '/x.jpeg', paletteName: 'old' }, 'new')).toBe(true);
    });
  });

  describe('buildExportData', () => {
    it('returns null when selectedMeta is null', () => {
      expect(buildExportData(null, 'name')).toBe(null);
    });
    it('returns null when palette is empty', () => {
      expect(buildExportData({ colorPalette: [] }, 'name')).toBe(null);
    });
    it('returns null when colorPalette is not array', () => {
      expect(buildExportData({ colorPalette: 'invalid' }, 'name')).toBe(null);
    });
    it('returns { name, colors, backgroundSwatchIndex, imagePath } when valid (default 0)', () => {
      const meta = { cachedFilePath: '/x.jpeg', colorPalette: ['#ff0000', '#00ff00'] };
      expect(buildExportData(meta, 'My Palette')).toEqual({
        name: 'My Palette',
        colors: ['#ff0000', '#00ff00'],
        backgroundSwatchIndex: 0,
        imagePath: '/x.jpeg',
      });
    });
    it('uses getFilenameWithoutExt when paletteName empty', () => {
      const meta = { cachedFilePath: '/palette-images/my-image.jpeg', colorPalette: ['#ff0000'] };
      expect(buildExportData(meta, '')).toEqual({
        name: 'my-image',
        colors: ['#ff0000'],
        backgroundSwatchIndex: 0,
        imagePath: '/palette-images/my-image.jpeg',
      });
    });
    it('uses palette fallback when meta has no filename', () => {
      const meta = { colorPalette: ['#ff0000'] };
      expect(buildExportData(meta, '')).toEqual({
        name: 'palette',
        colors: ['#ff0000'],
        backgroundSwatchIndex: 0,
      });
    });
    it('includes backgroundSwatchIndex when in range', () => {
      const meta = { cachedFilePath: '/x.jpeg', colorPalette: ['#ff0000', '#00ff00'], backgroundSwatchIndex: 1 };
      expect(buildExportData(meta, 'P')).toEqual({
        name: 'P',
        colors: ['#ff0000', '#00ff00'],
        backgroundSwatchIndex: 1,
        imagePath: '/x.jpeg',
      });
    });
    it('defaults backgroundSwatchIndex to 0 when undefined', () => {
      const meta = { cachedFilePath: '/x.jpeg', colorPalette: ['#ff0000', '#00ff00'] };
      expect(buildExportData(meta, 'P')).toEqual({
        name: 'P',
        colors: ['#ff0000', '#00ff00'],
        backgroundSwatchIndex: 0,
        imagePath: '/x.jpeg',
      });
    });
    it('defaults backgroundSwatchIndex to 0 when out of range', () => {
      const meta = { cachedFilePath: '/x.jpeg', colorPalette: ['#ff0000'], backgroundSwatchIndex: 1 };
      expect(buildExportData(meta, 'P')).toEqual({
        name: 'P',
        colors: ['#ff0000'],
        backgroundSwatchIndex: 0,
        imagePath: '/x.jpeg',
      });
    });
    it('omits backgroundSwatchIndex when explicitly null (None)', () => {
      const meta = { cachedFilePath: '/x.jpeg', colorPalette: ['#ff0000'], backgroundSwatchIndex: null };
      expect(buildExportData(meta, 'P')).toEqual({ name: 'P', colors: ['#ff0000'], imagePath: '/x.jpeg' });
    });
    it('includes imagePath and imageUrl when available', () => {
      const meta = {
        cachedFilePath: '/palette-images/img-123.jpeg',
        uploadedURL: 'https://example.com/photo.jpg',
        colorPalette: ['#ff0000'],
      };
      expect(buildExportData(meta, 'P')).toEqual({
        name: 'P',
        colors: ['#ff0000'],
        backgroundSwatchIndex: 0,
        imagePath: '/palette-images/img-123.jpeg',
        imageUrl: 'https://example.com/photo.jpg',
      });
    });
    it('includes imagePublicUrl when set (S3)', () => {
      const meta = {
        cachedFilePath: '/palette-images/img-123.jpeg',
        imagePublicUrl: 'https://bucket.s3.us-east-1.amazonaws.com/images/img-123.jpeg',
        colorPalette: ['#ff0000'],
      };
      expect(buildExportData(meta, 'P')).toMatchObject({
        name: 'P',
        colors: ['#ff0000'],
        imagePublicUrl: 'https://bucket.s3.us-east-1.amazonaws.com/images/img-123.jpeg',
      });
    });
    it('omits imagePath when cachedFilePath missing, omits imageUrl when uploadedURL missing', () => {
      const meta = { colorPalette: ['#ff0000'] };
      const result = buildExportData(meta, 'P');
      expect(result).not.toHaveProperty('imagePath');
      expect(result).not.toHaveProperty('imageUrl');
    });
  });

  describe('adjustBackgroundSwatchIndexAfterDelete', () => {
    it('returns undefined when backgroundSwatchIndex is undefined', () => {
      expect(adjustBackgroundSwatchIndexAfterDelete(undefined, 0)).toBe(undefined);
    });
    it('returns undefined when deleted index was the background', () => {
      expect(adjustBackgroundSwatchIndexAfterDelete(1, 1)).toBe(undefined);
    });
    it('decrements when background index is after deleted', () => {
      expect(adjustBackgroundSwatchIndexAfterDelete(2, 0)).toBe(1);
    });
    it('keeps index when background index is before deleted', () => {
      expect(adjustBackgroundSwatchIndexAfterDelete(0, 1)).toBe(0);
    });
  });

  describe('applyBackgroundSwatchIndexToImages', () => {
    it('returns [] when images is null', () => {
      expect(applyBackgroundSwatchIndexToImages(null, 'a.jpeg', 0)).toEqual([]);
    });
    it('updates only matching image backgroundSwatchIndex', () => {
      const images = [
        { cachedFilePath: '/a.jpeg', paletteName: 'A' },
        { cachedFilePath: '/b.jpeg', paletteName: 'B' },
      ];
      const result = applyBackgroundSwatchIndexToImages(images, 'b.jpeg', 1);
      expect(result[0]).toBe(images[0]);
      expect(result[1]).toEqual({ cachedFilePath: '/b.jpeg', paletteName: 'B', backgroundSwatchIndex: 1 });
    });
  });

  describe('indexToLabel', () => {
    it('returns A for 0', () => expect(indexToLabel(0)).toBe('A'));
    it('returns B for 1', () => expect(indexToLabel(1)).toBe('B'));
    it('returns Z for 25', () => expect(indexToLabel(25)).toBe('Z'));
    it('returns AA for 26', () => expect(indexToLabel(26)).toBe('AA'));
    it('returns empty for negative', () => expect(indexToLabel(-1)).toBe(''));
  });

  describe('computeSwatchLabels', () => {
    it('returns A,B for two colors', () => {
      expect(computeSwatchLabels(['#f00', '#0f0'])).toEqual(['A', 'B']);
    });
    it('returns empty for non-array', () => {
      expect(computeSwatchLabels(null)).toEqual([]);
    });
  });

  describe('applyPaletteToMeta', () => {
    it('returns meta with colorPalette and swatchLabels updated', () => {
      const meta = { cachedFilePath: '/x.jpeg' };
      expect(applyPaletteToMeta(meta, ['#aaa'])).toEqual({
        cachedFilePath: '/x.jpeg',
        colorPalette: ['#aaa'],
        swatchLabels: ['A'],
      });
    });
    it('returns meta unchanged when meta is null', () => {
      expect(applyPaletteToMeta(null, ['#aaa'])).toBe(null);
    });
  });

  describe('applyPaletteToImages', () => {
    it('returns empty array when images is null', () => {
      expect(applyPaletteToImages(null, 'x.jpeg', ['#aaa'])).toEqual([]);
    });
    it('updates only matching image with palette and swatchLabels', () => {
      const images = [
        { cachedFilePath: '/a.jpeg' },
        { cachedFilePath: '/b.jpeg' },
      ];
      const result = applyPaletteToImages(images, 'b.jpeg', ['#ff0000']);
      expect(result[0]).toBe(images[0]);
      expect(result[1]).toEqual({
        cachedFilePath: '/b.jpeg',
        colorPalette: ['#ff0000'],
        swatchLabels: ['A'],
      });
    });
  });

  describe('normalizeMetaPaletteRegion', () => {
    it('returns meta unchanged when paletteRegion exists', () => {
      const meta = { paletteRegion: [{ x: 1, y: 1 }] };
      expect(normalizeMetaPaletteRegion(meta)).toBe(meta);
    });
    it('adds paletteRegion from legacy key when missing', () => {
      const meta = { clusterMarkers: [{ hex: '#fff', x: 0, y: 0 }] };
      const result = normalizeMetaPaletteRegion(meta);
      expect(result.paletteRegion).toEqual([{ hex: '#fff', x: 0, y: 0 }]);
    });
    it('returns empty array when legacy key missing', () => {
      const meta = { cachedFilePath: '/x.jpeg' };
      const result = normalizeMetaPaletteRegion(meta);
      expect(result.paletteRegion).toEqual([]);
    });
  });

  describe('computeRegionLabels', () => {
    it('returns 00,01,02 for three regions', () => {
      expect(computeRegionLabels([[], [], []])).toEqual(['00', '01', '02']);
    });
    it('returns empty for non-array', () => {
      expect(computeRegionLabels(null)).toEqual([]);
    });
  });

  describe('applyRegionsToMeta', () => {
    it('returns meta with regions and regionLabels updated', () => {
      const meta = { cachedFilePath: '/x.jpeg' };
      expect(applyRegionsToMeta(meta, [[0, 0], [1, 1]])).toEqual({
        cachedFilePath: '/x.jpeg',
        regions: [[0, 0], [1, 1]],
        regionLabels: ['00', '01'],
      });
    });
    it('returns null when meta is null', () => {
      expect(applyRegionsToMeta(null, [[0, 0]])).toBe(null);
    });
  });

  describe('applyPaletteNameToImages', () => {
    it('returns empty array when images is null', () => {
      expect(applyPaletteNameToImages(null, 'x.jpeg', 'name')).toEqual([]);
    });
    it('updates only matching image paletteName', () => {
      const images = [
        { cachedFilePath: '/a.jpeg', paletteName: 'A' },
        { cachedFilePath: '/b.jpeg', paletteName: 'B' },
      ];
      const result = applyPaletteNameToImages(images, 'b.jpeg', '  NewB  ');
      expect(result[0]).toBe(images[0]);
      expect(result[1]).toEqual({ cachedFilePath: '/b.jpeg', paletteName: 'NewB' });
    });
  });
});
