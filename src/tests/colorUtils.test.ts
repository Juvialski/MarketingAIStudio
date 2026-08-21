import { describe, it, expect } from 'vitest';
import { isValidHex, normalizeHex } from '../utils/colorUtils';

describe('Color Utilities - isValidHex & normalizeHex', () => {
  it('identifies valid 6-digit hex color codes with and without hash', () => {
    expect(isValidHex('#0f172a')).toBe(true);
    expect(isValidHex('#1b3b2b')).toBe(true);
    expect(isValidHex('#c85a32')).toBe(true);
    expect(isValidHex('#fdfbf7')).toBe(true);
    expect(isValidHex('#0a1128')).toBe(true);
    expect(isValidHex('0f172a')).toBe(true);
    expect(isValidHex('#FFFFFF')).toBe(true);
  });

  it('identifies valid 3-digit shorthand hex colors', () => {
    expect(isValidHex('#FFF')).toBe(true);
    expect(isValidHex('#fff')).toBe(true);
    expect(isValidHex('#abc')).toBe(true);
    expect(isValidHex('123')).toBe(true);
  });

  it('identifies invalid hex strings and prevents them from corrupting color state', () => {
    expect(isValidHex('#')).toBe(false);
    expect(isValidHex('#0')).toBe(false);
    expect(isValidHex('#0f')).toBe(false);
    expect(isValidHex('#0f172')).toBe(false);
    expect(isValidHex('#0f172a9')).toBe(false);
    expect(isValidHex('blue')).toBe(false);
    expect(isValidHex('rgb(0,0,0)')).toBe(false);
    expect(isValidHex('')).toBe(false);
    expect(isValidHex(null as unknown as string)).toBe(false);
    expect(isValidHex(undefined as unknown as string)).toBe(false);
    expect(isValidHex('#xyz123')).toBe(false);
  });

  it('normalizes 6-digit hex codes to lowercase #rrggbb format', () => {
    expect(normalizeHex('#0F172A')).toBe('#0f172a');
    expect(normalizeHex('0f172a')).toBe('#0f172a');
    expect(normalizeHex('#FFFFFF')).toBe('#ffffff');
    expect(normalizeHex('C85A32')).toBe('#c85a32');
  });

  it('expands 3-digit shorthand hex codes to 6-digit canonical format', () => {
    expect(normalizeHex('#FFF')).toBe('#ffffff');
    expect(normalizeHex('#abc')).toBe('#aabbcc');
    expect(normalizeHex('123')).toBe('#112233');
    expect(normalizeHex('#000')).toBe('#000000');
  });

  it('returns fallback color when given invalid hex input', () => {
    expect(normalizeHex('#invalid', '#0f172a')).toBe('#0f172a');
    expect(normalizeHex('', '#0f172a')).toBe('#0f172a');
    expect(normalizeHex('#12', '#0f172a')).toBe('#0f172a');
  });
});
