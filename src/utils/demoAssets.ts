/**
 * Compatibility helpers for bundled fictional demo photography.
 *
 * The public demo asset filenames intentionally remain stable, but a previous
 * deployment served invalid image bytes at the same URLs. Versioning the
 * browser request prevents stale browser/CDN entries from surviving after the
 * corrected PNGs are deployed.
 */

export const DEMO_ASSET_CACHE_VERSION = '20260821-3';

const DEMO_PATH_PREFIX = '/demo/';
const URL_BASE = 'https://deedforge.local';

export function resolveDemoAssetUrl(url?: string | null): string | undefined {
  if (!url) return undefined;

  try {
    const absoluteInput = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(url) || url.startsWith('//');
    const parsed = new URL(url, URL_BASE);

    if (!parsed.pathname.startsWith(DEMO_PATH_PREFIX)) {
      return url;
    }

    parsed.searchParams.set('dfv', DEMO_ASSET_CACHE_VERSION);

    if (absoluteInput) {
      return parsed.toString();
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return url;
  }
}

export function normalizeDemoAssetReferences<T>(value: T): T {
  if (typeof value === 'string') {
    return (resolveDemoAssetUrl(value) || value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeDemoAssetReferences(item)) as T;
  }

  if (value && typeof value === 'object') {
    const normalized: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
      normalized[key] = normalizeDemoAssetReferences(nestedValue);
    }
    return normalized as T;
  }

  return value;
}

/**
 * Last-resort browser compatibility layer.
 *
 * It runs before React mounts and rewrites only same-app `/demo/*` image
 * sources. Real client uploads, signed Supabase URLs, and external photography
 * are never touched.
 */
export function installDemoAssetVersionObserver(): () => void {
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') {
    return () => undefined;
  }

  const rewriteImage = (image: HTMLImageElement) => {
    const current = image.getAttribute('src');
    if (!current) return;

    const next = resolveDemoAssetUrl(current);
    if (next && next !== current) {
      image.setAttribute('src', next);
    }
  };

  const rewriteNode = (node: Node) => {
    if (!(node instanceof Element)) return;

    if (node instanceof HTMLImageElement) {
      rewriteImage(node);
    }

    node.querySelectorAll('img[src]').forEach((image) => {
      rewriteImage(image as HTMLImageElement);
    });
  };

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes' && mutation.target instanceof HTMLImageElement) {
        rewriteImage(mutation.target);
      }

      mutation.addedNodes.forEach(rewriteNode);
    }
  });

  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['src'],
  });

  document.querySelectorAll('img[src]').forEach((image) => rewriteImage(image as HTMLImageElement));

  return () => observer.disconnect();
}
