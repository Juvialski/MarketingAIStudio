import { describe, expect, it } from 'vitest';
import {
  createRasterOptions,
  getTargetDimensions,
  readPngDimensions,
} from '../services/export/graphicExporter';
import { getPdfPageSizePoints } from '../services/export/pdfExporter';
import { FORMAT_DIMENSIONS } from '../types/designs';

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

  it('uses the exact target dimensions in the html-to-image raster contract', () => {
    const options = createRasterOptions({ width: 1080, height: 1350 });
    expect(options).toMatchObject({
      canvasWidth: 1080,
      canvasHeight: 1350,
      pixelRatio: 1,
      skipAutoScale: true,
    });
  });

  it('keeps the canonical social and 300 DPI print export dimensions', () => {
    expect(FORMAT_DIMENSIONS.square).toMatchObject({ width: 1080, height: 1080, exportFormat: 'png' });
    expect(FORMAT_DIMENSIONS.portrait).toMatchObject({ width: 1080, height: 1350, exportFormat: 'png' });
    expect(FORMAT_DIMENSIONS.story).toMatchObject({ width: 1080, height: 1920, exportFormat: 'png' });
    expect(FORMAT_DIMENSIONS.landscape).toMatchObject({ width: 1200, height: 630, exportFormat: 'png' });
    expect(FORMAT_DIMENSIONS.flyer_letter).toMatchObject({ width: 2550, height: 3300, exportFormat: 'pdf' });
    expect(FORMAT_DIMENSIONS.flyer_a4).toMatchObject({ width: 2480, height: 3508, exportFormat: 'pdf' });
  });

  it('uses exact physical PDF page sizes in points', () => {
    expect(getPdfPageSizePoints('letter')).toEqual({ width: 612, height: 792 });

    const a4 = getPdfPageSizePoints('a4');
    expect(a4.width).toBeCloseTo(595.28, 2);
    expect(a4.height).toBeCloseTo(841.89, 2);
  });
});
