import { AppError } from './errors.ts';

function configuredList(name: string, fallback: string): string[] {
  return (Deno.env.get(name) ?? fallback)
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

export const GEMINI_TEXT_MODELS = configuredList(
  'GEMINI_TEXT_MODELS',
  'gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemini-3.5-flash,gemini-3.6-flash,gemini-3.7-flash',
);
export const NVIDIA_IMAGE_MODELS = configuredList(
  'NVIDIA_IMAGE_MODELS',
  'stabilityai/stable-diffusion-3.5-large,black-forest-labs/flux.1-dev,black-forest-labs/flux.1-schnell,qwen-image,black-forest-labs/flux.2-klein',
);
export const BFL_IMAGE_MODELS = configuredList('BFL_IMAGE_MODELS', 'flux-2-max,flux-2-pro,flux-2-flex');

export function assertGeminiTextModel(model: string): void {
  if (!GEMINI_TEXT_MODELS.includes(model)) throw new AppError('model_not_allowed', 400, 'The requested model is not enabled.');
}

export function assertImageModel(provider: string, model: string): void {
  const allowed = provider === 'bfl' ? BFL_IMAGE_MODELS : provider === 'nvidia' ? NVIDIA_IMAGE_MODELS : [];
  if (!allowed.includes(model)) throw new AppError('model_not_allowed', 400, 'The requested model is not enabled.');
}

export function defaultImageModel(provider: string): string {
  if (provider === 'bfl') return BFL_IMAGE_MODELS[0];
  if (provider === 'nvidia') return NVIDIA_IMAGE_MODELS[0];
  return '';
}

export function geminiTextIsPaid(): boolean {
  return Deno.env.get('GEMINI_TEXT_IS_PAID') === 'true';
}
