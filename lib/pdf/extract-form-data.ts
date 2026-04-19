import {
  addField,
  collectTopEntities,
  entityRecordFromPairs,
  groupFieldBlocks,
  mergeRecords
} from "@/lib/pdf/extraction-helpers";
import type { ExtractionContext, ExtractorResult } from "@/lib/pdf/extraction-helpers";

export function extractFormData(context: ExtractionContext): ExtractorResult {
  const groupedBlocks = groupFieldBlocks(context.lines);
  const applicant =
    context.keyValueFields["Name"] ??
    context.keyValueFields["Applicant Name"] ??
    context.keyValueFields["Submitted By"] ??
    null;

  const fields = mergeRecords(groupedBlocks, context.keyValueFields);
  addField(fields, "Form Title", context.title);
  addField(fields, "Applicant Or Respondent", applicant);
  addField(fields, "Field Groups", Object.keys(groupedBlocks));

  const summary = [
    context.title ? `Form titled ${context.title}` : "Form document",
    applicant ? `for ${String(applicant)}` : null,
    Object.keys(groupedBlocks).length > 0 ? `with ${Object.keys(groupedBlocks).length} field groups` : null
  ]
    .filter(Boolean)
    .join(" ");

  return {
    documentCategory: "form",
    documentTitle: context.title,
    fields,
    entities: mergeRecords(
      collectTopEntities(context),
      entityRecordFromPairs([
        ["applicant", typeof applicant === "string" ? applicant : null],
        ["fieldGroups", Object.keys(groupedBlocks)]
      ])
    ),
    sections: context.sections,
    tables: context.tables,
    missingFields: Object.keys(context.keyValueFields).length === 0 ? ["Field Values"] : [],
    summary: `${summary}.`,
    confidence: 0.66
  };
}
