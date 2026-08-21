import { supabase, isSupabaseConfigured } from './client';
import { ServiceError } from './serviceError';

export type StorageBucket = 'property-media' | 'brand-assets' | 'campaign-assets' | 'campaign-exports';

export interface StorageAsset {
  bucket: StorageBucket;
  /** Canonical tenant-scoped object path; the first segment is organizationId. */
  path: string;
  /** Signed URL in live mode, object URL only in explicit local/demo mode. */
  url: string;
  /** Backwards-compatible alias for existing intake code. */
  publicUrl: string;
}

const segment = (value: string, label: string): string => {
  const normalized = value.trim();
  if (!normalized || normalized === '.' || normalized === '..' || !/^[A-Za-z0-9_-]+$/.test(normalized)) {
    throw new ServiceError('storage_failed', `Invalid ${label} for a storage path.`);
  }
  return normalized;
};

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
    const path = this.canonicalPropertyPath(organizationId, campaignId, file.name);
    return this.upload('property-media', path, file, false);
  }

  public static async uploadBrandLogo(organizationId: string, file: File): Promise<StorageAsset> {
    const path = this.canonicalBrandLogoPath(organizationId, file.name);
    return this.upload('brand-assets', path, file, true);
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
}

const cryptoName = (filename: string, fallbackExtension: string): string => {
  const safeExtension = extension(filename, fallbackExtension);
  const cryptoObject = typeof globalThis.crypto !== 'undefined' ? globalThis.crypto : undefined;
  const id = cryptoObject?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${id}.${safeExtension}`;
};
