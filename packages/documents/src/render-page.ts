import {
  paginateInvoiceDocument,
  InvoicePaginationResult,
} from "./invoice-pagination";

interface DocumentPage {
  setContent(html: string): Promise<unknown>;
  evaluate<T>(callback: () => T | Promise<T>): Promise<T>;
}

/** The worker and PDF tests must use this before page.pdf(). */
export async function prepareDocumentPage(
  page: DocumentPage,
  html: string,
): Promise<InvoicePaginationResult | null> {
  await page.setContent(html);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      Array.from(document.images, (image) => image.decode().catch(() => {})),
    );
  });
  const result = await page.evaluate(paginateInvoiceDocument);
  if (result?.overflow)
    throw new Error("A paginação do documento excedeu a área útil.");
  return result;
}
