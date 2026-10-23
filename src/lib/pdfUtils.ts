import { PDFDocument } from 'pdf-lib';

export const PRICE_PER_PAGE = 3;
export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

/**
 * Counts the exact number of pages in a PDF file completely inside the browser.
 * Uses pdf-lib without sending any data to the server.
 */
export async function countPdfPages(file: File): Promise<number> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const count = pdfDoc.getPageCount();
    if (count <= 0) {
      throw new Error('PDF has no readable pages.');
    }
    return count;
  } catch (error: any) {
    console.error('Error counting PDF pages:', error);
    throw new Error(error?.message || 'Could not read PDF. Please ensure the file is a valid, uncorrupted PDF.');
  }
}

/**
 * Calculates total order price given the page count.
 * Rate: pages * ₹3
 */
export function calculateOrderPrice(pages: number): number {
  if (pages <= 0) return 0;
  return pages * PRICE_PER_PAGE;
}

/**
 * Formats file size in readable units (KB / MB).
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Generates standard UPI payment URL for deep-linking into UPI apps.
 */
export function generateUpiUrl(params: {
  shopUpiId: string;
  shopName: string;
  amount: number;
  note?: string;
}): string {
  const { shopUpiId, shopName, amount, note = 'PrintFlow Order' } = params;
  const cleanAmount = amount.toFixed(2);
  const encodedName = encodeURIComponent(shopName);
  const encodedNote = encodeURIComponent(note);
  return `upi://pay?pa=${shopUpiId}&pn=${encodedName}&am=${cleanAmount}&cu=INR&tn=${encodedNote}`;
}
