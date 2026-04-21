import {
  addField,
  collectTopEntities,
  extractEmails,
  extractPhones
} from "@/lib/pdf/extraction-helpers";
import type {
  ExtractionContext,
  ExtractorResult
} from "@/lib/pdf/extraction-helpers";
import type { StructuredRecord } from "@/types/extraction";

type SbdFormCode = "SBD 1" | "SBD 3" | "SBD 4" | "SBD 6.1" | string;

const monthIndex: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11
};

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(values.map((value) => (value ? normalizeWhitespace(value) : "")).filter(Boolean))
  );
}

function matchLabeledValue(text: string, labels: string[]): string | null {
  for (const label of labels) {
    const match = text.match(
      new RegExp(`(?:^|\\n)\\s*(?:${label})\\s*[:\\-]?\\s*([^\\n]+)`, "i")
    );
    if (match?.[1]) {
      return normalizeWhitespace(match[1]);
    }
  }

  return null;
}

function normalizeDate(raw: string | null): string | null {
  if (!raw) {
    return null;
  }

  const value = normalizeWhitespace(raw).replace(/[,]/g, "");
  const isoMatch = value.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const slashMatch = value.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/);
  if (slashMatch) {
    const day = Number(slashMatch[1]);
    const month = Number(slashMatch[2]);
    const year = Number(slashMatch[3].length === 2 ? `20${slashMatch[3]}` : slashMatch[3]);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day
        .toString()
        .padStart(2, "0")}`;
    }
  }

  const monthFirstMatch = value.match(
    /\b([A-Za-z]{3,9})\s+(\d{1,2})(?:st|nd|rd|th)?\s+(\d{4})\b/i
  );
  if (monthFirstMatch) {
    const month = monthIndex[monthFirstMatch[1].toLowerCase()];
    const day = Number(monthFirstMatch[2]);
    const year = Number(monthFirstMatch[3]);
    if (month !== undefined) {
      return `${year.toString().padStart(4, "0")}-${String(month + 1).padStart(2, "0")}-${day
        .toString()
        .padStart(2, "0")}`;
    }
  }

  const dayFirstMatch = value.match(
    /\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\s+(\d{4})\b/i
  );
  if (dayFirstMatch) {
    const day = Number(dayFirstMatch[1]);
    const month = monthIndex[dayFirstMatch[2].toLowerCase()];
    const year = Number(dayFirstMatch[3]);
    if (month !== undefined) {
      return `${year.toString().padStart(4, "0")}-${String(month + 1).padStart(2, "0")}-${day
        .toString()
        .padStart(2, "0")}`;
    }
  }

  return null;
}

function normalizeTime(raw: string | null): string | null {
  if (!raw) {
    return null;
  }

  const value = normalizeWhitespace(raw).toUpperCase();
  const meridiemMatch = value.match(/\b(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\b/);
  if (meridiemMatch) {
    let hour = Number(meridiemMatch[1]);
    const minute = Number(meridiemMatch[2] ?? "00");
    const meridiem = meridiemMatch[3];
    if (meridiem === "PM" && hour < 12) {
      hour += 12;
    }
    if (meridiem === "AM" && hour === 12) {
      hour = 0;
    }
    return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}:00`;
  }

  const timeMatch = value.match(/\b(\d{1,2}):(\d{2})(?::(\d{2}))?\b/);
  if (timeMatch) {
    const hour = Number(timeMatch[1]);
    const minute = Number(timeMatch[2]);
    const second = Number(timeMatch[3] ?? "0");
    if (hour <= 23 && minute <= 59 && second <= 59) {
      return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}:${second
        .toString()
        .padStart(2, "0")}`;
    }
  }

  return null;
}

function findFirstLine(context: ExtractionContext, patterns: RegExp[]): string | null {
  for (const line of context.lines) {
    if (patterns.some((pattern) => pattern.test(line))) {
      return normalizeWhitespace(line);
    }
  }

  return null;
}

function findSectionLines(context: ExtractionContext, patterns: RegExp[]): string[] {
  const matchedSections = context.sections.filter((section) =>
    patterns.some((pattern) => pattern.test(section.title))
  );

  if (matchedSections.length === 0) {
    return [];
  }

  return matchedSections.flatMap((section) =>
    section.content
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
  );
}

function extractListItems(lines: string[]): string[] {
  return uniqueStrings(
    lines
      .map((line) => line.replace(/^[\-\u2022*]+\s*/, "").replace(/^[A-Za-z0-9]+[.)]\s+/, "").trim())
      .filter(
        (line) =>
          line.length > 5 &&
          !/^(scope of work|technical requirements|returnable documents|mandatory forms?)$/i.test(line)
      )
  ).slice(0, 20);
}

function extractBidNumber(context: ExtractionContext): string | null {
  return (
    matchLabeledValue(context.normalizedText, [
      "bid number",
      "tender number",
      "bid no\\.?",
      "tender no\\.?",
      "contract number",
      "reference number",
      "rfq number"
    ]) ??
    context.lines
      .map((line) => line.match(/\b(?:BID|TENDER|RFQ|RFP|SCM)[\s:/-]*([A-Z0-9./-]{3,})\b/i)?.[1] ?? null)
      .find(Boolean) ??
    null
  );
}

function extractTitle(context: ExtractionContext): string | null {
  return (
    matchLabeledValue(context.normalizedText, [
      "tender title",
      "description",
      "bid description",
      "title",
      "description of goods or services",
      "description of bid"
    ]) ?? context.title
  );
}

function extractBriefingSession(context: ExtractionContext) {
  const briefingLine =
    findFirstLine(context, [/\bbriefing session\b/i, /\bcompulsory briefing\b/i, /\bsite inspection\b/i]) ??
    matchLabeledValue(context.normalizedText, ["briefing session", "compulsory briefing session"]);

  const required = briefingLine ? /\bcompulsory|required\b/i.test(briefingLine) : null;
  const date = normalizeDate(briefingLine);
  const time = normalizeTime(briefingLine);
  const venue =
    briefingLine && !date && !time
      ? briefingLine
      : matchLabeledValue(context.normalizedText, [
          "briefing venue",
          "briefing session venue",
          "venue"
        ]);

  return {
    required,
    date,
    time,
    venue: venue ? normalizeWhitespace(venue) : null
  };
}

function extractSubmissionMethod(context: ExtractionContext): string | null {
  const labeled = matchLabeledValue(context.normalizedText, [
    "submission method",
    "method of submission",
    "bid submission method"
  ]);
  if (labeled) {
    return labeled.toLowerCase();
  }

  const line = findFirstLine(context, [/\betender\b/i, /\be-?submission\b/i, /\bhand delivery\b/i]);
  if (!line) {
    return null;
  }

  if (/\betender\b|\be-?submission\b/i.test(line)) {
    return "electronic";
  }

  if (/\bhand delivery\b/i.test(line)) {
    return "physical";
  }

  return line.toLowerCase();
}

function extractIssuingDepartment(context: ExtractionContext): string | null {
  return matchLabeledValue(context.normalizedText, [
    "issuing department",
    "department",
    "municipality",
    "institution",
    "name of institution"
  ]);
}

function extractComplianceRequirements(context: ExtractionContext) {
  const text = context.normalizedText;
  const bbbeeLine = findFirstLine(context, [/\bbbbee\b/i, /\bpreference points\b/i]);

  let preferencePointsSystem: string | null = null;
  if (/\b80\/20\b/.test(text)) {
    preferencePointsSystem = "80/20";
  } else if (/\b90\/10\b/.test(text)) {
    preferencePointsSystem = "90/10";
  }

  return {
    taxComplianceRequired: /\btax compliance\b|\btax clearance\b|\bsars\b/i.test(text),
    csdRegistrationRequired: /\bcsd\b|\bcentral supplier database\b/i.test(text),
    bbbeePreferencePointsRequirement: {
      required: /\bbbbee\b|\bpreference points\b/i.test(text),
      system: preferencePointsSystem
    },
    declarationOfInterestRequired: /\bdeclaration of interest\b|\bsbd\s*4\b/i.test(text),
    sourceLines: uniqueStrings([
      findFirstLine(context, [/\btax compliance\b/i, /\btax clearance\b/i, /\bsars\b/i]),
      findFirstLine(context, [/\bcsd\b/i, /\bcentral supplier database\b/i]),
      bbbeeLine,
      findFirstLine(context, [/\bdeclaration of interest\b/i, /\bsbd\s*4\b/i])
    ])
  };
}

function extractMandatorySbdForms(context: ExtractionContext): StructuredRecord[] {
  const referenced = new Map<string, string>();

  for (const line of context.lines) {
    const matches = line.match(/\bSBD\s*(\d+(?:\.\d+)?)\b/gi) ?? [];
    for (const match of matches) {
      const normalizedCode = `SBD ${match.replace(/SBD/i, "").trim()}`.replace(/\s+/g, " ");
      if (!referenced.has(normalizedCode)) {
        referenced.set(normalizedCode, normalizeWhitespace(line));
      }
    }
  }

  const priorityForms: SbdFormCode[] = ["SBD 1", "SBD 3", "SBD 4", "SBD 6.1"];
  const allCodes = Array.from(new Set([...priorityForms, ...referenced.keys()]));

  return allCodes
    .filter((code) => referenced.has(code) || priorityForms.includes(code))
    .map((code) => ({
      code,
      required: referenced.has(code),
      referenced: referenced.has(code),
      sourceLine: referenced.get(code) ?? null
    }));
}

function extractTechnicalRequirements(context: ExtractionContext) {
  const lines = [
    ...findSectionLines(context, [
      /\bscope of work\b/i,
      /\btechnical requirements?\b/i,
      /\bspecifications?\b/i,
      /\bdeliverables?\b/i
    ]),
    ...context.lines.filter((line) =>
      /\b(specification|technical requirement|delivery period|performance requirement)\b/i.test(line)
    )
  ];

  const items = extractListItems(lines);

  return {
    serviceOrProductSpecifications: items.filter((item) =>
      /\b(specification|service|product|supply|equipment|works?)\b/i.test(item)
    ),
    technicalRequirements: items.filter((item) =>
      /\b(technical|capacity|experience|qualification|compliance|standard)\b/i.test(item)
    ),
    deliveryOrPerformanceExpectations: items.filter((item) =>
      /\b(delivery|performance|timeframe|within|days|completion|turnaround)\b/i.test(item)
    )
  };
}

function extractReturnableDocuments(context: ExtractionContext): StructuredRecord[] {
  const relevantLines = [
    ...findSectionLines(context, [
      /\breturnable documents?\b/i,
      /\bsupporting documents?\b/i,
      /\bdocuments required\b/i,
      /\bmandatory documents?\b/i
    ]),
    ...context.lines.filter((line) =>
      /\b(returnable|supporting documents?|submit the following|attach the following|required documents?)\b/i.test(
        line
      )
    )
  ];

  const items = extractListItems(relevantLines);

  return items.map((item, index) => ({
    id: `DOC-${String(index + 1).padStart(3, "0")}`,
    name: item,
    mandatory: /\b(must|required|shall)\b/i.test(item) || true
  }));
}

export function extractBidNoticeData(context: ExtractionContext): ExtractorResult {
  const bidNumber = extractBidNumber(context);
  const tenderTitleOrDescription = extractTitle(context);
  const issuingDepartmentOrMunicipality = extractIssuingDepartment(context);
  const closingDate = normalizeDate(
    matchLabeledValue(context.normalizedText, [
      "closing date",
      "closing",
      "bid closing date",
      "tender closing date",
      "last date of submission"
    ])
  );
  const closingTime = normalizeTime(
    matchLabeledValue(context.normalizedText, [
      "closing time",
      "bid closing time",
      "tender closing time",
      "time"
    ])
  );
  const submissionMethod = extractSubmissionMethod(context);
  const briefingSessionDetails = extractBriefingSession(context);
  const complianceRequirements = extractComplianceRequirements(context);
  const mandatorySbdForms = extractMandatorySbdForms(context);
  const technicalRequirements = extractTechnicalRequirements(context);
  const returnableDocuments = extractReturnableDocuments(context);

  const fields: StructuredRecord = {};
  addField(fields, "schemaVersion", "south_african_tender.v1");
  addField(fields, "jurisdiction", "za");
  addField(fields, "tenderMetadata", {
    bidOrTenderNumber: bidNumber,
    tenderTitleOrDescription,
    issuingDepartmentOrMunicipality,
    closingDate,
    closingTime,
    submissionMethod,
    briefingSessionDetails
  });
  addField(fields, "complianceRequirements", complianceRequirements);
  addField(fields, "mandatorySbdForms", mandatorySbdForms);
  addField(fields, "technicalRequirements", technicalRequirements);
  addField(fields, "returnableDocuments", returnableDocuments);

  const emails = extractEmails(context.normalizedText);
  const phones = extractPhones(context.normalizedText);
  const entities = {
    ...collectTopEntities(context),
    contactEmail: emails[0] ?? null,
    contactPhone: phones[0] ?? null
  };

  const missingFields = [
    !bidNumber ? "tenderMetadata.bidOrTenderNumber" : null,
    !tenderTitleOrDescription ? "tenderMetadata.tenderTitleOrDescription" : null,
    !issuingDepartmentOrMunicipality ? "tenderMetadata.issuingDepartmentOrMunicipality" : null,
    !closingDate ? "tenderMetadata.closingDate" : null,
    mandatorySbdForms.length === 0 ? "mandatorySbdForms" : null
  ].filter((value): value is string => Boolean(value));

  const warnings: string[] = [];
  if (!closingTime) {
    warnings.push("Closing time was not confidently extracted.");
  }
  if (returnableDocuments.length === 0) {
    warnings.push("No returnable documents were confidently extracted.");
  }
  if (
    technicalRequirements.serviceOrProductSpecifications.length === 0 &&
    technicalRequirements.technicalRequirements.length === 0 &&
    technicalRequirements.deliveryOrPerformanceExpectations.length === 0
  ) {
    warnings.push("Technical requirements were only weakly detected.");
  }

  return {
    documentCategory: "bid_notice",
    documentTitle: tenderTitleOrDescription,
    fields,
    entities,
    sections: [],
    tables: [],
    warnings,
    missingFields,
    summary: [
      tenderTitleOrDescription ? `South African tender extracted for ${tenderTitleOrDescription}` : "South African tender extracted",
      bidNumber ? `with reference ${bidNumber}` : null,
      closingDate ? `closing on ${closingDate}` : null
    ]
      .filter(Boolean)
      .join(" ")
      .concat("."),
    confidence: missingFields.length === 0 ? 0.87 : 0.74
  };
}
