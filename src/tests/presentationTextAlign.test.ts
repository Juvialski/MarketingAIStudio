import { describe, it, expect } from 'vitest';
import {
  resolveTitleAlign,
  resolveBodyAlign,
  getTitleAlignStyle,
  getBodyAlignStyle,
} from '../features/presentations/utils/resolveTextAlign';
import { presentationDeckSchema } from '../features/presentations/schemas/presentationSchema';
import { PresentationDeck } from '../types/presentation';
import { DEFAULT_BRAND_KIT } from '../types/brandKit';
import { mapBrandKitToPresentationTheme } from '../features/presentations/themes/presentationTheme';

describe('Presentation Text Alignment System', () => {
  const validTheme = mapBrandKitToPresentationTheme(DEFAULT_BRAND_KIT, 'dark');

  describe('Alignment Resolvers', () => {
    it('returns template fallback when no textStyle is provided', () => {
      expect(resolveTitleAlign(undefined, 'center')).toBe('center');
      expect(resolveTitleAlign(undefined, 'left')).toBe('left');
      expect(resolveBodyAlign(undefined, 'center')).toBe('center');
      expect(resolveBodyAlign(undefined, 'left')).toBe('left');
    });

    it('returns override value when textStyle is specified', () => {
      expect(resolveTitleAlign({ titleAlign: 'left' }, 'center')).toBe('left');
      expect(resolveTitleAlign({ titleAlign: 'right' }, 'center')).toBe('right');
      expect(resolveBodyAlign({ bodyAlign: 'justify' }, 'center')).toBe('justify');
      expect(resolveBodyAlign({ bodyAlign: 'right' }, 'left')).toBe('right');
    });

    it('generates correct CSS margin and textAlign styles for titles', () => {
      const leftStyle = getTitleAlignStyle('left');
      expect(leftStyle.textAlign).toBe('left');
      expect(leftStyle.marginInline).toBe('0 auto 0 0');

      const centerStyle = getTitleAlignStyle('center');
      expect(centerStyle.textAlign).toBe('center');
      expect(centerStyle.marginInline).toBe('auto');

      const rightStyle = getTitleAlignStyle('right');
      expect(rightStyle.textAlign).toBe('right');
      expect(rightStyle.marginInline).toBe('0 0 0 auto');
    });

    it('generates correct CSS margin and textAlign styles for body', () => {
      const leftStyle = getBodyAlignStyle('left');
      expect(leftStyle.textAlign).toBe('left');
      expect(leftStyle.marginInline).toBe('0 auto 0 0');

      const justifyStyle = getBodyAlignStyle('justify');
      expect(justifyStyle.textAlign).toBe('justify');

      const rightStyle = getBodyAlignStyle('right');
      expect(rightStyle.textAlign).toBe('right');
      expect(rightStyle.marginInline).toBe('0 0 0 auto');
    });
  });

  describe('Schema Validation with Alignment Overrides', () => {
    it('validates a complete presentation deck with custom slide textStyle', () => {
      const sampleDeck: PresentationDeck = {
        schemaVersion: '1.0.0',
        id: 'deck-123',
        campaignId: 'camp-123',
        title: 'Executive Presentation',
        theme: validTheme,
        generatedAt: new Date().toISOString(),
        slides: [
          {
            id: 's-1',
            type: 'cover',
            title: 'Downtown Core Multifamily',
            subtitle: 'Investment Memorandum',
            kicker: 'Exclusive Offering',
            foot: 'Confidential',
            textStyle: {
              titleAlign: 'left',
            },
          },
          {
            id: 's-2',
            type: 'executive_summary',
            title: 'Executive Highlights',
            summary: 'Prime value-add opportunity with high upside potential.',
            highlights: ['100% Occupied', 'Value-add Upside'],
            textStyle: {
              titleAlign: 'right',
              bodyAlign: 'justify',
            },
          },
        ],
      };

      const result = presentationDeckSchema.safeParse(sampleDeck);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.slides[0].textStyle?.titleAlign).toBe('left');
        expect(result.data.slides[1].textStyle?.bodyAlign).toBe('justify');
      }
    });

    it('rejects invalid title alignment values', () => {
      const invalidDeck = {
        schemaVersion: '1.0.0',
        id: 'deck-123',
        campaignId: 'camp-123',
        title: 'Executive Presentation',
        theme: validTheme,
        generatedAt: new Date().toISOString(),
        slides: [
          {
            id: 's-1',
            type: 'cover',
            title: 'Downtown Core Multifamily',
            textStyle: {
              // 'justify' is not allowed on titles
              titleAlign: 'justify',
            },
          },
        ],
      };

      const result = presentationDeckSchema.safeParse(invalidDeck);
      expect(result.success).toBe(false);
    });
  });
});
