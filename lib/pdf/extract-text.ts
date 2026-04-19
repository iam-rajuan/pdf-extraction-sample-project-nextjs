import pdfParse from "pdf-parse";

export interface ExtractedTextResult {
  text: string;
  pages: number;
  info?: Record<string, unknown>;
}

export function sanitizeExtractedText(text: string): string {
  return text.replace(/\u0000/g, "").replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").trim();
}

export function isMeaningfulText(text: string): boolean {
  const normalized = sanitizeExtractedText(text);
  if (normalized.length < 80) {
    return false;
  }

  const alphaNumericMatches = normalized.match(/[A-Za-z0-9]/g) ?? [];
  const uniqueWords = new Set(
    normalized
      .toLowerCase()
      .split(/\s+/)
      .map((token) => token.replace(/[^a-z0-9]/g, ""))
      .filter(Boolean)
  );

  return alphaNumericMatches.length >= 40 && uniqueWords.size >= 12;
}

export async function extractTextFromPdf(buffer: Buffer): Promise<ExtractedTextResult> {
  const parsed = await pdfParse(buffer);

  return {
    text: sanitizeExtractedText(parsed.text ?? ""),
    pages: parsed.numpages ?? 0,
    info: parsed.info ? (parsed.info as Record<string, unknown>) : undefined
  };
}
