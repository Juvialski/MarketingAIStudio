import { describe, expect, it } from 'vitest';
import { stateAfterProviderResult } from '../services/providers/imageGenerationLifecycle';

describe('image generation lifecycle semantics', () => {
  it('distinguishes a persisted provider asset from generation-only output', () => {
    expect(stateAfterProviderResult({ storageBucket: 'campaign-assets', storagePath: 'org/campaign/image.png' })).toBe('asset_persisted');
    expect(stateAfterProviderResult({})).toBe('generation_completed');
  });
});
