import { describe, it, expect } from 'vitest';
import {
  calculateMaterialFitScale,
  getNativeDimensions,
  MIN_ZOOM,
  MAX_ZOOM,
  ZOOM_STEP,
} from '../components/review/MaterialPreviewViewport';
import { OutputAspectRatio } from '../types/campaign';

const ALL_FORMATS: OutputAspectRatio[] = [
  'square',
  'portrait',
  'story',
  'landscape',
  'flyer_letter',
  'flyer_a4',
];

describe('MaterialPreviewViewport Fit & Scale Engine', () => {
  describe('Canonical Native Dimensions', () => {
    it('returns exact declared native rendering dimensions for all formats', () => {
      expect(getNativeDimensions('square')).toEqual({ width: 1080, height: 1080 });
      expect(getNativeDimensions('portrait')).toEqual({ width: 1080, height: 1350 });
      expect(getNativeDimensions('story')).toEqual({ width: 1080, height: 1920 });
      expect(getNativeDimensions('landscape')).toEqual({ width: 1200, height: 630 });
      expect(getNativeDimensions('flyer_letter')).toEqual({ width: 1275, height: 1650 });
      expect(getNativeDimensions('flyer_a4')).toEqual({ width: 1240, height: 1754 });
    });
  });

  describe('calculateMaterialFitScale Dual-Axis Behavior', () => {
    it('fits Instagram Portrait 1080x1350 within laptop bounds (1200x550) constrained by height', () => {
      const { width: nw, height: nh } = getNativeDimensions('portrait');
      const availW = 1200;
      const availH = 550;

      const scale = calculateMaterialFitScale(availW, availH, nw, nh);
      // 550 / 1350 = ~0.4074
      expect(scale).toBeCloseTo(availH / nh, 5);

      const scaledW = nw * scale;
      const scaledH = nh * scale;

      expect(scaledW).toBeLessThanOrEqual(availW);
      expect(scaledH).toBeLessThanOrEqual(availH);
      expect(scaledH).toBeCloseTo(availH, 3);
    });

    it('fits Story 9:16 1080x1920 within laptop bounds (1200x600) strictly constrained by height', () => {
      const { width: nw, height: nh } = getNativeDimensions('story');
      const availW = 1200;
      const availH = 600;

      const scale = calculateMaterialFitScale(availW, availH, nw, nh);
      expect(scale).toBeCloseTo(availH / nh, 5);

      const scaledW = nw * scale;
      const scaledH = nh * scale;

      expect(scaledW).toBeLessThanOrEqual(availW);
      expect(scaledH).toBeLessThanOrEqual(availH);
      // Width should be much narrower than available width: 1080 * (600 / 1920) = 337.5px
      expect(scaledW).toBeCloseTo(337.5, 2);
    });

    it('fits Landscape 1200x630 within wide-short bounds (1000x700) constrained by width', () => {
      const { width: nw, height: nh } = getNativeDimensions('landscape');
      const availW = 1000;
      const availH = 700;

      const scale = calculateMaterialFitScale(availW, availH, nw, nh);
      // 1000 / 1200 = 0.8333...
      // 700 / 630 = 1.1111...
      // Bounded by width: 1000 / 1200
      expect(scale).toBeCloseTo(availW / nw, 5);

      const scaledW = nw * scale;
      const scaledH = nh * scale;

      expect(scaledW).toBeLessThanOrEqual(availW);
      expect(scaledH).toBeLessThanOrEqual(availH);
    });

    it('fits Printable US Letter (1275x1650) and A4 (1240x1754) within standard desktop viewport', () => {
      const availW = 1400;
      const availH = 750;

      for (const format of ['flyer_letter', 'flyer_a4'] as const) {
        const { width: nw, height: nh } = getNativeDimensions(format);
        const scale = calculateMaterialFitScale(availW, availH, nw, nh);

        const scaledW = nw * scale;
        const scaledH = nh * scale;

        expect(scaledW).toBeLessThanOrEqual(availW);
        expect(scaledH).toBeLessThanOrEqual(availH);
      }
    });

    it('guarantees scaled bounds never exceed available area for all formats across diverse viewports', () => {
      const viewports = [
        { name: 'Common Laptop (1366x768 screen, bounds 1100x500)', w: 1100, h: 500 },
        { name: '1080p Desktop (1920x1080 screen, bounds 1600x750)', w: 1600, h: 750 },
        { name: '2K QHD (2560x1440 screen, bounds 2200x1100)', w: 2200, h: 1100 },
        { name: '4K Display (3840x2160 screen, bounds 3200x1700)', w: 3200, h: 1700 },
        { name: 'Mobile Portrait (390x844 screen, bounds 340x550)', w: 340, h: 550 },
        { name: 'Tablet Portrait (768x1024 screen, bounds 680x750)', w: 680, h: 750 },
        { name: 'Tablet Landscape (1024x768 screen, bounds 900x550)', w: 900, h: 550 },
        { name: 'Ultrawide (3440x1440 screen, bounds 3000x1000)', w: 3000, h: 1000 },
      ];

      for (const vp of viewports) {
        for (const format of ALL_FORMATS) {
          const { width: nw, height: nh } = getNativeDimensions(format);
          const scale = calculateMaterialFitScale(vp.w, vp.h, nw, nh);

          const scaledW = nw * scale;
          const scaledH = nh * scale;

          expect(scaledW, `${format} width on ${vp.name}`).toBeLessThanOrEqual(vp.w + 0.001);
          expect(scaledH, `${format} height on ${vp.name}`).toBeLessThanOrEqual(vp.h + 0.001);

          // Aspect ratio must be preserved exactly
          const originalAspect = nw / nh;
          const renderedAspect = scaledW / scaledH;
          expect(renderedAspect, `${format} aspect ratio on ${vp.name}`).toBeCloseTo(originalAspect, 5);
        }
      }
    });

    it('accounts for container padding safely', () => {
      const { width: nw, height: nh } = getNativeDimensions('square');
      const availW = 600;
      const availH = 600;
      const padding = 20;

      const scale = calculateMaterialFitScale(availW, availH, nw, nh, padding);
      // Usable: 560 x 560 -> scale = 560 / 1080
      expect(scale).toBeCloseTo(560 / 1080, 5);
      expect(nw * scale).toBeCloseTo(560, 3);
    });

    it('handles zero or negative dimensions safely without throwing or NaN', () => {
      expect(calculateMaterialFitScale(0, 0, 1080, 1080)).toBe(1);
      expect(calculateMaterialFitScale(-500, 400, 1080, 1080)).toBe(1);
      expect(calculateMaterialFitScale(500, -400, 1080, 1080)).toBe(1);
      expect(calculateMaterialFitScale(500, 500, 0, 0)).toBe(1);
    });
  });

  describe('Zoom Configuration & Limits', () => {
    it('defines sensible zoom limits and step increments', () => {
      expect(MIN_ZOOM).toBe(0.25);
      expect(MAX_ZOOM).toBe(3.0);
      expect(ZOOM_STEP).toBe(0.15);
    });
  });
});
