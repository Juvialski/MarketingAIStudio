/**
 * A private Storage URL is valid for the anonymous response only when the
 * current request produced a fresh signed URL. The previous snapshot URL is
 * intentionally ignored on failure.
 */
export function resolvePrivateAssetUrl(_previousUrl, freshSignedUrl) {
  return typeof freshSignedUrl === 'string' && freshSignedUrl.trim() ? freshSignedUrl : '';
}
