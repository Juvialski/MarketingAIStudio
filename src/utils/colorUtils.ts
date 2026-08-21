/**
 * Color parsing, validation, and normalization utilities.
 */

const HEX_REGEX = /^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

/**
 * Validates whether an input string is a valid 3-digit or 6-digit hex color code.
 * Accepts with or without leading '#'.
 */
export function isValidHex(hex: string | undefined | null): boolean {
  if (!hex || typeof hex !== 'string') return false;
  return HEX_REGEX.test(hex.trim());
}

/**
 * Normalizes a hex color code to standard lowercase #rrggbb format.
 * If 3-digit hex (#rgb), expands to #rrggbb (#abc -> #aabbcc).
 * If valid hex without leading '#', prepends '#'.
 * Returns the canonical normalized hex string, or fallback if invalid.
 */
export function normalizeHex(hex: string, fallback = '#000000'): string {
  if (!isValidHex(hex)) return fallback;
  
  let clean = hex.trim();
  if (clean.startsWith('#')) {
    clean = clean.slice(1);
  }

  if (clean.length === 3) {
    clean = clean
      .split('')
      .map((char) => char + char)
      .join('');
  }

  return `#${clean.toLowerCase()}`;
}
