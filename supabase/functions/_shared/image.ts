import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { ProviderError } from './errors.ts';
import { sleep } from './gemini.ts';

const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const BFL_API = 'https://api.bfl.ai/v1';
const NVIDIA_API = 'https://integrate.api.nvidia.com/v1/images/generations';

export type GeneratedImage = {
  bytes: Uint8Array;
  contentType: 'image/png' | 'image/jpeg' | 'image/webp';
  providerRequestId?: string;
  actualCostUsd?: number;
};

function sizeForRatio(aspectRatio: string): { width: number; height: number } {
  switch (aspectRatio) {
    case '16:9': return { width: 1344, height: 768 };
    case '9:16': return { width: 768, height: 1344 };
    case '4:5': return { width: 1024, height: 1280 };
    case '4:3': return { width: 1152, height: 864 };
    default: return { width: 1024, height: 1024 };
  }
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs = 90_000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error: any) {
    if (error?.name === 'AbortError' || controller.signal.aborted) {
      throw new ProviderError('provider_timeout');
    }
    if (error instanceof ProviderError) throw error;
    throw new ProviderError('provider_unavailable');
  } finally {
    clearTimeout(timeout);
  }
}

function contentTypeFrom(value: string | null | undefined): GeneratedImage['contentType'] {
  const normalized = (value ?? '').split(';')[0].toLowerCase();
  if (normalized === 'image/jpeg') return 'image/jpeg';
  if (normalized === 'image/webp') return 'image/webp';
  return 'image/png';
}

async function responseToImage(response: Response): Promise<{ bytes: Uint8Array; contentType: GeneratedImage['contentType'] }> {
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new ProviderError('provider_auth_failed');
    if (response.status === 429) throw new ProviderError('provider_rate_limited');
    throw new ProviderError('provider_unavailable');
  }
  const contentLength = Number(response.headers.get('content-length') ?? 0);
  if (contentLength > MAX_IMAGE_BYTES) throw new ProviderError('provider_output_too_large');
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_IMAGE_BYTES) throw new ProviderError('provider_invalid_output');
  const contentType = contentTypeFrom(response.headers.get('content-type'));
  return { bytes, contentType };
}

async function imageFromUrl(url: string): Promise<{ bytes: Uint8Array; contentType: GeneratedImage['contentType'] }> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new ProviderError('provider_invalid_output');
  }
  if (parsed.protocol !== 'https:') throw new ProviderError('provider_invalid_output');
  return responseToImage(await fetchWithTimeout(parsed, { method: 'GET', redirect: 'error' }));
}

function imageFromDataUrl(value: string): { bytes: Uint8Array; contentType: GeneratedImage['contentType'] } {
  const match = value.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new ProviderError('provider_invalid_output');
  const binary = atob(match[2]);
  if (binary.length > MAX_IMAGE_BYTES) throw new ProviderError('provider_output_too_large');
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return { bytes, contentType: contentTypeFrom(match[1]) };
}

function imageValue(value: unknown): Promise<{ bytes: Uint8Array; contentType: GeneratedImage['contentType'] }> {
  if (typeof value !== 'string' || value.length === 0) throw new ProviderError('provider_invalid_output');
  return value.startsWith('data:') ? Promise.resolve(imageFromDataUrl(value)) : imageFromUrl(value);
}

export function configuredProviderCost(provider: 'bfl' | 'nvidia'): number {
  if (provider === 'nvidia') {
    const raw = Deno.env.get('NVIDIA_ESTIMATED_COST_USD');
    if (!raw) return 0;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }
  const name = 'BFL_ESTIMATED_COST_USD';
  const parsed = Number(Deno.env.get(name));
  if (!Number.isFinite(parsed) || parsed < 0) throw new ProviderError('provider_pricing_unconfigured');
  return parsed;
}

export async function generateBflImage(
  model: string,
  subject: string,
  aspectRatio: string,
): Promise<GeneratedImage> {
  const apiKey = Deno.env.get('BFL_API_KEY');
  if (!apiKey) throw new ProviderError('provider_not_configured');
  const { width, height } = sizeForRatio(aspectRatio);
  let submit: Response;
  try {
    submit = await fetchWithTimeout(`${BFL_API}/${encodeURIComponent(model)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-key': apiKey },
      body: JSON.stringify({ prompt: subject, width, height }),
    });
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    throw new ProviderError('provider_unavailable');
  }
  if (!submit.ok) {
    console.warn('[edge] BFL submit returned HTTP', submit.status, { model });
    if (submit.status === 401 || submit.status === 403) throw new ProviderError('provider_auth_failed');
    if (submit.status === 404) throw new ProviderError('provider_model_unavailable');
    if (submit.status === 429) throw new ProviderError('provider_rate_limited');
    throw new ProviderError('provider_unavailable');
  }
  let submitted: any;
  try {
    submitted = await submit.json();
  } catch {
    throw new ProviderError('provider_invalid_output');
  }
  const requestId = typeof submitted?.id === 'string' ? submitted.id : undefined;
  const pollingUrlValue = submitted?.polling_url;
  if (!requestId || typeof pollingUrlValue !== 'string') throw new ProviderError('provider_contract_invalid');
  let pollingUrl: URL;
  try {
    pollingUrl = new URL(pollingUrlValue);
  } catch {
    throw new ProviderError('provider_contract_invalid');
  }
  if (pollingUrl.protocol !== 'https:' || !(pollingUrl.hostname === 'api.bfl.ai' || pollingUrl.hostname.endsWith('.bfl.ai'))) {
    throw new ProviderError('provider_contract_invalid');
  }

  for (let attempt = 0; attempt < 30; attempt += 1) {
    await sleep(1000);
    const poll = await fetchWithTimeout(pollingUrl, { headers: { 'x-key': apiKey } }, 30_000);
    if (!poll.ok) continue;
    let result: any;
    try {
      result = await poll.json();
    } catch {
      continue;
    }
    if (result?.status === 'Ready' && typeof result?.result?.sample === 'string') {
      const image = await imageValue(result.result.sample);
      return { ...image, providerRequestId: requestId };
    }
    if (['Failed', 'Error', 'Request Moderated'].includes(result?.status)) {
      throw new ProviderError('provider_failed');
    }
  }
  throw new ProviderError('provider_timeout');
}

export async function generateNvidiaImage(
  model: string,
  subject: string,
  aspectRatio: string,
): Promise<GeneratedImage> {
  const apiKey = Deno.env.get('NVIDIA_API_KEY');
  if (!apiKey) throw new ProviderError('provider_not_configured');
  const { width, height } = sizeForRatio(aspectRatio);
  let response: Response;
  try {
    response = await fetchWithTimeout(NVIDIA_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, prompt: subject, size: `${width}x${height}`, n: 1 }),
    });
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    throw new ProviderError('provider_unavailable');
  }
  if (!response.ok) {
    console.warn('[edge] NVIDIA image provider returned HTTP', response.status, { model });
    if (response.status === 401 || response.status === 403) throw new ProviderError('provider_auth_failed');
    if (response.status === 404) throw new ProviderError('provider_model_unavailable');
    if (response.status === 429) throw new ProviderError('provider_rate_limited');
    throw new ProviderError('provider_unavailable');
  }
  let payload: any;
  try {
    payload = await response.json();
  } catch {
    throw new ProviderError('provider_invalid_output');
  }

  let rawValue: string | undefined;
  if (typeof payload?.data?.[0]?.b64_json === 'string') {
    const raw = payload.data[0].b64_json;
    rawValue = raw.startsWith('data:') ? raw : `data:image/png;base64,${raw}`;
  } else if (typeof payload?.data?.[0]?.url === 'string') {
    rawValue = payload.data[0].url;
  } else if (typeof payload?.artifacts?.[0]?.base64 === 'string') {
    rawValue = `data:image/png;base64,${payload.artifacts[0].base64}`;
  } else if (typeof payload?.image === 'string') {
    const raw = payload.image;
    rawValue = raw.startsWith('data:') || raw.startsWith('http') ? raw : `data:image/png;base64,${raw}`;
  } else if (typeof payload?.b64_json === 'string') {
    const raw = payload.b64_json;
    rawValue = raw.startsWith('data:') ? raw : `data:image/png;base64,${raw}`;
  }

  if (!rawValue) {
    console.warn('[edge] NVIDIA returned unexpected response structure', { model, hasData: Boolean(payload?.data) });
    throw new ProviderError('provider_invalid_output');
  }

  const image = await imageValue(rawValue);
  return { ...image, providerRequestId: typeof payload?.id === 'string' ? payload.id : undefined, actualCostUsd: 0 };
}

export async function persistGeneratedImage(
  admin: SupabaseClient,
  organizationId: string,
  campaignId: string,
  provider: 'bfl' | 'nvidia',
  image: GeneratedImage,
): Promise<{ assetId: string; storageBucket: string; storagePath: string; signedUrl: string }> {
  const storageBucket = 'campaign-assets';
  const extension = image.contentType === 'image/jpeg' ? 'jpg' : image.contentType === 'image/webp' ? 'webp' : 'png';
  const storagePath = `${organizationId}/${campaignId}/${crypto.randomUUID()}.${extension}`;
  const upload = await admin.storage.from(storageBucket).upload(storagePath, image.bytes, {
    contentType: image.contentType,
    upsert: false,
  });
  if (upload.error) {
    console.error('[edge] generated image upload failed', upload.error.name);
    throw new ProviderError('asset_persist_failed');
  }
  const { data: asset, error: assetError } = await admin
    .from('campaign_assets')
    .insert({
      organization_id: organizationId,
      campaign_id: campaignId,
      asset_type: 'ai_concept',
      storage_bucket: storageBucket,
      storage_path: storagePath,
      public_url: null,
      mime_type: image.contentType,
      source: provider,
      provenance: 'generated',
      metadata: { provider_request_id: image.providerRequestId ?? null },
    })
    .select('id')
    .single();
  if (assetError || !asset) {
    await admin.storage.from(storageBucket).remove([storagePath]);
    console.error('[edge] generated image asset row failed', assetError?.code);
    throw new ProviderError('asset_persist_failed');
  }
  const { data: signed, error: signedError } = await admin.storage
    .from(storageBucket)
    .createSignedUrl(storagePath, 3600);
  if (signedError || !signed?.signedUrl) throw new ProviderError('asset_url_failed');
  return { assetId: asset.id, storageBucket, storagePath, signedUrl: signed.signedUrl };
}
