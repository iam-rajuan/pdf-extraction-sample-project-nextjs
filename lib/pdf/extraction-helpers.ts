import { flattenKeyValueLines, isRecord, toTitleCase } from "@/lib/utils/object-helpers";
import { safeString } from "@/lib/utils/safe-json";
import type {
  DocumentType,
  ExtractedSection,
  SectionTable,
  StructuredData,
  StructuredRecord,
  StructuredValue
} from "@/types/extraction";

export interface ExtractionContext {
  text: string;
  normalizedText: string;
  lines: string[];
  topLines: string[];
  keyValueFields: StructuredRecord;
  title: string | null;
  sections: ExtractedSection[];
  tables: SectionTable[];
}

export interface ExtractorResult {
  documentCategory: DocumentType;
  documentTitle: string | null;
  fields: StructuredRecord;
  entities?: StructuredRecord;
  sections: ExtractedSection[];
  tables?: SectionTable[];
  warnings?: string[];
  missingFields?: string[];
  summary: string;
  confidence: number;
}

export function normalizeText(text: string): string {
  return text
    .replace(/\u0000/g, "")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function splitLines(text: string): string[] {
  return normalizeText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function looksLikeNoiseTitle(value: string | null): boolean {
  if (!value) {
    return true;
  }

  const trimmed = value.trim();
  if (trimmed.length < 4 || trimmed.length > 120) {
    return true;
  }

  if (/^(https?:\/\/|www\.)/i.test(trimmed)) {
    return true;
  }

  if (/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(trimmed)) {
    return true;
  }

  if (/^\+?\d[\d\s().-]{6,}$/.test(trimmed)) {
    return true;
  }

  return false;
}

export function detectDocumentTitle(lines: string[]): string | null {
  const candidates = lines.filter((line) => line.length >= 5 && line.length <= 90).slice(0, 8);

  for (const candidate of candidates) {
    if (!looksLikeNoiseTitle(candidate)) {
      return candidate;
    }
  }

  return null;
}

export function extractEmails(text: string): string[] {
  return Array.from(new Set(text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [])).slice(
    0,
    8
  );
}

export function extractPhones(text: string): string[] {
  return Array.from(
    new Set(text.match(/(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/g) ?? [])
  ).slice(0, 8);
}

export function extractUrls(text: string): string[] {
  return Array.from(new Set(text.match(/https?:\/\/[^\s]+|www\.[^\s]+/gi) ?? [])).slice(0, 8);
}

export function extractDates(text: string): string[] {
  return Array.from(
    new Set(
      text.match(
        /\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}|\d{4}-\d{2}-\d{2})\b/gi
      ) ?? []
    )
  ).slice(0, 12);
}

export function extractCurrencyAmounts(text: string): string[] {
  return Array.from(
    new Set(text.match(/(?:USD|EUR|GBP|BDT|\$|€|£|Tk\.?)\s?\d[\d,]*(?:\.\d{2})?/gi) ?? [])
  ).slice(0, 12);
}

export function findFirstMatch(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return null;
}

export function addField(
  fields: StructuredRecord,
  key: string,
  value: StructuredValue | null | undefined
): void {
  if (value === null || value === undefined) {
    return;
  }

  if (typeof value === "string" && value.trim().length === 0) {
    return;
  }

  if (Array.isArray(value) && value.length === 0) {
    return;
  }

  if (typeof value === "object" && !Array.isArray(value) && value !== null && Object.keys(value).length === 0) {
    return;
  }

  fields[key] = value;
}

function looksLikeTableLine(line: string): boolean {
  const separators = (line.match(/\s{2,}|\t/g) ?? []).length;
  return separators >= 2 && /[A-Za-z]/.test(line) && /\d/.test(line);
}

function parseTable(lines: string[]): SectionTable | null {
  const tableLines = lines.filter(looksLikeTableLine).slice(0, 20);
  if (tableLines.length < 2) {
    return null;
  }

  const rows = tableLines.map((line) =>
    line
      .split(/\s{2,}|\t/)
      .map((cell) => cell.trim())
      .filter(Boolean)
  );
  const headers = rows[0];
  const body = rows.slice(1).filter((row) => row.length >= Math.max(2, headers.length - 1));

  if (headers.length < 2 || body.length === 0) {
    return null;
  }

  return {
    headers,
    rows: body.map((row) => row.slice(0, headers.length))
  };
}

export function buildSectionsFromText(text: string): ExtractedSection[] {
  const chunks = normalizeText(text)
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .slice(0, 16);

  return chunks.map((chunk, index) => {
    const lines = chunk.split("\n").map((line) => line.trim()).filter(Boolean);
    const firstLine = lines[0] ?? `Section ${index + 1}`;
    const headingLike = /^[A-Z][A-Za-z0-9 /&(),.-]{2,60}$/.test(firstLine);
    const title = headingLike || firstLine.length <= 60 ? firstLine : `Section ${index + 1}`;

    return {
      id: `section-${index + 1}`,
      title,
      content: lines.join("\n"),
      fields: flattenKeyValueLines(chunk),
      table: parseTable(lines)
    };
  });
}

export function buildExtractionContext(text: string): ExtractionContext {
  const normalizedText = normalizeText(text);
  const lines = splitLines(normalizedText);
  const sections = buildSectionsFromText(normalizedText);
  const tables = sections.flatMap((section) => (section.table ? [section.table] : []));

  return {
    text,
    normalizedText,
    lines,
    topLines: lines.slice(0, 12),
    keyValueFields: flattenKeyValueLines(normalizedText),
    title: detectDocumentTitle(lines),
    sections,
    tables
  };
}

export function countSectionTitles(sections: ExtractedSection[]): number {
  return sections.filter((section) => !/^Section \d+$/.test(section.title)).length;
}

export function collectTopEntities(context: ExtractionContext): StructuredRecord {
  const entities: StructuredRecord = {};
  addField(entities, "emails", extractEmails(context.normalizedText));
  addField(entities, "phones", extractPhones(context.normalizedText));
  addField(entities, "urls", extractUrls(context.normalizedText));
  addField(entities, "dates", extractDates(context.normalizedText));
  addField(entities, "amounts", extractCurrencyAmounts(context.normalizedText));
  return entities;
}

export function mergeRecords(...records: Array<StructuredRecord | undefined>): StructuredRecord {
  return records.reduce<StructuredRecord>((accumulator, record) => {
    if (!record) {
      return accumulator;
    }

    for (const [key, value] of Object.entries(record)) {
      accumulator[key] = value;
    }

    return accumulator;
  }, {});
}

export function extractBulletListFromSection(
  sections: ExtractedSection[],
  matcher: RegExp
): string[] {
  const section = sections.find((item) => matcher.test(item.title));
  if (!section) {
    return [];
  }

  return section.content
    .split("\n")
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter((line) => line.length > 1 && line.toLowerCase() !== section.title.toLowerCase())
    .slice(0, 20);
}

export function inferNameFromTop(lines: string[]): string | null {
  const candidate = lines.find((line) => /^[A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){1,3}$/.test(line));
  return candidate ?? null;
}

export function findSectionByTitle(
  sections: ExtractedSection[],
  matcher: RegExp
): ExtractedSection | undefined {
  return sections.find((section) => matcher.test(section.title));
}

export function linesBetween(text: string, start: RegExp, end: RegExp): string[] {
  const lines = splitLines(text);
  const startIndex = lines.findIndex((line) => start.test(line));

  if (startIndex === -1) {
    return [];
  }

  const collected: string[] = [];
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (end.test(line)) {
      break;
    }

    collected.push(line);
  }

  return collected;
}

export function safeTopHeading(text: string): string | null {
  const lines = splitLines(text).slice(0, 8);
  for (const line of lines) {
    if (/^(page \d+|phone|email|www\.|https?:\/\/)/i.test(line)) {
      continue;
    }
    if (!looksLikeNoiseTitle(line)) {
      return line;
    }
  }
  return null;
}

export function finalizeStructuredData(result: ExtractorResult): StructuredData {
  return {
    documentTitle: result.documentTitle,
    documentCategory: result.documentCategory,
    fields: result.fields,
    entities: result.entities,
    sections: result.sections,
    tables: result.tables
  };
}

export function summarizeSectionTopics(sections: ExtractedSection[]): string[] {
  return sections
    .map((section) => safeString(section.title))
    .filter((title) => title && !/^Section \d+$/.test(title))
    .slice(0, 6);
}

export function entityRecordFromPairs(
  pairs: Array<[string, StructuredValue | null | undefined]>
): StructuredRecord {
  const record: StructuredRecord = {};
  for (const [key, value] of pairs) {
    addField(record, key, value);
  }
  return record;
}

export function isLikelyHeading(line: string): boolean {
  if (line.length < 3 || line.length > 80) {
    return false;
  }

  return /^[A-Z][A-Za-z0-9 /&(),.-]+$/.test(line) || /^[A-Z][A-Z /&()-]+$/.test(line);
}

export function groupFieldBlocks(lines: string[]): StructuredRecord {
  const groups: StructuredRecord = {};
  let currentKey = "General";
  let currentLines: string[] = [];

  const flush = () => {
    if (currentLines.length > 0) {
      groups[currentKey] = currentLines.join("\n");
      currentLines = [];
    }
  };

  for (const line of lines) {
    if (isLikelyHeading(line)) {
      flush();
      currentKey = toTitleCase(line);
      continue;
    }

    currentLines.push(line);
  }

  flush();
  return groups;
}

export function structuredRecordFromUnknown(value: unknown): StructuredRecord {
  return isRecord(value) ? (value as StructuredRecord) : {};
}
