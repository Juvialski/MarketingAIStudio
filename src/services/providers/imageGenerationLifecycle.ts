/**
 * UI lifecycle states for image generation.
 *
 * `attached_locally` is intentionally distinct from campaign persistence:
 * the modal callback only updates the intake/workspace React state. The
 * campaign row is saved later by the owning campaign workflow.
 */
export type ImageGenerationState =
  | 'idle'
  | 'preparing'
  | 'submitting'
  | 'generating'
  | 'persisting'
  | 'generation_completed'
  | 'asset_persisted'
  | 'attaching'
  | 'attached_locally'
  | 'provider_failed'
  | 'storage_failed'
  | 'attachment_failed';

export function stateAfterProviderResult(asset: {
  storageBucket?: string;
  storagePath?: string;
}): 'generation_completed' | 'asset_persisted' {
  return asset.storageBucket && asset.storagePath ? 'asset_persisted' : 'generation_completed';
}
