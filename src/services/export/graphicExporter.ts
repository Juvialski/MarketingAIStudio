import * as htmlToImage from 'html-to-image';
import { saveAs } from 'file-saver';
import { OutputAspectRatio } from '../../types/campaign';
import { validateDesignLayout } from './designPreflight';

export interface ExportDimensions {
  width: number;
  height: number;
}

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10] as const;

function getElement(elementOrId: HTMLElement | string): HTMLElement {
  const element =
    typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;

  if (!element) {
    throw new Error(`Element not found for export: ${elementOrId}`);
  }

  return element;
}

export function getTargetDimensions(element: HTMLElement): ExportDimensions {
  const width = Number(element.dataset.targetWidth);
  const height = Number(element.dataset.targetHeight);

  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
    throw new Error('Export canvas is missing valid target width and height metadata.');
  }

  return { width, height };
}

async function waitForAssets(element: HTMLElement): Promise<void> {
  if ('fonts' in document) {
    await document.fonts.ready;
  }

  const images = Array.from(element.querySelectorAll('img'));
  await Promise.all(
    images.map(async (image) => {
      if (!image.complete) {
        await new Promise<void>((resolve, reject) => {
          image.addEventListener('load', () => resolve(), { once: true });
          image.addEventListener(
            'error',
            () => reject(new Error(`Unable to load export image: ${image.alt || 'unnamed image'}`)),
            { once: true }
          );
        });
      }

      if (typeof image.decode === 'function') {
        await image.decode().catch(() => undefined);
      }
    })
  );
}

export async function readPngDimensions(blob: Blob): Promise<ExportDimensions> {
  const header = blob.slice(0, 24);
  const buffer = typeof header.arrayBuffer === 'function'
    ? await header.arrayBuffer()
    : await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(reader.error || new Error('Unable to read PNG header.'));
        reader.readAsArrayBuffer(header);
      });
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 24 || PNG_SIGNATURE.some((value, index) => bytes[index] !== value)) {
    throw new Error('Export renderer did not return a valid PNG.');
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return {
    width: view.getUint32(16),
    height: view.getUint32(20),
  };
}

export async function renderElementToPngBlob(
  elementOrId: HTMLElement | string,
  dimensions?: ExportDimensions
): Promise<Blob> {
  const element = getElement(elementOrId);
  const target = dimensions || getTargetDimensions(element);
  const aspectRatio = (element.dataset.aspectRatio || 'square') as OutputAspectRatio;

  // 1. Run Preflight Design Layout Validation
  const preflight = validateDesignLayout(element, aspectRatio);
  if (!preflight.valid) {
    console.warn('Design preflight warnings/errors:', preflight.errors);
  }

  await waitForAssets(element);

  const blob = await htmlToImage.toBlob(element, {
    canvasWidth: target.width,
    canvasHeight: target.height,
    pixelRatio: 1,
    cacheBust: false,
    skipAutoScale: true,
    backgroundColor: '#ffffff',
    style: {
      transform: 'none',
      transformOrigin: 'top left',
      margin: '0',
    },
  });

  if (!blob) {
    throw new Error('The export renderer returned an empty image.');
  }

  const actual = await readPngDimensions(blob);
  if (actual.width !== target.width || actual.height !== target.height) {
    throw new Error(
      `Export dimension mismatch: expected ${target.width}x${target.height}, received ${actual.width}x${actual.height}.`
    );
  }

  return blob;
}

export class GraphicExporter {
  public static async exportToPng(
    elementOrId: HTMLElement | string,
    filename: string
  ): Promise<Blob> {
    const blob = await renderElementToPngBlob(elementOrId);
    saveAs(blob, filename.endsWith('.png') ? filename : `${filename}.png`);
    return blob;
  }

  public static async exportToBlob(elementOrId: HTMLElement | string): Promise<Blob> {
    return renderElementToPngBlob(elementOrId);
  }
}
