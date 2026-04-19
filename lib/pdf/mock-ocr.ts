export interface MockOcrResult {
  text: string;
  provider: string;
  warning: string;
}

export async function mockOcrFallback(documentName: string): Promise<MockOcrResult> {
  return {
    text: "",
    provider: "mock-ocr-placeholder",
    warning: `Text extraction was insufficient for "${documentName}". Plug an OCR provider into lib/pdf/mock-ocr.ts to process scanned PDFs.`
  };
}
