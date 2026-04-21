import { classifyDocumentType } from "@/lib/pdf/detect-document-type";
import { extractBidNoticeData } from "@/lib/pdf/extract-bid-notice-data";
import { extractContractData } from "@/lib/pdf/extract-contract-data";
import { extractFormData } from "@/lib/pdf/extract-form-data";
import { extractGenericDocumentData } from "@/lib/pdf/extract-generic-document-data";
import { extractInvoiceData } from "@/lib/pdf/extract-invoice-data";
import { extractReceiptData } from "@/lib/pdf/extract-receipt-data";
import { extractReportData } from "@/lib/pdf/extract-report-data";
import { extractResumeData } from "@/lib/pdf/extract-resume-data";
import { extractStrategyData } from "@/lib/pdf/extract-strategy-data";
import {
  buildExtractionContext,
  finalizeStructuredData,
  type ExtractionContext,
  type ExtractorResult
} from "@/lib/pdf/extraction-helpers";
import {
  adjustConfidence,
  qualityWarnings,
  sanitizeDocumentTitle,
  shouldFallbackToGeneric
} from "@/lib/pdf/quality-checks";
import type { DocumentType } from "@/types/extraction";

function executeExtractor(type: DocumentType, context: ExtractionContext): ExtractorResult {
  switch (type) {
    case "resume":
      return extractResumeData(context);
    case "invoice":
      return extractInvoiceData(context);
    case "receipt":
      return extractReceiptData(context);
    case "contract":
      return extractContractData(context);
    case "report":
      return extractReportData(context);
    case "form":
      return extractFormData(context);
    case "strategy":
      return extractStrategyData(context, "strategy");
    case "proposal":
      return extractStrategyData(context, "proposal");
    case "bid_notice":
      return extractBidNoticeData(context);
    case "unknown":
    default:
      return extractGenericDocumentData(context);
  }
}

export function extractDocumentData(text: string) {
  const context = buildExtractionContext(text);
  const classification = classifyDocumentType(text);

  let result = executeExtractor(classification.type, context);

  if (shouldFallbackToGeneric(classification, result)) {
    result = extractGenericDocumentData(context);
  }

  result.documentTitle = sanitizeDocumentTitle(text, result.documentTitle);
  result.warnings = qualityWarnings(text, result);
  result.confidence = adjustConfidence(
    Math.max(result.confidence, classification.confidence),
    result.documentCategory,
    Object.keys(result.fields).length,
    result.sections.length,
    result.warnings.length
  );

  return {
    documentType: result.documentCategory,
    structuredData: finalizeStructuredData(result),
    summary: result.summary,
    missingFields: result.missingFields ?? [],
    warnings: result.warnings,
    confidence: result.confidence,
    classification
  };
}
