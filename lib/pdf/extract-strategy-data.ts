import {
  addField,
  collectTopEntities,
  extractBulletListFromSection,
  mergeRecords,
  summarizeSectionTopics
} from "@/lib/pdf/extraction-helpers";
import type { ExtractionContext, ExtractorResult } from "@/lib/pdf/extraction-helpers";
import type { DocumentType } from "@/types/extraction";

export function extractStrategyData(
  context: ExtractionContext,
  category: "strategy" | "proposal"
): ExtractorResult {
  const goals = extractBulletListFromSection(
    context.sections,
    /\b(goals?|objectives?|strategic priorities|scope)\b/i
  );
  const initiatives = extractBulletListFromSection(
    context.sections,
    /\b(initiatives?|roadmap|implementation|deliverables?|workstreams?)\b/i
  );
  const milestones = extractBulletListFromSection(
    context.sections,
    /\b(milestones?|timeline|phases?)\b/i
  );
  const recommendations = extractBulletListFromSection(
    context.sections,
    /\b(recommendations?|next steps)\b/i
  );

  const fields = mergeRecords(context.keyValueFields);
  addField(fields, "Title", context.title);
  addField(fields, "Goals Or Objectives", goals);
  addField(fields, "Initiatives Or Deliverables", initiatives);
  addField(fields, "Milestones Or Timeline", milestones);
  addField(fields, "Recommendations", recommendations);
  addField(fields, "Section Topics", summarizeSectionTopics(context.sections));

  const summaryParts = [
    context.title
      ? `${category === "strategy" ? "Strategy document" : "Proposal"} titled ${context.title}`
      : category === "strategy"
        ? "Strategy document"
        : "Proposal document",
    goals.length > 0 ? `with ${goals.length} defined goals or objectives` : null,
    initiatives.length > 0 ? `${initiatives.length} initiatives or deliverables identified` : null,
    milestones.length > 0 ? `and timeline details present` : null
  ].filter(Boolean);

  const missingFields: string[] = [];
  if (goals.length === 0) {
    missingFields.push(category === "strategy" ? "Goals Or Objectives" : "Scope Or Objectives");
  }
  if (initiatives.length === 0) {
    missingFields.push(category === "strategy" ? "Initiatives" : "Deliverables");
  }

  const warnings: string[] = [];
  if (milestones.length === 0 && category === "proposal") {
    warnings.push("No explicit proposal timeline or milestone block was detected.");
  }

  return {
    documentCategory: category,
    documentTitle: context.title,
    fields,
    entities: collectTopEntities(context),
    sections: context.sections,
    tables: context.tables,
    warnings,
    missingFields,
    summary: `${summaryParts.join(" ")}.`,
    confidence: category === "strategy" ? 0.7 : 0.69
  };
}
