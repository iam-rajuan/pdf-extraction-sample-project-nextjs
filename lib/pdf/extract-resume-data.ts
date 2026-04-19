import {
  addField,
  collectTopEntities,
  entityRecordFromPairs,
  extractBulletListFromSection,
  extractDates,
  extractEmails,
  extractPhones,
  extractUrls,
  findSectionByTitle,
  inferNameFromTop,
  mergeRecords
} from "@/lib/pdf/extraction-helpers";
import type { ExtractionContext, ExtractorResult } from "@/lib/pdf/extraction-helpers";
import type { StructuredRecord } from "@/types/extraction";

function extractCandidateInfo(context: ExtractionContext): StructuredRecord {
  const name = inferNameFromTop(context.topLines);
  const headline = context.topLines.find(
    (line) =>
      !name || line !== name
        ? /\b(engineer|developer|manager|analyst|consultant|designer|specialist|lead)\b/i.test(line)
        : false
  );

  return entityRecordFromPairs([
    ["name", name],
    ["headline", headline ?? null],
    ["emails", extractEmails(context.normalizedText)],
    ["phones", extractPhones(context.normalizedText)],
    ["urls", extractUrls(context.normalizedText)]
  ]);
}

export function extractResumeData(context: ExtractionContext): ExtractorResult {
  const candidate = extractCandidateInfo(context);
  const candidateName = typeof candidate.name === "string" ? candidate.name : null;
  const candidateHeadline = typeof candidate.headline === "string" ? candidate.headline : null;
  const summarySection = findSectionByTitle(context.sections, /\b(summary|profile|objective)\b/i);
  const experienceSection = findSectionByTitle(context.sections, /\bexperience|employment|work history\b/i);
  const educationSection = findSectionByTitle(context.sections, /\beducation\b/i);
  const skills = extractBulletListFromSection(context.sections, /\bskills|competencies|technologies\b/i);
  const certifications = extractBulletListFromSection(context.sections, /\bcertifications?|licenses?\b/i);

  const fields = mergeRecords(context.keyValueFields);
  addField(fields, "Candidate Name", candidateName);
  addField(fields, "Professional Headline", candidateHeadline);
  addField(fields, "Summary", summarySection?.content ?? null);
  addField(fields, "Skills", skills);
  addField(fields, "Education", educationSection?.content ?? null);
  addField(fields, "Experience", experienceSection?.content ?? null);
  addField(fields, "Certifications", certifications);
  addField(fields, "Date Mentions", extractDates(context.normalizedText));

  const missingFields = ["Candidate Name", "Skills", "Experience"].filter(
    (key) => !(key in fields) || (typeof fields[key] === "string" && String(fields[key]).trim().length === 0)
  );

  const summaryParts = [
    candidateName ? `${candidateName}'s resume` : "Resume document",
    candidateHeadline ? `for a ${candidateHeadline}` : null,
    skills.length > 0 ? `highlighting ${skills.slice(0, 4).join(", ")}` : null,
    experienceSection ? "with work experience details present" : null
  ].filter(Boolean);

  return {
    documentCategory: "resume",
    documentTitle: candidateName ?? context.title,
    fields,
    entities: mergeRecords(candidate, collectTopEntities(context)),
    sections: context.sections,
    tables: context.tables,
    missingFields,
    summary: `${summaryParts.join(" ")}.`,
    confidence: 0.68
  };
}
