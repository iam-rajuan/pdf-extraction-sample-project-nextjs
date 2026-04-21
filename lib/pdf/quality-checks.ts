import type { DocumentType } from "@/types/extraction";
import {
  countSectionTitles,
  looksLikeNoiseTitle,
  safeTopHeading,
  splitLines
} from "@/lib/pdf/extraction-helpers";
import type { ExtractorResult } from "@/lib/pdf/extraction-helpers";
import type { DocumentTypeClassification } from "@/lib/pdf/detect-document-type";

export function shouldFallbackToGeneric(
  classification: DocumentTypeClassification,
  extractorResult: ExtractorResult
): boolean {
  if (classification.type === "unknown") {
    return true;
  }

  if (classification.confidence < 0.58) {
    return true;
  }

  const meaningfulSections = countSectionTitles(extractorResult.sections);
  const populatedFields = Object.keys(extractorResult.fields).length;

  if (classification.type === "resume" && classification.confidence < 0.68) {
    return true;
  }

  if ((classification.type === "strategy" || classification.type === "proposal") && classification.confidence < 0.62) {
    return true;
  }

  return populatedFields < 2 && meaningfulSections < 1;
}

export function sanitizeDocumentTitle(text: string, fallbackTitle?: string | null): string | null {
  const candidate = fallbackTitle ?? safeTopHeading(text) ?? splitLines(text)[0] ?? null;
  if (!candidate || looksLikeNoiseTitle(candidate)) {
    return null;
  }

  return candidate.trim();
}

export function adjustConfidence(
  baseConfidence: number,
  documentType: DocumentType,
  fieldsCount: number,
  sectionCount: number,
  warningsCount: number
): number {
  const typeBonus = documentType !== "unknown" ? 0.08 : 0;
  const fieldBonus = Math.min(0.16, fieldsCount * 0.012);
  const sectionBonus = Math.min(0.12, sectionCount * 0.02);
  const warningPenalty = warningsCount * 0.03;

  return Math.max(
    0.2,
    Math.min(0.98, baseConfidence + typeBonus + fieldBonus + sectionBonus - warningPenalty)
  );
}

export function qualityWarnings(text: string, result: ExtractorResult): string[] {
  const warnings = [...(result.warnings ?? [])];

  if (looksLikeNoiseTitle(result.documentTitle)) {
    warnings.push("The document title could not be established confidently.");
  }

  if (text.length > 0 && Object.keys(result.fields).length === 0) {
    warnings.push("Useful raw text exists, but only limited structured fields were promoted.");
  }

  if (result.sections.length === 0 && result.documentCategory !== "bid_notice") {
    warnings.push("No reliable sections were derived from the document body.");
  }

  return Array.from(new Set(warnings));
}
