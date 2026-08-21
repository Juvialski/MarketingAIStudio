import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';
import { FORMAT_DIMENSIONS } from '../../types/designs';
import { ExportDimensions, renderElementToPngBlob } from './graphicExporter';

export type PdfPageFormat = 'letter' | 'a4';

export interface PdfPageSizePoints {
  width: number;
  height: number;
}

function getFormatDimensions(format: PdfPageFormat) {
  return format === 'letter' ? FORMAT_DIMENSIONS.flyer_letter : FORMAT_DIMENSIONS.flyer_a4;
}

export function getPdfPageSizePoints(format: PdfPageFormat): PdfPageSizePoints {
  return format === 'letter'
    ? { width: 612, height: 792 }
    : { width: 595.28, height: 841.89 };
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error('Unable to read rendered flyer image.'));
    reader.readAsDataURL(blob);
  });
}

async function createRasterPdf(
  elementOrId: HTMLElement | string,
  format: PdfPageFormat,
  rasterDimensions?: ExportDimensions
): Promise<Blob> {
  const target = getFormatDimensions(format);
  const pngBlob = await renderElementToPngBlob(
    elementOrId,
    rasterDimensions || { width: target.width, height: target.height }
  );
  const imgData = await blobToDataUrl(pngBlob);
  const page = getPdfPageSizePoints(format);

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: [page.width, page.height],
    compress: true,
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
  return pdf.output('blob');
}

export class PdfExporter {
  public static async exportElementToPdf(
    elementOrId: HTMLElement | string,
    filename: string,
    format: PdfPageFormat = 'letter'
  ): Promise<Blob> {
    const pdfBlob = await createRasterPdf(elementOrId, format);
    saveAs(pdfBlob, filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
    return pdfBlob;
  }

  public static async generatePdfBlob(
    elementOrId: HTMLElement | string,
    format: PdfPageFormat = 'letter',
    rasterDimensions?: ExportDimensions
  ): Promise<Blob> {
    return createRasterPdf(elementOrId, format, rasterDimensions);
  }
}
