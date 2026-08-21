/**
 * Universal Asset Resolution & Hydration Layer
 *
 * Responsibilities:
 * - Differentiate permanent asset identity (bucket, path, assetId) from temporary runtime URLs.
 * - Recover canonical object identity from legacy Supabase signed/public URLs regardless of token expiration.
 * - Hydrate fresh signed URLs for campaigns, brand kits, presentations, and review packages.
 * - Prevent transient URLs (blob:, data:image/, expiring signed URLs) from being stored as canonical records.
 */

import { Campaign, CampaignImage } from '../../types/campaign';
import { BrandKit } from '../../types/brandKit';
import { PresentationSlide } from '../../types/presentation';
import { StorageBucket, StorageService } from './storageService';
import { resolveDemoAssetUrl } from '../../utils/demoAssets';
import { isSupabaseConfigured } from './client';

export interface PersistentAssetRef {
  assetId?: string;
  storageBucket?: string;
  storagePath?: string;
  url?: string;
  mimeType?: string;
  provenance?: 'generated' | 'uploaded' | 'fixture' | 'fallback' | 'failed';
}

const VALID_BUCKETS = new Set<StorageBucket>([
  'property-media',
  'brand-assets',
  'campaign-assets',
  'campaign-exports',
]);

/**
 * Extracts storage bucket and object path from a Supabase storage URL.
 * Supports signed, public, and authenticated URLs across standard & image render endpoints.
 */
export function parseSupabaseStorageUrl(
  url?: string | null
): { bucket: StorageBucket; path: string } | null {
  if (!url || typeof url !== 'string') return null;

  try {
    // Matches patterns like /storage/v1/object/sign/bucket/path or /storage/v1/object/public/bucket/path
    const regex = /\/storage\/v1\/(?:object|render\/image)\/(?:sign|public|authenticated)\/([^/?#]+)\/([^?#]+)/;
    const match = url.match(regex);
    if (!match) return null;

    const rawBucket = decodeURIComponent(match[1]) as StorageBucket;
    const rawPath = decodeURIComponent(match[2]);

    if (VALID_BUCKETS.has(rawBucket) && rawPath && rawPath.trim() !== '') {
      return {
        bucket: rawBucket,
        path: rawPath.trim(),
      };
    }
  } catch {
    // Ignore URL parse error
  }

  return null;
}

/**
 * Checks whether a given URL is a transient browser-local or signed token URL.
 */
export function isTransientUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  if (url.startsWith('blob:')) return true;
  if (url.startsWith('data:image/')) return true;
  if (url.includes('/storage/v1/object/sign/') && url.includes('token=')) return true;
  if (url.includes('/storage/v1/render/image/sign/') && url.includes('token=')) return true;
  return false;
}

/**
 * Resolves a persistent asset reference or URL to a fresh runtime delivery URL.
 */
export async function resolveAssetUrl(
  ref: PersistentAssetRef,
  expiresInSeconds = 3600
): Promise<string> {
  // 1. If explicit canonical bucket and path are available, generate a fresh signed URL
  if (ref.storageBucket && ref.storagePath && VALID_BUCKETS.has(ref.storageBucket as StorageBucket)) {
    try {
      return await StorageService.getSignedUrl(
        ref.storageBucket as StorageBucket,
        ref.storagePath,
        expiresInSeconds
      );
    } catch {
      return ref.url || '';
    }
  }

  // 2. If an existing URL is a Supabase Storage URL (even with an expired signed token), recover bucket/path
  const parsed = parseSupabaseStorageUrl(ref.url);
  if (parsed) {
    try {
      return await StorageService.getSignedUrl(
        parsed.bucket,
        parsed.path,
        expiresInSeconds
      );
    } catch {
      return ref.url || '';
    }
  }

  // 3. Static bundled fixture assets
  if (ref.url && ref.url.startsWith('/demo/')) {
    return resolveDemoAssetUrl(ref.url) || ref.url;
  }

  // 4. Stable external HTTP/HTTPS images (e.g. Unsplash)
  if (ref.url && (ref.url.startsWith('http://') || ref.url.startsWith('https://'))) {
    return ref.url;
  }

  // 5. Ephemeral object / blob URLs (demo mode only)
  if (ref.url && (ref.url.startsWith('blob:') || ref.url.startsWith('data:image/'))) {
    if (!isSupabaseConfigured()) {
      return ref.url;
    }
    return '';
  }

  return ref.url || '';
}

/**
 * Normalizes a CampaignImage ensuring storageBucket and storagePath are derived if present in the URL.
 */
export function normalizeCampaignImage(img: CampaignImage): CampaignImage {
  let bucket = img.storageBucket;
  let path = img.storagePath;

  if ((!bucket || !path) && img.url) {
    const parsed = parseSupabaseStorageUrl(img.url);
    if (parsed) {
      bucket = parsed.bucket;
      path = parsed.path;
    }
  }

  return {
    ...img,
    storageBucket: bucket,
    storagePath: path,
  };
}

/**
 * Hydrates all assets inside a Campaign (sourceData.uploadedImages and presentation slides) with fresh signed URLs.
 */
export async function hydrateCampaignAssets(campaign: Campaign): Promise<Campaign> {
  // 1. Hydrate uploaded images
  const uploadedImages = await Promise.all(
    campaign.sourceData.uploadedImages.map(async (image) => {
      const normalized = normalizeCampaignImage(image);
      const url = await resolveAssetUrl(normalized);
      return {
        ...normalized,
        url: url || normalized.url || '',
      };
    })
  );

  // 2. Hydrate presentation slides if present
  let presentation = campaign.presentation;
  if (presentation && presentation.slides) {
    const slides: PresentationSlide[] = await Promise.all(
      presentation.slides.map(async (slide) => {
        if (slide.type === 'cover') {
          let bucket = slide.storageBucket;
          let path = slide.storagePath;
          let matchedImg = slide.imageId
            ? uploadedImages.find((img) => img.id === slide.imageId || img.assetId === slide.imageId)
            : undefined;

          if (!matchedImg && !bucket && !path) {
            matchedImg = uploadedImages.find((img) => img.isHero) || uploadedImages[0];
          }

          if (matchedImg) {
            bucket = bucket || matchedImg.storageBucket;
            path = path || matchedImg.storagePath;
          }

          const resolvedUrl = await resolveAssetUrl({
            storageBucket: bucket,
            storagePath: path,
            url: matchedImg?.url || slide.imageUrl,
          });

          return {
            ...slide,
            storageBucket: bucket,
            storagePath: path,
            imageUrl: resolvedUrl || slide.imageUrl,
          };
        }

        if (slide.type === 'property_overview') {
          let bucket = slide.storageBucket;
          let path = slide.storagePath;
          let matchedImg = slide.imageId
            ? uploadedImages.find((img) => img.id === slide.imageId || img.assetId === slide.imageId)
            : undefined;

          if (!matchedImg && !bucket && !path) {
            matchedImg = uploadedImages[0];
          }

          if (matchedImg) {
            bucket = bucket || matchedImg.storageBucket;
            path = path || matchedImg.storagePath;
          }

          const resolvedUrl = await resolveAssetUrl({
            storageBucket: bucket,
            storagePath: path,
            url: matchedImg?.url || slide.imageUrl,
          });

          return {
            ...slide,
            storageBucket: bucket,
            storagePath: path,
            imageUrl: resolvedUrl || slide.imageUrl,
          };
        }

        if (slide.type === 'gallery' && slide.items) {
          const items = await Promise.all(
            slide.items.map(async (item) => {
              let bucket = item.storageBucket;
              let path = item.storagePath;
              let matchedImg = item.imageId
                ? uploadedImages.find((img) => img.id === item.imageId || img.assetId === item.imageId)
                : undefined;

              if (matchedImg) {
                bucket = bucket || matchedImg.storageBucket;
                path = path || matchedImg.storagePath;
              }

              const resolvedUrl = await resolveAssetUrl({
                storageBucket: bucket,
                storagePath: path,
                url: matchedImg?.url || item.imageUrl,
              });

              return {
                ...item,
                storageBucket: bucket,
                storagePath: path,
                imageUrl: resolvedUrl || item.imageUrl || '',
              };
            })
          );

          return {
            ...slide,
            items,
          };
        }

        return slide;
      })
    );

    presentation = {
      ...presentation,
      slides,
    };
  }

  return {
    ...campaign,
    sourceData: {
      ...campaign.sourceData,
      uploadedImages,
    },
    presentation,
  };
}

/**
 * Hydrates logoUrl and logoDarkUrl on a BrandKit from canonical storage fields or recoverable URLs.
 */
export async function hydrateBrandKitAssets(brandKit: BrandKit): Promise<BrandKit> {
  let logoBucket = brandKit.logoStorageBucket;
  let logoPath = brandKit.logoStoragePath;
  if ((!logoBucket || !logoPath) && brandKit.logoUrl) {
    const parsed = parseSupabaseStorageUrl(brandKit.logoUrl);
    if (parsed) {
      logoBucket = parsed.bucket;
      logoPath = parsed.path;
    }
  }

  let logoDarkBucket = brandKit.logoDarkStorageBucket;
  let logoDarkPath = brandKit.logoDarkStoragePath;
  if ((!logoDarkBucket || !logoDarkPath) && brandKit.logoDarkUrl) {
    const parsed = parseSupabaseStorageUrl(brandKit.logoDarkUrl);
    if (parsed) {
      logoDarkBucket = parsed.bucket;
      logoDarkPath = parsed.path;
    }
  }

  const [logoUrl, logoDarkUrl] = await Promise.all([
    resolveAssetUrl({
      storageBucket: logoBucket,
      storagePath: logoPath,
      url: brandKit.logoUrl,
    }),
    resolveAssetUrl({
      storageBucket: logoDarkBucket,
      storagePath: logoDarkPath,
      url: brandKit.logoDarkUrl,
    }),
  ]);

  return {
    ...brandKit,
    logoStorageBucket: logoBucket,
    logoStoragePath: logoPath,
    logoDarkStorageBucket: logoDarkBucket,
    logoDarkStoragePath: logoDarkPath,
    logoUrl: logoUrl || brandKit.logoUrl,
    logoDarkUrl: logoDarkUrl || brandKit.logoDarkUrl,
  };
}

/**
 * Cleans transient / expired signed URLs from a Campaign payload before writing to the database.
 */
export function sanitizeCampaignForPersistence(campaign: Campaign): Campaign {
  const uploadedImages = campaign.sourceData.uploadedImages.map((img) => {
    const normalized = normalizeCampaignImage(img);
    // In live mode with bucket & path, clear ephemeral token queries from url
    let safeUrl = normalized.url;
    if (normalized.storageBucket && normalized.storagePath && isTransientUrl(safeUrl)) {
      // Store a clean path placeholder or empty string; runtime hydration will provide fresh signed URLs
      safeUrl = '';
    }
    return {
      ...normalized,
      url: safeUrl,
    };
  });

  return {
    ...campaign,
    sourceData: {
      ...campaign.sourceData,
      uploadedImages,
    },
  };
}

/**
 * Cleans transient / expired signed URLs from BrandKit before writing to the database.
 */
export function sanitizeBrandKitForPersistence(brandKit: BrandKit): BrandKit {
  let logoBucket = brandKit.logoStorageBucket;
  let logoPath = brandKit.logoStoragePath;
  if ((!logoBucket || !logoPath) && brandKit.logoUrl) {
    const parsed = parseSupabaseStorageUrl(brandKit.logoUrl);
    if (parsed) {
      logoBucket = parsed.bucket;
      logoPath = parsed.path;
    }
  }

  let logoDarkBucket = brandKit.logoDarkStorageBucket;
  let logoDarkPath = brandKit.logoDarkStoragePath;
  if ((!logoDarkBucket || !logoDarkPath) && brandKit.logoDarkUrl) {
    const parsed = parseSupabaseStorageUrl(brandKit.logoDarkUrl);
    if (parsed) {
      logoDarkBucket = parsed.bucket;
      logoDarkPath = parsed.path;
    }
  }

  return {
    ...brandKit,
    logoStorageBucket: logoBucket,
    logoStoragePath: logoPath,
    logoDarkStorageBucket: logoDarkBucket,
    logoDarkStoragePath: logoDarkPath,
    logoUrl: logoBucket && logoPath ? '' : brandKit.logoUrl,
    logoDarkUrl: logoDarkBucket && logoDarkPath ? '' : brandKit.logoDarkUrl,
  };
}
