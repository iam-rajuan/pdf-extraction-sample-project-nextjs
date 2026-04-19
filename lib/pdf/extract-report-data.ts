import {
  addField,
  collectTopEntities,
  mergeRecords,
  summarizeSectionTopics
} from "@/lib/pdf/extraction-helpers";
import type { ExtractionContext, ExtractorResult } from "@/lib/pdf/extraction-helpers";

export function extractReportData(context: ExtractionContext): ExtractorResult {
  const executiveSummarySection = context.sections.find((section) =>
    /\bexecutive summary|summary\b/i.test(section.title)
  );
  const findingsSection = context.sections.find((section) => /\bfindings?|analysis\b/i.test(section.title));
  const recommendationsSection = context.sections.find((section) =>
    /\brecommendations?|next steps\b/i.test(section.title)
  );

  const fields = mergeRecords(context.keyValueFields);
  addField(fields, "Title", context.title);
  addField(fields, "Executive Summary", executiveSummarySection?.content ?? null);
  addField(fields, "Key Findings", findingsSection?.content ?? null);
  addField(fields, "Recommendations", recommendationsSection?.content ?? null);
  addField(fields, "Section Topics", summarizeSectionTopics(context.sections));

  const topics = summarizeSectionTopics(context.sections);
  const summary = [
    context.title ? `Report titled ${context.title}` : "Report document",
    topics.length > 0 ? `covering ${topics.slice(0, 3).join(", ")}` : null,
    context.sections.length > 0 ? `across ${context.sections.length} sections` : null
  ]
    .filter(Boolean)
    .join(" ");

  const warnings: string[] = [];
  if (!executiveSummarySection && !findingsSection) {
    warnings.push("Report sections were inferred from document headings rather than explicit report markers.");
  }

  return {
    documentCategory: "report",
    documentTitle: context.title,
    fields,
    entities: collectTopEntities(context),
    sections: context.sections,
    tables: context.tables,
    warnings,
    missingFields: topics.length === 0 ? ["Section Topics"] : [],
    summary: `${summary}.`,
    confidence: 0.67
  };
}
