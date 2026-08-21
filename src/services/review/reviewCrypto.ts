/**
 * Cryptographic token generation and hashing for Shareable Campaign Review Links
 */

/**
 * Generates a cryptographically secure, opaque token with 256 bits of entropy.
 * Uses Web Crypto API (globalThis.crypto.getRandomValues).
 */
export function generateSecureReviewToken(): string {
  const cryptoObj = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (!cryptoObj || typeof cryptoObj.getRandomValues !== 'function') {
    throw new Error('Cryptographically secure RNG (crypto.getRandomValues) is required to generate review tokens.');
  }

  const bytes = new Uint8Array(32);
  cryptoObj.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `rev_${hex}`;
}

/**
 * Computes the SHA-256 hash of a string, returned as a lowercase hex string.
 * Works in browser, Node, and test environments. Fails closed if SHA-256 is unavailable.
 */
export async function hashReviewToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);

  if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle?.digest) {
    const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Node.js support if subtle is absent
  try {
    const nodeCrypto = await import('crypto');
    return nodeCrypto.createHash('sha256').update(token).digest('hex');
  } catch {
    throw new Error('Cryptographic SHA-256 digest capability is required to hash review tokens.');
  }
}
