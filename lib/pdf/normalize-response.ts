import { extractionResponseSchema } from "@/lib/schemas/extraction-response";
import { compactObject } from "@/lib/utils/object-helpers";
import type {
  DocumentType,
  ExtractionFailureResponse,
  ExtractionResponse,
  ExtractionSuccessResponse,
  SourceType,
  StructuredData
} from "@/types/extraction";

interface SuccessInput {
  name: string;
  pages?: number;
  type: DocumentType;
  sourceType: SourceType;
  summary: string;
  confidence: number;
  structuredData: StructuredData;
  rawText: string;
  warnings?: string[];
  missingFields?: string[];
  parser?: string;
  ocrUsed?: boolean;
  status?: "success" | "partial_success";
}

interface FailureInput {
  name: string;
  pages?: number;
  type?: DocumentType;
  sourceType?: SourceType;
  message: string;
  summary?: string;
  confidence?: number;
  rawText?: string;
  warnings?: string[];
  missingFields?: string[];
  parser?: string;
  ocrUsed?: boolean;
}

function baseMeta(parser = "pdf-parse", ocrUsed = false) {
  return {
    ocrUsed,
    parser,
    processedAt: new Date().toISOString()
  };
}

export function normalizeExtractionSuccess(input: SuccessInput): ExtractionSuccessResponse {
  const payload: ExtractionSuccessResponse = {
    success: true,
    status: input.status ?? "success",
    document: compactObject({
      name: input.name,
      pages: input.pages,
      type: input.type,
      sourceType: input.sourceType
    }) as ExtractionSuccessResponse["document"],
    summary: input.summary,
    confidence: Math.max(0, Math.min(1, input.confidence)),
    structuredData: input.structuredData,
    rawText: input.rawText,
    warnings: input.warnings ?? [],
    missingFields: input.missingFields ?? [],
    meta: baseMeta(input.parser, input.ocrUsed)
  };

  return extractionResponseSchema.parse(payload) as ExtractionSuccessResponse;
}

export function normalizeExtractionFailure(input: FailureInput): ExtractionFailureResponse {
  const payload: ExtractionFailureResponse = {
    success: false,
    status: "failed",
    message: input.message,
    document: compactObject({
      name: input.name,
      pages: input.pages,
      type: input.type ?? "unknown",
      sourceType: input.sourceType ?? "unknown"
    }) as ExtractionFailureResponse["document"],
    summary: input.summary ?? "",
    confidence: Math.max(0, Math.min(1, input.confidence ?? 0.2)),
    structuredData: null,
    rawText: input.rawText ?? "",
    warnings: input.warnings ?? [],
    missingFields: input.missingFields ?? [],
    meta: baseMeta(input.parser, input.ocrUsed)
  };

  return extractionResponseSchema.parse(payload) as ExtractionFailureResponse;
}

export function assertExtractionResponse(value: unknown): ExtractionResponse {
  return extractionResponseSchema.parse(value);
}
