import {
  addField,
  collectTopEntities,
  mergeRecords,
  summarizeSectionTopics
} from "@/lib/pdf/extraction-helpers";
import type { ExtractionContext, ExtractorResult } from "@/lib/pdf/extraction-helpers";

export function extractGenericDocumentData(context: ExtractionContext): ExtractorResult {
  const fields = mergeRecords(context.keyValueFields);
  addField(fields, "Title", context.title);
  addField(fields, "Top Headings", summarizeSectionTopics(context.sections));
  addField(fields, "Detected Sections", context.sections.length);
  addField(fields, "Detected Tables", context.tables.length);

  const topics = summarizeSectionTopics(context.sections);
  const summary = [
    context.title ? `Document titled ${context.title}` : "Document with generic extraction",
    topics.length > 0 ? `with topics ${topics.slice(0, 3).join(", ")}` : null,
    context.sections.length > 0 ? `and ${context.sections.length} identified sections` : null
  ]
    .filter(Boolean)
    .join(" ");

  const warnings: string[] = [];
  if (topics.length === 0) {
    warnings.push("The document structure is ambiguous, so generic extraction was used.");
  }
  if (Object.keys(context.keyValueFields).length === 0) {
    warnings.push("No obvious key-value fields were detected, so the response relies on headings and raw text structure.");
  }

  return {
    documentCategory: "unknown",
    documentTitle: context.title,
    fields,
    entities: collectTopEntities(context),
    sections: context.sections,
    tables: context.tables,
    warnings,
    missingFields: Object.keys(fields).length === 0 ? ["Key Fields"] : [],
    summary: `${summary}.`,
    confidence: 0.48
  };
}
