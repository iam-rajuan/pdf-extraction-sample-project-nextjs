import type {
  ContactDetail,
  OtherRequirement,
  RequirementDetail,
  ReturnableDocument,
  SbdForm,
  TenderExtraction,
  TenderExtractionError
} from "@/lib/tender/schema";

export type {
  ContactDetail,
  OtherRequirement,
  RequirementDetail,
  ReturnableDocument,
  SbdForm,
  TenderExtraction,
  TenderExtractionError
};

export type ExtractionStatus = "success" | "partial_success" | "failed";

export type DocumentType =
  | "resume"
  | "invoice"
  | "receipt"
  | "report"
  | "contract"
  | "form"
  | "strategy"
  | "proposal"
  | "bid_notice"
  | "unknown";

export type SourceType = "text_pdf" | "scanned_pdf" | "ocr_fallback" | "unknown";

export type PrimitiveValue = string | number | boolean | null;

export type StructuredValue =
  | PrimitiveValue
  | StructuredRecord
  | StructuredValue[];

export interface StructuredRecord {
  [key: string]: StructuredValue;
}

export interface SectionTable {
  headers: string[];
  rows: StructuredValue[][];
}

export interface ExtractedSection {
  id: string;
  title: string;
  content: string;
  fields?: StructuredRecord;
  table?: SectionTable | null;
}

export interface StructuredData {
  documentTitle?: string | null;
  documentCategory?: DocumentType;
  fields: StructuredRecord;
  sections: ExtractedSection[];
  entities?: StructuredRecord;
  tables?: SectionTable[];
}

export interface ExtractionDocument {
  name: string;
  pages?: number;
  type: DocumentType;
  sourceType: SourceType;
}

export interface ExtractionMeta {
  ocrUsed: boolean;
  parser: string;
  processedAt: string;
}

export interface ExtractionSuccessResponse {
  success: true;
  status: "success" | "partial_success";
  document: ExtractionDocument;
  summary: string;
  confidence: number;
  structuredData: StructuredData;
  rawText: string;
  warnings: string[];
  missingFields: string[];
  meta: ExtractionMeta;
}

export interface ExtractionFailureResponse {
  success: false;
  status: "failed";
  message: string;
  document: ExtractionDocument;
  summary: string;
  confidence: number;
  structuredData: null;
  rawText: string;
  warnings: string[];
  missingFields: string[];
  meta: ExtractionMeta;
}

export type ExtractionResponse =
  | ExtractionSuccessResponse
  | ExtractionFailureResponse;
