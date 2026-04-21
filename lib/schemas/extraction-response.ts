import { z } from "zod";

export const extractionStatusSchema = z.enum(["success", "partial_success", "failed"]);
export const documentTypeSchema = z.enum([
  "resume",
  "invoice",
  "receipt",
  "report",
  "contract",
  "form",
  "strategy",
  "proposal",
  "bid_notice",
  "unknown"
]);
export const sourceTypeSchema = z.enum([
  "text_pdf",
  "scanned_pdf",
  "ocr_fallback",
  "unknown"
]);

export const structuredValueSchema: z.ZodTypeAny = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(structuredValueSchema),
    z.record(structuredValueSchema)
  ])
);

export const sectionTableSchema = z.object({
  headers: z.array(z.string()),
  rows: z.array(z.array(structuredValueSchema))
});

export const extractedSectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  fields: z.record(structuredValueSchema).optional(),
  table: sectionTableSchema.nullable().optional()
});

export const structuredDataSchema = z.object({
  documentTitle: z.string().nullable().optional(),
  documentCategory: documentTypeSchema.optional(),
  fields: z.record(structuredValueSchema),
  sections: z.array(extractedSectionSchema),
  entities: z.record(structuredValueSchema).optional(),
  tables: z.array(sectionTableSchema).optional()
});

export const extractionDocumentSchema = z.object({
  name: z.string(),
  pages: z.number().optional(),
  type: documentTypeSchema,
  sourceType: sourceTypeSchema
});

export const extractionMetaSchema = z.object({
  ocrUsed: z.boolean(),
  parser: z.string(),
  processedAt: z.string().datetime()
});

export const extractionSuccessResponseSchema = z.object({
  success: z.literal(true),
  status: z.union([z.literal("success"), z.literal("partial_success")]),
  document: extractionDocumentSchema,
  summary: z.string(),
  confidence: z.number().min(0).max(1),
  structuredData: structuredDataSchema,
  rawText: z.string(),
  warnings: z.array(z.string()),
  missingFields: z.array(z.string()),
  meta: extractionMetaSchema
});

export const extractionFailureResponseSchema = z.object({
  success: z.literal(false),
  status: z.literal("failed"),
  message: z.string(),
  document: extractionDocumentSchema,
  summary: z.string(),
  confidence: z.number().min(0).max(1),
  structuredData: z.null(),
  rawText: z.string(),
  warnings: z.array(z.string()),
  missingFields: z.array(z.string()),
  meta: extractionMetaSchema
});

export const extractionResponseSchema = z.union([
  extractionSuccessResponseSchema,
  extractionFailureResponseSchema
]);
