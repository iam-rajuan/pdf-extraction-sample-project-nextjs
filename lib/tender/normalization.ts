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
  coerceTenderArrays(normalized);
  normalizeBooleans(normalized);
  normalizeSubmissionFields(normalized);
  normalizeSbdForms(normalized);
  normalizeConciseFields(normalized);
  trimLargeSections(normalized);
  dedupeTenderLists(normalized);

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
  merged.sbd_forms_detected = dedupeByKey(
    [...base.sbd_forms_detected, ...next.sbd_forms_detected],
    (item) => item.form
  );
  merged.returnable_documents = dedupeByKey(
    [...base.returnable_documents, ...next.returnable_documents],
    (item) => item.item
  );
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

  for (const key of complianceKeys) {
    merged.compliance_requirements[key].required =
      base.compliance_requirements[key].required || next.compliance_requirements[key].required;
    merged.compliance_requirements[key].details =
      base.compliance_requirements[key].details ?? next.compliance_requirements[key].details;
  }

  merged.compliance_requirements.other_requirements = dedupeByKey(
    [
      ...base.compliance_requirements.other_requirements,
      ...next.compliance_requirements.other_requirements
    ],
    (item) => item.name
  );

  return merged;
}

const complianceKeys = [
  "tax_compliance",
  "csd_registration",
  "bbbee",
  "declaration_of_interest",
  "cidb",
  "psira"
] as const;

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
      contact.notes = limitText(contact.notes, 160);
    }
  }
}

function coerceTenderArrays(extraction: TenderExtraction) {
  extraction.sbd_forms_detected = (extraction.sbd_forms_detected as unknown[]).map((item) =>
    typeof item === "string"
      ? {
          form: item,
          mandatory: null,
          details: null
        }
      : item
  ) as TenderExtraction["sbd_forms_detected"];

  extraction.returnable_documents = (extraction.returnable_documents as unknown[]).map((item) => {
    if (typeof item === "string") {
      return {
        item,
        mandatory: null,
        details: null
      };
    }

    if (item && typeof item === "object" && "name" in item && !("item" in item)) {
      const legacy = item as { name?: unknown; mandatory?: unknown; details?: unknown };
      return {
        item: legacy.name,
        mandatory: legacy.mandatory,
        details: legacy.details
      };
    }

    return item;
  }) as TenderExtraction["returnable_documents"];

  extraction.compliance_requirements.other_requirements =
    (extraction.compliance_requirements.other_requirements as unknown[]).map((item) =>
      typeof item === "string"
        ? {
            name: item,
            required: true,
            details: null
          }
        : item
    ) as TenderExtraction["compliance_requirements"]["other_requirements"];
}

function normalizeBooleans(extraction: TenderExtraction) {
  const briefing = extraction.tender_metadata.briefing_session;
  if (briefing.required === null) {
    briefing.required = normalizeNullableBoolean(briefing.required, briefing.notes);
  }

  for (const key of complianceKeys) {
    const requirement = extraction.compliance_requirements[key];
    requirement.required = normalizeRequiredBoolean(requirement.required, requirement.details);
  }

  for (const requirement of extraction.compliance_requirements.other_requirements) {
    requirement.required = normalizeRequiredBoolean(requirement.required, requirement.details);
  }

  for (const form of extraction.sbd_forms_detected) {
    form.mandatory = normalizeNullableBoolean(form.mandatory, form.details);
  }

  for (const item of extraction.returnable_documents) {
    item.mandatory = normalizeNullableBoolean(item.mandatory, item.details);
  }
}

function normalizeSubmissionFields(extraction: TenderExtraction) {
  extraction.tender_metadata.submission_method = normalizeSubmissionMethod(
    extraction.tender_metadata.submission_method
  );
}

function normalizeSbdForms(extraction: TenderExtraction) {
  extraction.sbd_forms_detected = extraction.sbd_forms_detected
    .map((form) => ({
      ...form,
      form: normalizeSbdName(form.form),
      details: limitText(form.details, 140)
    }))
    .filter((form) => Boolean(form.form));
}

function normalizeConciseFields(extraction: TenderExtraction) {
  const metadata = extraction.tender_metadata;
  metadata.title = limitText(metadata.title, 160);
  metadata.description = limitText(metadata.description, 280);
  metadata.issuing_entity = limitText(metadata.issuing_entity, 140);
  metadata.department = limitText(metadata.department, 140);
  metadata.municipality = limitText(metadata.municipality, 140);
  metadata.province = limitText(metadata.province, 80);
  metadata.validity_period = limitText(metadata.validity_period, 80);
  metadata.submission_address = limitText(metadata.submission_address, 220);
  metadata.submission_portal = limitText(metadata.submission_portal, 160);
  metadata.briefing_session.venue = limitText(metadata.briefing_session.venue, 180);
  metadata.briefing_session.notes = limitText(metadata.briefing_session.notes, 220);

  for (const key of complianceKeys) {
    extraction.compliance_requirements[key].details = limitText(
      extraction.compliance_requirements[key].details,
      180
    );
  }

  extraction.compliance_requirements.other_requirements =
    extraction.compliance_requirements.other_requirements.map((item) => ({
      ...item,
      name: limitRequiredText(item.name, 120),
      details: limitText(item.details, 180)
    }));
  extraction.returnable_documents = extraction.returnable_documents.map((item) => ({
    ...item,
    item: limitRequiredText(item.item, 140),
    details: limitText(item.details, 180)
  }));
  extraction.technical_scope.summary = limitText(extraction.technical_scope.summary, 420);
  extraction.technical_scope.requirements = extraction.technical_scope.requirements
    .map((item) => limitRequiredText(item, 180))
    .slice(0, 30);
  extraction.technical_scope.deliverables = extraction.technical_scope.deliverables
    .map((item) => limitRequiredText(item, 180))
    .slice(0, 30);
  extraction.technical_scope.performance_expectations =
    extraction.technical_scope.performance_expectations
      .map((item) => limitRequiredText(item, 180))
      .slice(0, 30);
}

function trimLargeSections(extraction: TenderExtraction) {
  extraction.raw_supporting_sections.important_clauses =
    extraction.raw_supporting_sections.important_clauses
      .map((item) => limitRequiredText(item, 600))
      .filter(Boolean);
  extraction.raw_supporting_sections.unmapped_but_relevant_text =
    extraction.raw_supporting_sections.unmapped_but_relevant_text
      .map((item) => limitRequiredText(item, 500))
      .filter(Boolean);
}

function dedupeTenderLists(extraction: TenderExtraction) {
  extraction.sbd_forms_detected = dedupeByKey(extraction.sbd_forms_detected, (item) => item.form);
  extraction.returnable_documents = dedupeByKey(
    extraction.returnable_documents,
    (item) => item.item
  );
  extraction.compliance_requirements.other_requirements = dedupeByKey(
    extraction.compliance_requirements.other_requirements,
    (item) => item.name
  );
  extraction.technical_scope.requirements = dedupeStrings(extraction.technical_scope.requirements);
  extraction.technical_scope.deliverables = dedupeStrings(extraction.technical_scope.deliverables);
  extraction.technical_scope.performance_expectations = dedupeStrings(
    extraction.technical_scope.performance_expectations
  );
  extraction.raw_supporting_sections.important_clauses = dedupeStrings(
    extraction.raw_supporting_sections.important_clauses
  );
  extraction.raw_supporting_sections.unmapped_but_relevant_text = dedupeStrings(
    extraction.raw_supporting_sections.unmapped_but_relevant_text
  );
}

function normalizeDate(value: string | null) {
  if (!value) {
    return null;
  }

  const cleaned = value.trim().replace(/,/g, "");
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
  const match = value?.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0].toLowerCase() : null;
}

function normalizePhone(value: string | null) {
  if (!value) {
    return null;
  }

  return value.replace(/[^\d+]/g, "").replace(/^27/, "+27").trim() || null;
}

function normalizeSubmissionMethod(value: string | null) {
  if (!value) {
    return null;
  }

  const lower = value.toLowerCase();
  if (/email|e-mail/.test(lower)) {
    return "email";
  }
  if (/portal|online|e[- ]?tender|upload|website|web site/.test(lower)) {
    return "online";
  }
  if (/hand|physical|box|tender box|deliver|courier|post/.test(lower)) {
    return "physical";
  }
  return limitText(value, 80);
}

function normalizeSbdName(value: string | null) {
  if (!value) {
    return "";
  }

  const match = value.toUpperCase().match(/\bSBD\s*([0-9]+(?:\.[0-9]+)?[A-Z]?)\b/);
  return match ? `SBD ${match[1]}` : limitRequiredText(value.toUpperCase(), 40);
}

function normalizeRequiredBoolean(value: unknown, details: string | null) {
  const normalized = normalizeNullableBoolean(value, details);
  return normalized ?? false;
}

function normalizeNullableBoolean(value: unknown, details: string | null) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    if (/^(true|yes|required|mandatory|compulsory)$/i.test(value.trim())) {
      return true;
    }
    if (/^(false|no|not required|optional)$/i.test(value.trim())) {
      return false;
    }
  }
  if (details && /\b(must|required|mandatory|compulsory|shall|returnable)\b/i.test(details)) {
    return true;
  }
  return null;
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
    const key = normalizeDedupeKey(value);
    if (!key || seen.has(key)) {
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

function dedupeByKey<T>(values: T[], getKey: (value: T) => string | null) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = normalizeDedupeKey(getKey(value));
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function normalizeDedupeKey(value: string | null) {
  return value?.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() ?? "";
}

function limitText(value: string | null, maxLength: number) {
  if (!value) {
    return null;
  }
  return value.length > maxLength ? `${value.slice(0, maxLength - 3).trim()}...` : value;
}

function limitRequiredText(value: string, maxLength: number) {
  return limitText(value, maxLength) ?? "";
}
