import { describe, expect, it } from 'vitest';
import {
  DEMO_ASSET_CACHE_VERSION,
  normalizeDemoAssetReferences,
  resolveDemoAssetUrl,
} from '../utils/demoAssets';

describe('demo asset cache compatibility', () => {
  it('versions only bundled /demo/ paths', () => {
    expect(resolveDemoAssetUrl('/demo/fictional-property-exterior.png')).toBe(
      `/demo/fictional-property-exterior.png?dfv=${DEMO_ASSET_CACHE_VERSION}`
    );

    expect(resolveDemoAssetUrl('/demo/fictional-property-exterior.png?old=1')).toContain(
      `dfv=${DEMO_ASSET_CACHE_VERSION}`
    );

    expect(resolveDemoAssetUrl('https://example.com/property.png')).toBe(
      'https://example.com/property.png'
    );
    expect(resolveDemoAssetUrl('blob:https://example.com/abc')).toBe(
      'blob:https://example.com/abc'
    );
  });

  it('normalizes nested demo image references without touching live URLs', () => {
    const source = {
      heroImageUrl: '/demo/fictional-property-exterior.png',
      presentation: {
        slides: [
          { imageUrl: '/demo/fictional-property-interior.png' },
          { imageUrl: 'https://cdn.example.com/live-property.png' },
        ],
      },
    };

    const normalized = normalizeDemoAssetReferences(source);

    expect(normalized.heroImageUrl).toContain(`dfv=${DEMO_ASSET_CACHE_VERSION}`);
    expect(normalized.presentation.slides[0].imageUrl).toContain(
      `dfv=${DEMO_ASSET_CACHE_VERSION}`
    );
    expect(normalized.presentation.slides[1].imageUrl).toBe(
      'https://cdn.example.com/live-property.png'
    );
  });
});
