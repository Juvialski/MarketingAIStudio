import { supabase, isSupabaseConfigured } from './client';
import { ServiceError } from './serviceError';
import { CampaignImage } from '../../types/campaign';
import { Database, Json } from '../../types/database.types';

export type StorageBucket = 'property-media' | 'brand-assets' | 'campaign-assets' | 'campaign-exports';
type CampaignAssetInsert = Database['public']['Tables']['campaign_assets']['Insert'];

export interface StorageAsset {
  assetId?: string;
  bucket: StorageBucket;
  /** Canonical tenant-scoped object path; the first segment is organizationId. */
  path: string;
  /** Signed URL in live mode, object URL only in explicit local/demo mode. */
  url: string;
  /** Backwards-compatible alias for existing intake code. */
  publicUrl: string;
  mimeType?: string;
}

export const MAX_PROPERTY_IMAGE_BYTES = 25 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

async function readBlobBytes(blob: Blob): Promise<Uint8Array> {
  if (typeof blob.arrayBuffer === 'function') {
    return new Uint8Array(await blob.arrayBuffer());
  }
  return new Promise<Uint8Array>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error || new Error('Unable to inspect the uploaded image.'));
    reader.readAsArrayBuffer(blob);
  });
}

/** Validate both the browser-declared MIME type and the binary image header. */
export async function validatePropertyImageFile(file: File): Promise<void> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new ServiceError('validation_error', 'Upload a JPEG, PNG, or WebP property image.');
  }
  if (file.size <= 0 || file.size > MAX_PROPERTY_IMAGE_BYTES) {
    throw new ServiceError('validation_error', 'Property images must be smaller than 25 MB.');
  }

  const bytes = (await readBlobBytes(file.slice(0, 12))).slice(0, 12);
  const isJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => bytes[i] === v);
  const isWebp = bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;

  if (!isJpeg && !isPng && !isWebp) {
    throw new ServiceError('validation_error', 'The uploaded file is not a valid JPEG, PNG, or WebP image.');
  }
}

const segment = (value: string, label: string): string => {
  const normalized = value.trim();
  if (!normalized || normalized === '.' || normalized === '..' || !/^[A-Za-z0-9_-]+$/.test(normalized)) {
    throw new ServiceError('storage_failed', `Invalid ${label} for a storage path.`);
  }
  return normalized;
};

export function getDraftUploadPaths(organizationId: string, images: CampaignImage[]): string[] {
  const safeOrganizationId = segment(organizationId, 'organization ID');
  const prefix = `${safeOrganizationId}/drafts/`;
  return [...new Set(
    images
      .filter((image) => image.storageBucket === 'property-media' && image.storagePath?.startsWith(prefix))
      .map((image) => image.storagePath!)
      .filter((path) => {
        const parts = path.split('/');
        return parts.length >= 3 && parts[0] === safeOrganizationId && parts[1] === 'drafts' && !parts.slice(2).some((part) => part === '.' || part === '..');
      })
  )];
}

const extension = (filename: string, fallback: string): string => {
  const raw = filename.split('.').pop()?.toLowerCase() || fallback;
  return /^[a-z0-9]{1,8}$/.test(raw) ? raw : fallback;
};

const objectUrl = (value: Blob): string => {
  if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    throw new ServiceError('storage_failed', 'Local object URLs are unavailable in this environment.');
  }
  return URL.createObjectURL(value);
};

export class StorageService {
  public static canonicalPropertyPath(organizationId: string, campaignId: string, filename: string): string {
    return `${segment(organizationId, 'organization ID')}/${segment(campaignId, 'campaign ID')}/${
      cryptoName(filename, 'jpg')
    }`;
  }

  public static canonicalBrandLogoPath(organizationId: string, filename: string): string {
    return `${segment(organizationId, 'organization ID')}/logos/${cryptoName(filename, 'png')}`;
  }

  public static canonicalExportPath(organizationId: string, campaignId: string, filename: string): string {
    return `${segment(organizationId, 'organization ID')}/${segment(campaignId, 'campaign ID')}/exports/${
      cryptoName(filename, 'bin')
    }`;
  }

  public static async getSignedUrl(
    bucket: StorageBucket,
    path: string,
    expiresInSeconds = 3600
  ): Promise<string> {
    if (!isSupabaseConfigured()) {
      throw new ServiceError('not_configured', 'Signed URLs require the live backend.');
    }
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
    if (error || !data?.signedUrl) {
      throw new ServiceError('storage_failed', 'Unable to create a signed asset URL.', error);
    }
    return data.signedUrl;
  }

  private static async upload(
    bucket: StorageBucket,
    path: string,
    value: Blob,
    upsert: boolean
  ): Promise<StorageAsset> {
    if (!isSupabaseConfigured()) {
      const localUrl = objectUrl(value);
      return { bucket, path, url: localUrl, publicUrl: localUrl };
    }

    const { error } = await supabase.storage.from(bucket).upload(path, value, {
      cacheControl: '3600',
      upsert,
    });
    if (error) {
      // A live failure remains a failure; never mask it with an object URL.
      throw new ServiceError('storage_failed', 'Asset upload failed.', error);
    }

    const signedUrl = await this.getSignedUrl(bucket, path);
    return { bucket, path, url: signedUrl, publicUrl: signedUrl };
  }

  public static async uploadPropertyPhoto(
    organizationId: string,
    campaignId: string,
    file: File
  ): Promise<StorageAsset> {
    await validatePropertyImageFile(file);
    const path = this.canonicalPropertyPath(organizationId, campaignId, file.name);
    const asset = await this.upload('property-media', path, file, false);

    asset.mimeType = file.type || 'image/jpeg';
    return asset;
  }

  /** Remove only property-media objects belonging to the unsaved draft prefix. */
  public static async deleteDraftUploads(organizationId: string, images: CampaignImage[]): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const paths = getDraftUploadPaths(organizationId, images);
    if (paths.length === 0) return;

    const { error } = await supabase.storage.from('property-media').remove(paths);
    if (error) {
      throw new ServiceError('storage_failed', 'Unsaved draft photos could not be removed from private storage.', error);
    }
  }

  /**
   * Register uploaded/generated refs after the campaign UUID exists. This is
   * intentionally separate from the binary upload so a new-campaign draft
   * never writes a fake `drafts` campaign ID into the asset table.
   */
  public static async registerCampaignAssets(
    organizationId: string,
    campaignId: string,
    images: CampaignImage[]
  ): Promise<CampaignImage[]> {
    if (!isSupabaseConfigured()) return images;

    const refs = images.filter((image) =>
      image.storageBucket &&
      image.storagePath &&
      image.source !== 'sample' &&
      image.provenance !== 'fixture' &&
      image.storageBucket !== 'brand-assets' &&
      image.storageBucket !== 'campaign-exports'
    );
    if (refs.length === 0) return images;

    const paths = [...new Set(refs.map((image) => image.storagePath!))];
    const { data: existingRows, error: lookupError } = await supabase
      .from('campaign_assets')
      .select('id, storage_bucket, storage_path')
      .eq('organization_id', organizationId)
      .eq('campaign_id', campaignId)
      .in('storage_path', paths);
    if (lookupError) {
      throw new ServiceError('asset_persist_failed', 'Campaign asset metadata could not be checked before saving.', lookupError);
    }

    const existingByPath = new Map(
      (existingRows || []).map((row) => [`${row.storage_bucket}:${row.storage_path}`, row.id])
    );
    const missing = refs.filter((image) => !existingByPath.has(`${image.storageBucket}:${image.storagePath}`));
    if (missing.length === 0) return images;

    const rows: CampaignAssetInsert[] = missing.map((image) => ({
      organization_id: organizationId,
      campaign_id: campaignId,
      asset_type: image.source === 'upload' ? (image.isHero ? 'hero_photo' : 'property_photo') : 'ai_concept',
      storage_bucket: image.storageBucket as StorageBucket,
      storage_path: image.storagePath!,
      public_url: null,
      mime_type: image.mimeType || 'image/jpeg',
      source: image.source === 'upload'
        ? 'upload'
        : image.provider === 'nvidia'
        ? 'nvidia'
        : image.provider === 'bfl'
        ? 'bfl'
        : 'generated',
      provenance: image.provenance === 'uploaded' ? 'uploaded' : 'generated',
      is_hero: image.isHero,
      metadata: {
        original_name: image.name,
        provider: image.provider || null,
        model: image.model || null,
        provenance: image.provenance || 'generated',
      } as unknown as Json,
    }));

    const { data: insertedRows, error: insertError } = await supabase
      .from('campaign_assets')
      .insert(rows)
      .select('id, storage_bucket, storage_path');
    if (insertError) {
      throw new ServiceError('asset_persist_failed', 'Campaign asset metadata could not be saved.', insertError);
    }

    const idsByPath = new Map(existingByPath);
    (insertedRows || []).forEach((row) => idsByPath.set(`${row.storage_bucket}:${row.storage_path}`, row.id));
    return images.map((image) => {
      const id = image.storageBucket && image.storagePath
        ? idsByPath.get(`${image.storageBucket}:${image.storagePath}`)
        : undefined;
      return id && !image.assetId ? { ...image, assetId: id } : image;
    });
  }

  public static async uploadBrandLogo(organizationId: string, file: File): Promise<StorageAsset> {
    const path = this.canonicalBrandLogoPath(organizationId, file.name);
    const asset = await this.upload('brand-assets', path, file, true);
    asset.mimeType = file.type || 'image/png';
    return asset;
  }

  public static async uploadDesignExport(
    organizationId: string,
    campaignId: string,
    filename: string,
    blob: Blob
  ): Promise<StorageAsset> {
    const path = this.canonicalExportPath(organizationId, campaignId, filename);
    return this.upload('campaign-exports', path, blob, true);
  }

  public static async deleteCampaignAsset(
    organizationId: string,
    campaignId: string,
    storagePath: string,
    bucket: StorageBucket = 'property-media'
  ): Promise<void> {
    if (!isSupabaseConfigured()) return;

    const { error: metadataError } = await supabase
      .from('campaign_assets')
      .delete()
      .eq('organization_id', organizationId)
      .eq('campaign_id', campaignId)
      .eq('storage_path', storagePath);
    if (metadataError) {
      throw new ServiceError('asset_persist_failed', 'Campaign asset metadata could not be removed.', metadataError);
    }

    const { error: storageError } = await supabase.storage.from(bucket).remove([storagePath]);
    if (storageError) {
      throw new ServiceError('storage_failed', 'Campaign asset could not be removed from private storage.', storageError);
    }
  }
}

const cryptoName = (filename: string, fallbackExtension: string): string => {
  const safeExtension = extension(filename, fallbackExtension);
  const cryptoObject = typeof globalThis.crypto !== 'undefined' ? globalThis.crypto : undefined;
  const id = cryptoObject?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${id}.${safeExtension}`;
};
