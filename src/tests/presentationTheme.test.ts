import { describe, it, expect } from 'vitest';
import { mapBrandKitToPresentationTheme, themeToCssVariables } from '../features/presentations/themes/presentationTheme';
import { BrandKit, DEFAULT_BRAND_KIT } from '../types/brandKit';

describe('presentationTheme (Brand Kit Mapping & CSS Scoping)', () => {
  it('maps BrandKit colors and typography to dark PresentationTheme', () => {
    const theme = mapBrandKitToPresentationTheme(DEFAULT_BRAND_KIT, 'dark');

    expect(theme.colorScheme).toBe('dark');
    expect(theme.primary).toBe(DEFAULT_BRAND_KIT.colors.accent);
    expect(theme.fontHead).toContain(DEFAULT_BRAND_KIT.typography.headlineFont);
    expect(theme.fontBody).toContain(DEFAULT_BRAND_KIT.typography.bodyFont);
    expect(theme.bg).toBe(DEFAULT_BRAND_KIT.colors.backgroundDark);
    expect(theme.fg).toBe('#f8fafc');
  });

  it('maps BrandKit colors and typography to light PresentationTheme', () => {
    const theme = mapBrandKitToPresentationTheme(DEFAULT_BRAND_KIT, 'light');

    expect(theme.colorScheme).toBe('light');
    expect(theme.bg).toBe(DEFAULT_BRAND_KIT.colors.backgroundLight);
    expect(theme.fg).toBe('#0f172a');
  });

  it('generates valid scoped CSS variables object without global pollution', () => {
    const customBrandKit: BrandKit = {
      ...DEFAULT_BRAND_KIT,
      colors: {
        ...DEFAULT_BRAND_KIT.colors,
        accent: '#e11d48',
      },
    };

    const theme = mapBrandKitToPresentationTheme(customBrandKit, 'dark');
    const cssVars = themeToCssVariables(theme) as Record<string, string | undefined>;

    expect(cssVars['--primary']).toBe('#e11d48');
    expect(cssVars['--bg']).toBe(DEFAULT_BRAND_KIT.colors.backgroundDark);
    expect(cssVars['--radius']).toBe('18px');
    expect(cssVars['--font-head']).toContain(customBrandKit.typography.headlineFont);
  });
});
