// Edge Function: get-public-review
// Purpose: Authenticates public review token server-side, verifies review validity,
// and securely generates short-lived signed URLs for storage assets referenced in the snapshot.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { AppError } from '../_shared/errors.ts';
import { handleOptions, ensurePost, errorResponse, jsonResponse } from '../_shared/http.ts';
import { parseBody, publicReviewRequestSchema } from '../_shared/validation.ts';

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

    const signAsset = async (bucket: string, path: string): Promise<string> => {
      if (!VALID_BUCKETS.has(bucket) || !path) return '';
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
      if (signed) snapshot.heroImageUrl = signed;
    } else if (snapshot.heroImageUrl) {
      const parsed = parseSupabaseUrl(snapshot.heroImageUrl);
      if (parsed) {
        const signed = await signAsset(parsed.bucket, parsed.path);
        if (signed) snapshot.heroImageUrl = signed;
      }
    }

    // 2. Hydrate brand logo
    if (snapshot.brandKit) {
      if (snapshot.brandKit.logoRef?.storageBucket && snapshot.brandKit.logoRef?.storagePath) {
        const signed = await signAsset(snapshot.brandKit.logoRef.storageBucket, snapshot.brandKit.logoRef.storagePath);
        if (signed) snapshot.brandKit.logoUrl = signed;
      } else if (snapshot.brandKit.logoUrl) {
        const parsed = parseSupabaseUrl(snapshot.brandKit.logoUrl);
        if (parsed) {
          const signed = await signAsset(parsed.bucket, parsed.path);
          if (signed) snapshot.brandKit.logoUrl = signed;
        }
      }

      if (snapshot.brandKit.logoDarkRef?.storageBucket && snapshot.brandKit.logoDarkRef?.storagePath) {
        const signed = await signAsset(snapshot.brandKit.logoDarkRef.storageBucket, snapshot.brandKit.logoDarkRef.storagePath);
        if (signed) snapshot.brandKit.logoDarkUrl = signed;
      } else if (snapshot.brandKit.logoDarkUrl) {
        const parsed = parseSupabaseUrl(snapshot.brandKit.logoDarkUrl);
        if (parsed) {
          const signed = await signAsset(parsed.bucket, parsed.path);
          if (signed) snapshot.brandKit.logoDarkUrl = signed;
        }
      }
    }

    // 3. Hydrate presentation slides
    if (snapshot.presentation?.slides && Array.isArray(snapshot.presentation.slides)) {
      for (const slide of snapshot.presentation.slides) {
        if (slide.type === 'cover' || slide.type === 'property_overview') {
          if (slide.storageBucket && slide.storagePath) {
            const signed = await signAsset(slide.storageBucket, slide.storagePath);
            if (signed) slide.imageUrl = signed;
          } else if (slide.imageUrl) {
            const parsed = parseSupabaseUrl(slide.imageUrl);
            if (parsed) {
              const signed = await signAsset(parsed.bucket, parsed.path);
              if (signed) slide.imageUrl = signed;
            }
          }
        } else if (slide.type === 'gallery' && Array.isArray(slide.items)) {
          for (const item of slide.items) {
            if (item.storageBucket && item.storagePath) {
              const signed = await signAsset(item.storageBucket, item.storagePath);
              if (signed) item.imageUrl = signed;
            } else if (item.imageUrl) {
              const parsed = parseSupabaseUrl(item.imageUrl);
              if (parsed) {
                const signed = await signAsset(parsed.bucket, parsed.path);
                if (signed) item.imageUrl = signed;
              }
            }
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
