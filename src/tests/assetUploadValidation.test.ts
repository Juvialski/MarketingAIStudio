import { describe, expect, it } from 'vitest';
import {
  MAX_PROPERTY_IMAGE_BYTES,
  validatePropertyImageFile,
} from '../services/supabase/storageService';

describe('property asset upload validation', () => {
  it('accepts supported image signatures', async () => {
    const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    await expect(validatePropertyImageFile(new File([pngHeader], 'front.png', { type: 'image/png' }))).resolves.toBeUndefined();
  });

  it('rejects mismatched MIME/binary content and oversized files', async () => {
    const textFile = new File(['not an image'], 'front.png', { type: 'image/png' });
    await expect(validatePropertyImageFile(textFile)).rejects.toThrow('valid JPEG, PNG, or WebP');

    const oversized = new File([new Uint8Array(MAX_PROPERTY_IMAGE_BYTES + 1)], 'front.jpg', { type: 'image/jpeg' });
    await expect(validatePropertyImageFile(oversized)).rejects.toThrow('smaller than 25 MB');
  });
});
