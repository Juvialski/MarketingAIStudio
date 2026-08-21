import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';
import { FORMAT_DIMENSIONS } from '../../types/designs';
import { renderElementToPngBlob } from './graphicExporter';

export type PdfPageFormat = 'letter' | 'a4';

function getFormatDimensions(format: PdfPageFormat) {
  return format === 'letter' ? FORMAT_DIMENSIONS.flyer_letter : FORMAT_DIMENSIONS.flyer_a4;
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
  format: PdfPageFormat
): Promise<Blob> {
  const target = getFormatDimensions(format);
  const pngBlob = await renderElementToPngBlob(elementOrId, {
    width: target.width,
    height: target.height,
  });
  const imgData = await blobToDataUrl(pngBlob);

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'in',
    format: format === 'letter' ? [8.5, 11] : 'a4',
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
    format: PdfPageFormat = 'letter'
  ): Promise<Blob> {
    return createRasterPdf(elementOrId, format);
  }
}
