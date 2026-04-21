import { sanitizeExtractedText } from "@/lib/pdf/extract-text";

const LABEL_PATTERNS = [
  "BID NUMBER",
  "TENDER NUMBER",
  "CLOSING DATE",
  "CLOSING TIME",
  "DESCRIPTION",
  "CONTACT PERSON",
  "BRIEFING SESSION",
  "COMPULSORY BRIEFING",
  "SBD",
  "TAX COMPLIANCE",
  "CENTRAL SUPPLIER DATABASE",
  "CSD",
  "B-BBEE",
  "BBBEE",
  "CIDB",
  "PSIRA",
  "RETURNABLE DOCUMENTS",
  "SCOPE OF WORK",
  "TERMS OF REFERENCE",
  "SUBMISSION",
  "EVALUATION CRITERIA"
];

export interface PreparedTenderText {
  cleanedText: string;
  chunks: string[];
  detectedLabels: string[];
}

export function prepareTenderText(text: string): PreparedTenderText {
  const cleanedText = sanitizeExtractedText(text)
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const upper = cleanedText.toUpperCase();
  const detectedLabels = LABEL_PATTERNS.filter((label) => upper.includes(label));

  return {
    cleanedText,
    chunks: chunkTenderText(cleanedText),
    detectedLabels
  };
}

export function chunkTenderText(text: string, maxChars = 12000): string[] {
  if (text.length <= maxChars) {
    return [text];
  }

  const paragraphs = text.split(/\n\s*\n/);
  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    const next = current ? `${current}\n\n${paragraph}` : paragraph;

    if (next.length <= maxChars) {
      current = next;
      continue;
    }

    if (current) {
      chunks.push(current);
    }

    if (paragraph.length > maxChars) {
      for (let index = 0; index < paragraph.length; index += maxChars) {
        chunks.push(paragraph.slice(index, index + maxChars));
      }
      current = "";
    } else {
      current = paragraph;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks.slice(0, 8);
}

export function buildChunkContext(input: {
  chunk: string;
  chunkIndex: number;
  chunkCount: number;
  detectedLabels: string[];
}) {
  return [
    `Chunk ${input.chunkIndex + 1} of ${input.chunkCount}.`,
    `Detected tender labels in document: ${input.detectedLabels.join(", ") || "none"}.`,
    "Extract only facts supported by this chunk. Use null, false, or [] when absent.",
    "",
    input.chunk
  ].join("\n");
}
