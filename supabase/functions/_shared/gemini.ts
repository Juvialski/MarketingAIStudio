import { ProviderError } from './errors.ts';

const GEMINI_API = 'https://generativelanguage.googleapis.com/v1beta/models';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

export async function generateGeminiJson(
  model: string,
  prompt: string,
  responseJsonSchema: Record<string, unknown>,
  thinkingLevel: 'low' | 'medium' | 'high',
): Promise<unknown> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) throw new ProviderError('provider_not_configured');
  let response: Response;
  try {
    response = await fetchWithTimeout(`${GEMINI_API}/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseJsonSchema,
          thinkingConfig: { thinkingLevel },
        },
      }),
    });
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    throw new ProviderError('provider_unavailable');
  }
  if (!response.ok) {
    console.warn('[edge] Gemini provider returned HTTP', response.status, { model });
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
  const rawText = payload?.candidates?.[0]?.content?.parts?.find((part: any) => typeof part?.text === 'string')?.text;
  if (typeof rawText !== 'string' || rawText.length === 0) throw new ProviderError('provider_invalid_output');
  try {
    return JSON.parse(rawText);
  } catch {
    throw new ProviderError('provider_invalid_output');
  }
}

export { sleep };
