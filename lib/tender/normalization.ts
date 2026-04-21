import { createEmptyTenderExtraction } from "@/lib/tender/default-extraction";
import { tenderExtractionSchema, type TenderExtraction } from "@/lib/tender/schema";

const MONTHS: Record<string, string> = {
  january: "01",
  jan: "01",
  february: "02",
  feb: "02",
  march: "03",
  mar: "03",
  april: "04",
  apr: "04",
  may: "05",
  june: "06",
  jun: "06",
  july: "07",
  jul: "07",
  august: "08",
  aug: "08",
  september: "09",
  sep: "09",
  sept: "09",
  october: "10",
  oct: "10",
  november: "11",
  nov: "11",
  december: "12",
  dec: "12"
};

export function normalizeTenderExtraction(
  value: unknown,
  documentInfo: { fileName: string; pageCount: number; timestamp: string }
): TenderExtraction {
  const merged = deepMerge(
    createEmptyTenderExtraction({
      fileName: documentInfo.fileName,
      pageCount: documentInfo.pageCount,
      timestamp: documentInfo.timestamp
    }),
    value
  ) as TenderExtraction;

  merged.document_info.file_name = documentInfo.fileName;
  merged.document_info.page_count = documentInfo.pageCount;
  merged.document_info.extraction_timestamp = documentInfo.timestamp;
  merged.document_info.source_type = "pdf";

  const normalized = normalizeStrings(merged) as TenderExtraction;
  normalizeDatesAndTimes(normalized);
  normalizeContacts(normalized);
  normalizeBooleans(normalized);
  coerceTenderArrays(normalized);
  trimLargeSections(normalized);

  normalized.sbd_forms_detected = dedupeByJson(normalized.sbd_forms_detected);
  normalized.returnable_documents = dedupeByJson(normalized.returnable_documents);
  normalized.compliance_requirements.other_requirements = dedupeByJson(
    normalized.compliance_requirements.other_requirements
  );

  return tenderExtractionSchema.parse(normalized);
}

export function mergeTenderExtractions(
  base: TenderExtraction,
  next: TenderExtraction
): TenderExtraction {
  const merged = deepMergePreferExisting(base, next) as TenderExtraction;

  merged.contact_details.bid_enquiries = dedupeByJson([
    ...base.contact_details.bid_enquiries,
    ...next.contact_details.bid_enquiries
  ]);
  merged.contact_details.technical_enquiries = dedupeByJson([
    ...base.contact_details.technical_enquiries,
    ...next.contact_details.technical_enquiries
  ]);
  merged.contact_details.other_contacts = dedupeByJson([
    ...base.contact_details.other_contacts,
    ...next.contact_details.other_contacts
  ]);
  merged.sbd_forms_detected = dedupeByJson([
    ...base.sbd_forms_detected,
    ...next.sbd_forms_detected
  ]);
  merged.returnable_documents = dedupeByJson([
    ...base.returnable_documents,
    ...next.returnable_documents
  ]);
  merged.technical_scope.requirements = dedupeStrings([
    ...base.technical_scope.requirements,
    ...next.technical_scope.requirements
  ]);
  merged.technical_scope.deliverables = dedupeStrings([
    ...base.technical_scope.deliverables,
    ...next.technical_scope.deliverables
  ]);
  merged.technical_scope.performance_expectations = dedupeStrings([
    ...base.technical_scope.performance_expectations,
    ...next.technical_scope.performance_expectations
  ]);
  merged.raw_supporting_sections.important_clauses = dedupeStrings([
    ...base.raw_supporting_sections.important_clauses,
    ...next.raw_supporting_sections.important_clauses
  ]).slice(0, 12);
  merged.raw_supporting_sections.unmapped_but_relevant_text = dedupeStrings([
    ...base.raw_supporting_sections.unmapped_but_relevant_text,
    ...next.raw_supporting_sections.unmapped_but_relevant_text
  ]).slice(0, 8);

  merged.compliance_requirements.tax_compliance.required =
    base.compliance_requirements.tax_compliance.required ||
    next.compliance_requirements.tax_compliance.required;
  merged.compliance_requirements.csd_registration.required =
    base.compliance_requirements.csd_registration.required ||
    next.compliance_requirements.csd_registration.required;
  merged.compliance_requirements.bbbee.required =
    base.compliance_requirements.bbbee.required || next.compliance_requirements.bbbee.required;
  merged.compliance_requirements.declaration_of_interest.required =
    base.compliance_requirements.declaration_of_interest.required ||
    next.compliance_requirements.declaration_of_interest.required;
  merged.compliance_requirements.cidb.required =
    base.compliance_requirements.cidb.required || next.compliance_requirements.cidb.required;
  merged.compliance_requirements.psira.required =
    base.compliance_requirements.psira.required || next.compliance_requirements.psira.required;
  merged.evaluation_readiness.pricing_mentioned =
    base.evaluation_readiness.pricing_mentioned || next.evaluation_readiness.pricing_mentioned;
  merged.evaluation_readiness.functionality_mentioned =
    base.evaluation_readiness.functionality_mentioned ||
    next.evaluation_readiness.functionality_mentioned;
  merged.evaluation_readiness.prequalification_mentioned =
    base.evaluation_readiness.prequalification_mentioned ||
    next.evaluation_readiness.prequalification_mentioned;
  merged.evaluation_readiness.preference_points_mentioned =
    base.evaluation_readiness.preference_points_mentioned ||
    next.evaluation_readiness.preference_points_mentioned;

  return merged;
}

function normalizeDatesAndTimes(extraction: TenderExtraction) {
  extraction.tender_metadata.issue_date = normalizeDate(extraction.tender_metadata.issue_date);
  extraction.tender_metadata.closing_date = normalizeDate(extraction.tender_metadata.closing_date);
  extraction.tender_metadata.closing_time = normalizeTime(extraction.tender_metadata.closing_time);
  extraction.tender_metadata.briefing_session.date = normalizeDate(
    extraction.tender_metadata.briefing_session.date
  );
  extraction.tender_metadata.briefing_session.time = normalizeTime(
    extraction.tender_metadata.briefing_session.time
  );
  extraction.tender_metadata.submission_email = normalizeEmail(
    extraction.tender_metadata.submission_email
  );
}

function normalizeContacts(extraction: TenderExtraction) {
  for (const group of [
    extraction.contact_details.bid_enquiries,
    extraction.contact_details.technical_enquiries,
    extraction.contact_details.other_contacts
  ]) {
    for (const contact of group) {
      contact.email = normalizeEmail(contact.email);
      contact.phone = normalizePhone(contact.phone);
    }
  }
}

function normalizeBooleans(extraction: TenderExtraction) {
  const briefing = extraction.tender_metadata.briefing_session;
  if (briefing.required === null && /compulsory|mandatory|required/i.test(briefing.notes ?? "")) {
    briefing.required = true;
  }
}

function coerceTenderArrays(extraction: TenderExtraction) {
  extraction.sbd_forms_detected = extraction.sbd_forms_detected.map((item) =>
    typeof item === "string"
      ? {
          form: item,
          mandatory: null,
          details: null
        }
      : item
  );
  extraction.returnable_documents = extraction.returnable_documents.map((item) =>
    typeof item === "string"
      ? {
          name: item,
          mandatory: null,
          details: null
        }
      : item
  );
  extraction.compliance_requirements.other_requirements =
    extraction.compliance_requirements.other_requirements.map((item) =>
      typeof item === "string"
        ? {
            name: item,
            required: true,
            details: null
          }
        : item
    );
}

function trimLargeSections(extraction: TenderExtraction) {
  extraction.raw_supporting_sections.important_clauses =
    extraction.raw_supporting_sections.important_clauses
      .map((item) => limitText(item, 600))
      .filter(Boolean);
  extraction.raw_supporting_sections.unmapped_but_relevant_text =
    extraction.raw_supporting_sections.unmapped_but_relevant_text
      .map((item) => limitText(item, 500))
      .filter(Boolean);
}

function normalizeDate(value: string | null) {
  if (!value) {
    return null;
  }

  const cleaned = value.trim();
  const numeric = cleaned.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
  if (numeric) {
    const day = numeric[1].padStart(2, "0");
    const month = numeric[2].padStart(2, "0");
    const year = numeric[3].length === 2 ? `20${numeric[3]}` : numeric[3];
    return `${year}-${month}-${day}`;
  }

  const monthName = cleaned.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(\d{4})$/i);
  if (monthName) {
    const month = MONTHS[monthName[2].toLowerCase()];
    if (month) {
      return `${monthName[3]}-${month}-${monthName[1].padStart(2, "0")}`;
    }
  }

  const iso = cleaned.match(/^\d{4}-\d{2}-\d{2}$/);
  return iso ? cleaned : value;
}

function normalizeTime(value: string | null) {
  if (!value) {
    return null;
  }

  const match = value.trim().match(/^(\d{1,2})(?:[:hH](\d{2}))?\s*(AM|PM)?$/i);
  if (!match) {
    return value.trim();
  }

  let hour = Number(match[1]);
  const minute = match[2] ?? "00";
  const meridiem = match[3]?.toUpperCase();

  if (meridiem === "PM" && hour < 12) {
    hour += 12;
  }
  if (meridiem === "AM" && hour === 12) {
    hour = 0;
  }

  return `${String(hour).padStart(2, "0")}:${minute}`;
}

function normalizeEmail(value: string | null) {
  return value ? value.trim().toLowerCase() : null;
}

function normalizePhone(value: string | null) {
  if (!value) {
    return null;
  }

  return value.replace(/[^\d+]/g, "").replace(/^27/, "+27").trim() || null;
}

function normalizeStrings(value: unknown): unknown {
  if (typeof value === "string") {
    const trimmed = value.replace(/\s+/g, " ").trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (Array.isArray(value)) {
    return value.map(normalizeStrings).filter((item) => item !== null && item !== "");
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, normalizeStrings(child)])
    );
  }
  return value;
}

function deepMerge(target: unknown, source: unknown): unknown {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return source ?? target;
  }
  if (!target || typeof target !== "object" || Array.isArray(target)) {
    return source;
  }

  const result: Record<string, unknown> = { ...(target as Record<string, unknown>) };
  for (const [key, value] of Object.entries(source)) {
    result[key] = deepMerge(result[key], value);
  }
  return result;
}

function deepMergePreferExisting(target: unknown, source: unknown): unknown {
  if (Array.isArray(target) || Array.isArray(source)) {
    return target;
  }
  if (source === null || source === "" || source === undefined) {
    return target;
  }
  if (target === null || target === "" || target === undefined) {
    return source;
  }
  if (
    typeof target === "object" &&
    typeof source === "object" &&
    target !== null &&
    source !== null
  ) {
    const result: Record<string, unknown> = { ...(target as Record<string, unknown>) };
    for (const [key, value] of Object.entries(source)) {
      result[key] = deepMergePreferExisting(result[key], value);
    }
    return result;
  }
  return target;
}

function dedupeStrings(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function dedupeByJson<T>(values: T[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = JSON.stringify(value).toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function limitText(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3).trim()}...` : value;
}
