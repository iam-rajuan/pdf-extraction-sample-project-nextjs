import {
  addField,
  collectTopEntities,
  entityRecordFromPairs,
  findFirstMatch,
  mergeRecords,
  summarizeSectionTopics
} from "@/lib/pdf/extraction-helpers";
import type { ExtractionContext, ExtractorResult } from "@/lib/pdf/extraction-helpers";

export function extractContractData(context: ExtractionContext): ExtractorResult {
  const title =
    findFirstMatch(context.normalizedText, [/^([A-Z][A-Z ]+AGREEMENT[ A-Z]*)/m, /^([A-Z][A-Za-z ]+Agreement)/m]) ??
    context.title;
  const effectiveDate = findFirstMatch(context.normalizedText, [/\beffective date\s*[:\-]?\s*([^\n]+)/i]);
  const term = findFirstMatch(context.normalizedText, [
    /\bterm(?: and termination)?\s*[:\-]?\s*([^\n]+)/i,
    /\bduration\s*[:\-]?\s*([^\n]+)/i
  ]);
  const parties = Array.from(
    new Set(
      (context.normalizedText.match(/\b(?:between|party|parties)\b.{0,120}/gi) ?? []).map((item) => item.trim())
    )
  ).slice(0, 4);
  const signatures = context.lines.filter((line) => /\bsignature\b/i.test(line)).slice(0, 6);

  const fields = mergeRecords(context.keyValueFields);
  addField(fields, "Agreement Title", title);
  addField(fields, "Effective Date", effectiveDate);
  addField(fields, "Term", term);
  addField(fields, "Parties", parties);
  addField(fields, "Signature References", signatures);
  addField(fields, "Clause Topics", summarizeSectionTopics(context.sections));

  return {
    documentCategory: "contract",
    documentTitle: title,
    fields,
    entities: mergeRecords(
      collectTopEntities(context),
      entityRecordFromPairs([
        ["parties", parties],
        ["effectiveDate", effectiveDate],
        ["term", term]
      ])
    ),
    sections: context.sections,
    tables: context.tables,
    missingFields: ["Agreement Title", "Effective Date"].filter((key) => !(key in fields)),
    summary: [
      title ? `${title}` : "Contract document",
      parties.length > 0 ? `covering ${parties[0]}` : null,
      effectiveDate ? `effective ${effectiveDate}` : null
    ]
      .filter(Boolean)
      .join(" ")
      .concat("."),
    confidence: 0.7
  };
}
