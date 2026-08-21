import { describe, expect, it } from 'vitest';
import { getTargetDimensions, readPngDimensions } from '../services/export/graphicExporter';

function pngHeader(width: number, height: number): Blob {
  const bytes = new Uint8Array(24);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return new Blob([bytes], { type: 'image/png' });
}

describe('exact export dimensions', () => {
  it('reads PNG IHDR dimensions without decoding the full bitmap', async () => {
    await expect(readPngDimensions(pngHeader(1080, 1920))).resolves.toEqual({
      width: 1080,
      height: 1920,
    });
  });

  it('rejects non-PNG output', async () => {
    await expect(readPngDimensions(new Blob(['not a png']))).rejects.toThrow('valid PNG');
  });

  it('requires valid integer target metadata on the design canvas', () => {
    const element = document.createElement('div');
    element.dataset.targetWidth = '1200';
    element.dataset.targetHeight = '630';
    expect(getTargetDimensions(element)).toEqual({ width: 1200, height: 630 });

    element.dataset.targetWidth = '';
    expect(() => getTargetDimensions(element)).toThrow('target width and height');
  });
});
