// Edge Function: get-public-review
// Purpose: Authenticates public review token server-side, verifies review validity,
// and securely generates short-lived signed URLs for storage assets referenced in the snapshot.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { AppError } from '../_shared/errors.ts';
import { handleOptions, ensurePost, errorResponse, jsonResponse } from '../_shared/http.ts';
import { parseBody, publicReviewRequestSchema } from '../_shared/validation.ts';
import { resolvePrivateAssetUrl } from '../_shared/reviewAssetUrl.mjs';

const VALID_BUCKETS = new Set([
  'property-media',
  'brand-assets',
  'campaign-assets',
  'campaign-exports',
]);

function parseSupabaseUrl(url?: string | null): { bucket: string; path: string } | null {
  if (!url || typeof url !== 'string') return null;
  const regex = /\/storage\/v1\/(?:object|render\/image)\/(?:sign|public|authenticated)\/([^/?#]+)\/([^?#]+)/;
  const match = url.match(regex);
  if (!match) return null;
  const bucket = decodeURIComponent(match[1]);
  const path = decodeURIComponent(match[2]);
  if (VALID_BUCKETS.has(bucket) && path.trim() !== '') {
    return { bucket, path: path.trim() };
  }
  return null;
}

type ReviewAssetScope = {
  allowedRefs: Set<string>;
};

async function hashReviewToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token.trim()));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function loadReviewAssetScope(admin: SupabaseClient, rawToken: string): Promise<ReviewAssetScope> {
  const tokenHash = await hashReviewToken(rawToken);
  const { data: link } = await admin
    .from('campaign_review_links')
    .select('organization_id, campaign_id')
    .eq('token_hash', tokenHash)
    .maybeSingle();
  if (!link) return { allowedRefs: new Set() };

  const { data: campaign } = await admin
    .from('campaigns')
    .select('brand_kit_id')
    .eq('id', link.campaign_id)
    .eq('organization_id', link.organization_id)
    .maybeSingle();
  const { data: assets } = await admin
    .from('campaign_assets')
    .select('storage_bucket, storage_path')
    .eq('campaign_id', link.campaign_id)
    .eq('organization_id', link.organization_id);

  const allowedRefs = new Set<string>(
    (assets || []).map((asset) => `${asset.storage_bucket}:${asset.storage_path}`)
  );

  if (campaign?.brand_kit_id) {
    const { data: brandKit } = await admin
      .from('brand_kits')
      .select('logo_storage_bucket, logo_storage_path, logo_dark_storage_bucket, logo_dark_storage_path')
      .eq('id', campaign.brand_kit_id)
      .eq('organization_id', link.organization_id)
      .maybeSingle();
    if (brandKit?.logo_storage_bucket && brandKit.logo_storage_path) {
      allowedRefs.add(`${brandKit.logo_storage_bucket}:${brandKit.logo_storage_path}`);
    }
    if (brandKit?.logo_dark_storage_bucket && brandKit.logo_dark_storage_path) {
      allowedRefs.add(`${brandKit.logo_dark_storage_bucket}:${brandKit.logo_dark_storage_path}`);
    }
  }

  return { allowedRefs };
}

serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    ensurePost(req);
    const body = await parseBody(req, publicReviewRequestSchema);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new AppError('server_configuration_error', 503, 'Review service is temporarily unconfigured.');
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Call PostgreSQL RPC with raw token; RPC hashes token server-side and checks status
    const { data: rpcResult, error: rpcError } = await admin.rpc('get_public_review_snapshot', {
      p_raw_token: body.rawToken.trim(),
    });

    if (rpcError) {
      throw new AppError('query_failed', 500, 'Unable to verify review token.');
    }

    if (!rpcResult || rpcResult.status !== 'active' || !rpcResult.snapshot) {
      return jsonResponse(req, rpcResult || { status: 'not_found', error: 'Review package not found.' });
    }

    const snapshot = rpcResult.snapshot;
    const assetScope = await loadReviewAssetScope(admin, body.rawToken);

    const signAsset = async (bucket: string, path: string): Promise<string> => {
      if (!VALID_BUCKETS.has(bucket) || !path || !assetScope.allowedRefs.has(`${bucket}:${path}`)) return '';
      try {
        const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, 3600);
        if (error || !data?.signedUrl) return '';
        return data.signedUrl;
      } catch {
        return '';
      }
    };

    // 1. Hydrate hero image
    if (snapshot.heroImageRef?.storageBucket && snapshot.heroImageRef?.storagePath) {
      const signed = await signAsset(snapshot.heroImageRef.storageBucket, snapshot.heroImageRef.storagePath);
      snapshot.heroImageUrl = resolvePrivateAssetUrl(snapshot.heroImageUrl, signed);
    } else if (snapshot.heroImageUrl) {
      const parsed = parseSupabaseUrl(snapshot.heroImageUrl);
      if (parsed) {
        const signed = await signAsset(parsed.bucket, parsed.path);
        snapshot.heroImageUrl = resolvePrivateAssetUrl(snapshot.heroImageUrl, signed);
      }
    }

    // 2. Hydrate brand logo
    if (snapshot.brandKit) {
      if (snapshot.brandKit.logoRef?.storageBucket && snapshot.brandKit.logoRef?.storagePath) {
        const signed = await signAsset(snapshot.brandKit.logoRef.storageBucket, snapshot.brandKit.logoRef.storagePath);
        snapshot.brandKit.logoUrl = resolvePrivateAssetUrl(snapshot.brandKit.logoUrl, signed);
      } else if (snapshot.brandKit.logoUrl) {
        const parsed = parseSupabaseUrl(snapshot.brandKit.logoUrl);
        if (parsed) {
          const signed = await signAsset(parsed.bucket, parsed.path);
          snapshot.brandKit.logoUrl = resolvePrivateAssetUrl(snapshot.brandKit.logoUrl, signed);
        }
      }

      if (snapshot.brandKit.logoDarkRef?.storageBucket && snapshot.brandKit.logoDarkRef?.storagePath) {
        const signed = await signAsset(snapshot.brandKit.logoDarkRef.storageBucket, snapshot.brandKit.logoDarkRef.storagePath);
        snapshot.brandKit.logoDarkUrl = resolvePrivateAssetUrl(snapshot.brandKit.logoDarkUrl, signed);
      } else if (snapshot.brandKit.logoDarkUrl) {
        const parsed = parseSupabaseUrl(snapshot.brandKit.logoDarkUrl);
        if (parsed) {
          const signed = await signAsset(parsed.bucket, parsed.path);
          snapshot.brandKit.logoDarkUrl = resolvePrivateAssetUrl(snapshot.brandKit.logoDarkUrl, signed);
        }
      }
    }

    // 3. Hydrate presentation slides
    if (snapshot.presentation?.slides && Array.isArray(snapshot.presentation.slides)) {
      for (const slide of snapshot.presentation.slides) {
        if (slide.type === 'cover' || slide.type === 'property_overview') {
          if (slide.storageBucket && slide.storagePath) {
            const signed = await signAsset(slide.storageBucket, slide.storagePath);
            slide.imageUrl = resolvePrivateAssetUrl(slide.imageUrl, signed);
          } else if (slide.imageUrl) {
            const parsed = parseSupabaseUrl(slide.imageUrl);
            if (parsed) {
              const signed = await signAsset(parsed.bucket, parsed.path);
              slide.imageUrl = resolvePrivateAssetUrl(slide.imageUrl, signed);
            }
          }
        } else if (slide.type === 'gallery' && Array.isArray(slide.items)) {
          for (const item of slide.items) {
            if (item.storageBucket && item.storagePath) {
              const signed = await signAsset(item.storageBucket, item.storagePath);
              item.imageUrl = resolvePrivateAssetUrl(item.imageUrl, signed);
            } else if (item.imageUrl) {
              const parsed = parseSupabaseUrl(item.imageUrl);
              if (parsed) {
                const signed = await signAsset(parsed.bucket, parsed.path);
                item.imageUrl = resolvePrivateAssetUrl(item.imageUrl, signed);
              }
            }
          }
        }
      }
    }

    // Storage refs are an internal authorization mechanism, not part of the
    // anonymous review contract. The signed URLs above are the only access
    // artifacts the public viewer needs.
    delete snapshot.heroImageRef;
    if (snapshot.brandKit) {
      delete snapshot.brandKit.logoRef;
      delete snapshot.brandKit.logoDarkRef;
    }
    if (snapshot.presentation?.slides && Array.isArray(snapshot.presentation.slides)) {
      for (const slide of snapshot.presentation.slides) {
        delete slide.storageBucket;
        delete slide.storagePath;
        if (Array.isArray(slide.items)) {
          for (const item of slide.items) {
            delete item.storageBucket;
            delete item.storagePath;
          }
        }
      }
    }

    return jsonResponse(req, {
      ...rpcResult,
      snapshot,
    });
  } catch (error) {
    if (error instanceof AppError) return errorResponse(req, error);
    return errorResponse(req, new AppError('internal_error', 500, 'Review service is temporarily unavailable.'));
  }
});
