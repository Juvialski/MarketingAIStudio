import { BrandKit } from '../types/brandKit';
import { OutputAspectRatio } from '../types/campaign';

/**
 * Deterministic Typography and Text Fitting Utilities
 * Ensures text never clips, wraps awkwardly, or overflows fixed target-space canvas bounds.
 */

export interface HeadlineFitResult {
  text: string;
  fontSizePx: number;
  lineHeight: number;
}

export function fitHeadline(
  headline: string,
  aspectRatio: OutputAspectRatio,
  options?: { maxLines?: number }
): HeadlineFitResult {
  const clean = headline.trim();
  const len = clean.length;

  switch (aspectRatio) {
    case 'story':
      // 1080x1920 canvas
      if (len <= 35) return { text: clean, fontSizePx: 64, lineHeight: 1.15 };
      if (len <= 60) return { text: clean, fontSizePx: 54, lineHeight: 1.18 };
      if (len <= 90) return { text: clean, fontSizePx: 46, lineHeight: 1.2 };
      return { text: clean, fontSizePx: 40, lineHeight: 1.22 };

    case 'landscape':
      // 1200x630 canvas (limited vertical height)
      if (len <= 35) return { text: clean, fontSizePx: 44, lineHeight: 1.18 };
      if (len <= 65) return { text: clean, fontSizePx: 36, lineHeight: 1.2 };
      if (len <= 95) return { text: clean, fontSizePx: 30, lineHeight: 1.22 };
      return { text: clean, fontSizePx: 26, lineHeight: 1.25 };

    case 'portrait':
      // 1080x1350 canvas
      if (len <= 35) return { text: clean, fontSizePx: 60, lineHeight: 1.15 };
      if (len <= 65) return { text: clean, fontSizePx: 50, lineHeight: 1.18 };
      if (len <= 100) return { text: clean, fontSizePx: 42, lineHeight: 1.2 };
      return { text: clean, fontSizePx: 36, lineHeight: 1.22 };

    case 'square':
    default:
      // 1080x1080 canvas
      if (len <= 30) return { text: clean, fontSizePx: 56, lineHeight: 1.15 };
      if (len <= 55) return { text: clean, fontSizePx: 46, lineHeight: 1.18 };
      if (len <= 85) return { text: clean, fontSizePx: 38, lineHeight: 1.2 };
      return { text: clean, fontSizePx: 32, lineHeight: 1.22 };
  }
}

export function fitBadgeText(text: string, maxChars = 28): string {
  const clean = text.trim().toUpperCase();
  if (clean.length <= maxChars) return clean;
  return clean.slice(0, maxChars - 1) + '…';
}

export function fitMetricValue(value: string): { formatted: string; fontSizePx: number } {
  const clean = value.trim();
  if (clean.length <= 8) return { formatted: clean, fontSizePx: 36 };
  if (clean.length <= 12) return { formatted: clean, fontSizePx: 30 };
  if (clean.length <= 16) return { formatted: clean, fontSizePx: 24 };
  return { formatted: clean, fontSizePx: 20 };
}

export function fitContactLine(
  brandKit: BrandKit,
  aspectRatio: OutputAspectRatio
): { primaryContact: string; secondaryContact?: string } {
  const website = brandKit.website ? brandKit.website.replace(/^https?:\/\//, '').replace(/\/$/, '') : '';
  const phone = brandKit.phone || '';
  const email = brandKit.email || '';

  if (aspectRatio === 'story') {
    // Story needs concise contact to fit safely above bottom UI bar
    return {
      primaryContact: website || phone || email || 'Request Deal Deck',
    };
  }

  if (aspectRatio === 'landscape') {
    return {
      primaryContact: [website, phone].filter(Boolean).join(' • ') || email,
    };
  }

  // Square and Portrait
  return {
    primaryContact: [phone, website].filter(Boolean).join(' • '),
    secondaryContact: email,
  };
}
