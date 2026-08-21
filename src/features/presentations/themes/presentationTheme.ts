import type { CSSProperties } from 'react';
import { BrandKit, DEFAULT_BRAND_KIT } from '../../../types/brandKit';
import { PresentationTheme } from '../../../types/presentation';

const SAFE_SERIF_STACK = "'Playfair Display', Georgia, Cambria, 'Times New Roman', serif";
const SAFE_SANS_STACK = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const SAFE_MONO_STACK = "'JetBrains Mono', 'SFMono-Regular', Menlo, Monaco, Consolas, monospace";

export function mapBrandKitToPresentationTheme(
  brandKit: BrandKit = DEFAULT_BRAND_KIT,
  mode: 'dark' | 'light' = 'dark'
): PresentationTheme {
  const isDark = mode === 'dark';
  const colors = brandKit.colors || DEFAULT_BRAND_KIT.colors;
  const typo = brandKit.typography || DEFAULT_BRAND_KIT.typography;

  const primaryAccent = colors.accent || '#c85a32';
  const secondary = colors.secondary || '#1b3b2b';
  const darkBg = colors.backgroundDark || '#090e17';
  const lightBg = colors.backgroundLight || '#fcfaf7';

  // Format font stacks with fallbacks
  const headlineFont = typo.headlineFont
    ? `'${typo.headlineFont}', ${SAFE_SERIF_STACK}`
    : SAFE_SERIF_STACK;
  const bodyFont = typo.bodyFont
    ? `'${typo.bodyFont}', ${SAFE_SANS_STACK}`
    : SAFE_SANS_STACK;
  const monoFont = typo.monoFont
    ? `'${typo.monoFont}', ${SAFE_MONO_STACK}`
    : SAFE_MONO_STACK;

  // Build accent gradient
  const accentGradient = `linear-gradient(125deg, ${primaryAccent} 0%, ${secondary} 100%)`;

  if (isDark) {
    return {
      name: `${brandKit.companyName} (Dark Investment)`,
      colorScheme: 'dark',
      bg: darkBg,
      bgGrad1: 'rgba(200, 90, 50, 0.12)',
      bgGrad2: 'rgba(27, 59, 43, 0.18)',
      surface: 'rgba(255, 255, 255, 0.045)',
      surface2: 'rgba(255, 255, 255, 0.08)',
      fg: '#f8fafc',
      fgMuted: '#94a3b8',
      fgFaint: '#64748b',
      hair: 'rgba(255, 255, 255, 0.12)',
      hair2: 'rgba(255, 255, 255, 0.06)',
      primary: primaryAccent,
      accent: accentGradient,
      accentInk: '#060d13',
      radius: '18px',
      radiusSm: '10px',
      radiusLg: '24px',
      fontHead: headlineFont,
      fontBody: bodyFont,
      fontMono: monoFont,
    };
  }

  return {
    name: `${brandKit.companyName} (Light Editorial)`,
    colorScheme: 'light',
    bg: lightBg,
    bgGrad1: 'rgba(200, 90, 50, 0.08)',
    bgGrad2: 'rgba(27, 59, 43, 0.06)',
    surface: 'rgba(15, 23, 42, 0.03)',
    surface2: 'rgba(15, 23, 42, 0.06)',
    fg: '#0f172a',
    fgMuted: '#475569',
    fgFaint: '#94a3b8',
    hair: 'rgba(15, 23, 42, 0.12)',
    hair2: 'rgba(15, 23, 42, 0.06)',
    primary: primaryAccent,
    accent: accentGradient,
    accentInk: '#ffffff',
    radius: '18px',
    radiusSm: '10px',
    radiusLg: '24px',
    fontHead: headlineFont,
    fontBody: bodyFont,
    fontMono: monoFont,
  };
}

export function themeToCssVariables(theme: PresentationTheme): CSSProperties {
  return {
    '--bg': theme.bg,
    '--bg-grad-1': theme.bgGrad1,
    '--bg-grad-2': theme.bgGrad2,
    '--surface': theme.surface,
    '--surface-2': theme.surface2,
    '--fg': theme.fg,
    '--fg-muted': theme.fgMuted,
    '--fg-faint': theme.fgFaint,
    '--hair': theme.hair,
    '--hair-2': theme.hair2,
    '--primary': theme.primary,
    '--accent': theme.accent,
    '--accent-ink': theme.accentInk,
    '--radius': theme.radius,
    '--radius-sm': theme.radiusSm,
    '--radius-lg': theme.radiusLg,
    '--font-head': theme.fontHead,
    '--font-body': theme.fontBody,
    '--font-mono': theme.fontMono,
    '--color-scheme': theme.colorScheme,
  } as CSSProperties;
}
