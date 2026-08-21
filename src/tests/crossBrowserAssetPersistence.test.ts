import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  parseSupabaseStorageUrl, 
  isTransientUrl, 
  resolveAssetUrl, 
  hydrateCampaignAssets, 
  hydrateBrandKitAssets,
  sanitizeCampaignForPersistence,
  sanitizeBrandKitForPersistence
} from '../services/supabase/assetResolver';
import { Campaign } from '../types/campaign';
import { BrandKit, DEFAULT_BRAND_KIT } from '../types/brandKit';
import { mapBrandKitToPresentationTheme } from '../features/presentations/themes/presentationTheme';
import { buildReviewSnapshot } from '../services/review/reviewSnapshotBuilder';
import { StorageService } from '../services/supabase/storageService';
import { SAMPLE_CAMPAIGNS } from '../data/sampleCampaigns';

describe('Cross-Browser & Multi-Device Asset Persistence Engine', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Legacy & Expired Supabase URL Recovery', () => {
    it('accurately parses bucket and path from expired signed URLs', () => {
      const expiredUrl = 'https://proj123.supabase.co/storage/v1/object/sign/property-media/org-abc/camp-xyz/exterior-photo.jpg?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.expired';
      const parsed = parseSupabaseStorageUrl(expiredUrl);

      expect(parsed).not.toBeNull();
      expect(parsed?.bucket).toBe('property-media');
      expect(parsed?.path).toBe('org-abc/camp-xyz/exterior-photo.jpg');
    });

    it('accurately parses bucket and path from image transform render URLs', () => {
      const renderUrl = 'https://proj123.supabase.co/storage/v1/render/image/sign/brand-assets/org-abc/logos/main-logo.png?token=token456&width=200';
      const parsed = parseSupabaseStorageUrl(renderUrl);

      expect(parsed).not.toBeNull();
      expect(parsed?.bucket).toBe('brand-assets');
      expect(parsed?.path).toBe('org-abc/logos/main-logo.png');
    });

    it('accurately parses public URLs for private migration recovery', () => {
      const publicUrl = 'https://proj123.supabase.co/storage/v1/object/public/campaign-assets/org-1/camp-1/generated-visual.png';
      const parsed = parseSupabaseStorageUrl(publicUrl);

      expect(parsed).not.toBeNull();
      expect(parsed?.bucket).toBe('campaign-assets');
      expect(parsed?.path).toBe('org-1/camp-1/generated-visual.png');
    });

    it('rejects invalid or non-storage URLs', () => {
      expect(parseSupabaseStorageUrl('https://images.unsplash.com/photo-123')).toBeNull();
      expect(parseSupabaseStorageUrl('/demo/fictional-property-exterior.png')).toBeNull();
      expect(parseSupabaseStorageUrl('blob:http://localhost:3000/uuid-123')).toBeNull();
      expect(parseSupabaseStorageUrl('')).toBeNull();
      expect(parseSupabaseStorageUrl(null)).toBeNull();
    });

    it('identifies transient browser-local or tokenized URLs', () => {
      expect(isTransientUrl('blob:http://localhost:3000/abc-123')).toBe(true);
      expect(isTransientUrl('data:image/png;base64,iVBORw0KGgo=')).toBe(true);
      expect(isTransientUrl('https://proj.supabase.co/storage/v1/object/sign/property-media/a/b/c.jpg?token=secret')).toBe(true);
      expect(isTransientUrl('/demo/fictional-property-exterior.png')).toBe(false);
      expect(isTransientUrl('https://images.unsplash.com/photo-123')).toBe(false);
    });
  });

  describe('2. Universal Asset Resolution & Self-Healing', () => {
    it('regenerates fresh signed URL when canonical bucket & path are provided', async () => {
      const spy = vi.spyOn(StorageService, 'getSignedUrl').mockResolvedValue('https://fresh-signed-url.com/image.jpg?token=fresh');

      const resolved = await resolveAssetUrl({
        storageBucket: 'property-media',
        storagePath: 'org-1/camp-1/photo.jpg',
      });

      expect(spy).toHaveBeenCalledWith('property-media', 'org-1/camp-1/photo.jpg', 3600);
      expect(resolved).toBe('https://fresh-signed-url.com/image.jpg?token=fresh');
    });

    it('self-heals expired legacy Supabase URL by recovering bucket/path and obtaining fresh signed URL', async () => {
      const spy = vi.spyOn(StorageService, 'getSignedUrl').mockResolvedValue('https://fresh-signed-url.com/healed.jpg?token=fresh-token');

      const staleUrl = 'https://proj.supabase.co/storage/v1/object/sign/campaign-assets/org-100/camp-200/ai-render.jpg?token=expired-30-days-ago';
      const resolved = await resolveAssetUrl({ url: staleUrl });

      expect(spy).toHaveBeenCalledWith('campaign-assets', 'org-100/camp-200/ai-render.jpg', 3600);
      expect(resolved).toBe('https://fresh-signed-url.com/healed.jpg?token=fresh-token');
    });

    it('resolves demo bundled fixtures with cache versioning', async () => {
      const demoUrl = '/demo/fictional-property-exterior.png';
      const resolved = await resolveAssetUrl({ url: demoUrl });

      expect(resolved).toContain('/demo/fictional-property-exterior.png');
      expect(resolved).toContain('dfv=');
    });

    it('preserves external CDN photography unmodified', async () => {
      const externalUrl = 'https://images.unsplash.com/photo-luxury-home';
      const resolved = await resolveAssetUrl({ url: externalUrl });

      expect(resolved).toBe(externalUrl);
    });
  });

  describe('3. Campaign Asset Hydration & Persistence Sanitization', () => {
    it('hydrates uploaded images and presentation slides with fresh signed URLs', async () => {
      vi.spyOn(StorageService, 'getSignedUrl').mockImplementation(async (bucket, path) => {
        return `https://signed.supabase.co/${bucket}/${path}?token=fresh`;
      });

      const campaign: Campaign = {
        ...SAMPLE_CAMPAIGNS[0],
        id: 'live-camp-1',
        sourceData: {
          ...SAMPLE_CAMPAIGNS[0].sourceData,
          uploadedImages: [
            {
              id: 'img-1',
              assetId: 'asset-uuid-1',
              url: 'https://proj.supabase.co/storage/v1/object/sign/property-media/org-1/live-camp-1/photo1.jpg?token=stale',
              name: 'Living Room',
              source: 'upload',
              aspectRatio: 1.5,
              isHero: true,
              storageBucket: 'property-media',
              storagePath: 'org-1/live-camp-1/photo1.jpg',
            },
          ],
        },
        presentation: {
          schemaVersion: '1.0.0',
          id: 'deck-1',
          campaignId: 'live-camp-1',
          title: 'Deck',
          generatedAt: new Date().toISOString(),
          theme: mapBrandKitToPresentationTheme(DEFAULT_BRAND_KIT, 'light'),
          slides: [
            {
              id: 'slide-1',
              type: 'cover',
              title: 'Cover Slide',
              imageId: 'img-1',
              storageBucket: 'property-media',
              storagePath: 'org-1/live-camp-1/photo1.jpg',
            },
            {
              id: 'slide-2',
              type: 'property_overview',
              title: 'Overview',
              address: '123 Main St',
              city: 'Phoenix',
              state: 'AZ',
              propertyType: 'single_family',
              highlights: ['Spacious'],
              imageId: 'img-1',
              storageBucket: 'property-media',
              storagePath: 'org-1/live-camp-1/photo1.jpg',
            },
          ],
        },
      };

      const hydrated = await hydrateCampaignAssets(campaign);

      expect(hydrated.sourceData.uploadedImages[0].url).toBe(
        'https://signed.supabase.co/property-media/org-1/live-camp-1/photo1.jpg?token=fresh'
      );

      const cover = hydrated.presentation?.slides[0] as any;
      expect(cover.imageUrl).toBe(
        'https://signed.supabase.co/property-media/org-1/live-camp-1/photo1.jpg?token=fresh'
      );

      const overview = hydrated.presentation?.slides[1] as any;
      expect(overview.imageUrl).toBe(
        'https://signed.supabase.co/property-media/org-1/live-camp-1/photo1.jpg?token=fresh'
      );
    });

    it('sanitizes transient token URLs before database persistence', () => {
      const campaign: Campaign = {
        ...SAMPLE_CAMPAIGNS[0],
        id: 'live-camp-persist',
        sourceData: {
          ...SAMPLE_CAMPAIGNS[0].sourceData,
          uploadedImages: [
            {
              id: 'img-1',
              assetId: 'asset-1',
              url: 'https://proj.supabase.co/storage/v1/object/sign/property-media/org-1/live-camp-persist/photo.jpg?token=expiring-token-1234',
              name: 'Exterior',
              source: 'upload',
              aspectRatio: 1.5,
              isHero: true,
              storageBucket: 'property-media',
              storagePath: 'org-1/live-camp-persist/photo.jpg',
            },
          ],
        },
      };

      const sanitized = sanitizeCampaignForPersistence(campaign);

      // Ensures ephemeral token is stripped from the persistent payload while preserving bucket & path
      expect(sanitized.sourceData.uploadedImages[0].url).toBe('');
      expect(sanitized.sourceData.uploadedImages[0].storageBucket).toBe('property-media');
      expect(sanitized.sourceData.uploadedImages[0].storagePath).toBe('org-1/live-camp-persist/photo.jpg');
    });
  });

  describe('4. Brand Kit Logo Storage & Hydration', () => {
    it('hydrates brand logos from canonical storage fields', async () => {
      vi.spyOn(StorageService, 'getSignedUrl').mockImplementation(async (bucket, path) => {
        return `https://signed.supabase.co/${bucket}/${path}?token=fresh-logo-token`;
      });

      const brandKit: BrandKit = {
        ...DEFAULT_BRAND_KIT,
        id: 'bk-1',
        logoStorageBucket: 'brand-assets',
        logoStoragePath: 'org-1/logos/logo.png',
        logoDarkStorageBucket: 'brand-assets',
        logoDarkStoragePath: 'org-1/logos/logo-dark.png',
      };

      const hydrated = await hydrateBrandKitAssets(brandKit);

      expect(hydrated.logoUrl).toBe('https://signed.supabase.co/brand-assets/org-1/logos/logo.png?token=fresh-logo-token');
      expect(hydrated.logoDarkUrl).toBe('https://signed.supabase.co/brand-assets/org-1/logos/logo-dark.png?token=fresh-logo-token');
    });

    it('sanitizes brand kit logos before database persistence', () => {
      const brandKit: BrandKit = {
        ...DEFAULT_BRAND_KIT,
        id: 'bk-save',
        logoUrl: 'https://proj.supabase.co/storage/v1/object/sign/brand-assets/org-1/logos/logo.png?token=temporary-token-xyz',
        logoDarkUrl: 'https://proj.supabase.co/storage/v1/object/sign/brand-assets/org-1/logos/logo-dark.png?token=temporary-token-abc',
      };

      const sanitized = sanitizeBrandKitForPersistence(brandKit);

      expect(sanitized.logoStorageBucket).toBe('brand-assets');
      expect(sanitized.logoStoragePath).toBe('org-1/logos/logo.png');
      expect(sanitized.logoDarkStorageBucket).toBe('brand-assets');
      expect(sanitized.logoDarkStoragePath).toBe('org-1/logos/logo-dark.png');
      expect(sanitized.logoUrl).toBe('');
      expect(sanitized.logoDarkUrl).toBe('');
    });
  });

  describe('5. Public Review Snapshot Canonical Asset References', () => {
    it('populates heroImageRef and brandKit logoRefs in immutable review snapshot', () => {
      const liveCampaign: Campaign = {
        ...SAMPLE_CAMPAIGNS[0],
        id: 'live-camp-review',
        sourceData: {
          ...SAMPLE_CAMPAIGNS[0].sourceData,
          uploadedImages: [
            {
              id: 'img-1',
              assetId: 'asset-hero-uuid',
              url: 'https://proj.supabase.co/storage/v1/object/sign/property-media/org-1/live-camp-review/hero.jpg?token=temp',
              name: 'Primary Hero',
              source: 'upload',
              aspectRatio: 1.5,
              isHero: true,
              storageBucket: 'property-media',
              storagePath: 'org-1/live-camp-review/hero.jpg',
            },
          ],
        },
      };

      const brandKit: BrandKit = {
        ...DEFAULT_BRAND_KIT,
        id: 'bk-review',
        logoStorageBucket: 'brand-assets',
        logoStoragePath: 'org-1/logos/brand-mark.png',
        logoDarkStorageBucket: 'brand-assets',
        logoDarkStoragePath: 'org-1/logos/brand-mark-dark.png',
      };

      const snapshot = buildReviewSnapshot(liveCampaign, brandKit);

      expect(snapshot.heroImageRef).toEqual({
        assetId: 'asset-hero-uuid',
        storageBucket: 'property-media',
        storagePath: 'org-1/live-camp-review/hero.jpg',
        mimeType: undefined,
      });

      expect(snapshot.brandKit.logoRef).toEqual({
        storageBucket: 'brand-assets',
        storagePath: 'org-1/logos/brand-mark.png',
      });

      expect(snapshot.brandKit.logoDarkRef).toEqual({
        storageBucket: 'brand-assets',
        storagePath: 'org-1/logos/brand-mark-dark.png',
      });
    });
  });
});
