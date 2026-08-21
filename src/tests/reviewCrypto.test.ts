import { describe, it, expect } from 'vitest';
import { generateSecureReviewToken, hashReviewToken } from '../services/review/reviewCrypto';

describe('Review Cryptographic Engine', () => {
  it('should generate 256-bit opaque tokens with secure prefix and length', () => {
    const token = generateSecureReviewToken();
    expect(token).toMatch(/^rev_[0-9a-f]{64}$/);
    expect(token.length).toBe(68); // 'rev_' (4) + 64 hex chars
  });

  it('should generate unique tokens across consecutive calls', () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 50; i++) {
      tokens.add(generateSecureReviewToken());
    }
    expect(tokens.size).toBe(50);
  });

  it('should compute deterministic SHA-256 hash', async () => {
    const testToken = 'rev_abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';
    const hash1 = await hashReviewToken(testToken);
    const hash2 = await hashReviewToken(testToken);
    
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[0-9a-f]{64}$/);
  });

  it('should produce distinct hashes for different tokens', async () => {
    const tokenA = generateSecureReviewToken();
    const tokenB = generateSecureReviewToken();

    const hashA = await hashReviewToken(tokenA);
    const hashB = await hashReviewToken(tokenB);

    expect(hashA).not.toBe(hashB);
  });

  it('should fail closed if crypto.getRandomValues is unavailable', () => {
    const originalCrypto = globalThis.crypto;
    try {
      // Temporarily remove getRandomValues
      Object.defineProperty(globalThis, 'crypto', {
        value: { getRandomValues: undefined },
        configurable: true,
        writable: true,
      });

      expect(() => generateSecureReviewToken()).toThrow(
        /Cryptographically secure RNG \(crypto\.getRandomValues\) is required/
      );
    } finally {
      Object.defineProperty(globalThis, 'crypto', {
        value: originalCrypto,
        configurable: true,
        writable: true,
      });
    }
  });

  it('should fail closed if crypto is completely undefined', () => {
    const originalCrypto = globalThis.crypto;
    try {
      Object.defineProperty(globalThis, 'crypto', {
        value: undefined,
        configurable: true,
        writable: true,
      });

      expect(() => generateSecureReviewToken()).toThrow(
        /Cryptographically secure RNG \(crypto\.getRandomValues\) is required/
      );
    } finally {
      Object.defineProperty(globalThis, 'crypto', {
        value: originalCrypto,
        configurable: true,
        writable: true,
      });
    }
  });
});
