export const TENDER_EXTRACTION_SYSTEM_PROMPT = `
You extract structured data from South African government tender PDFs.
Return only valid JSON. Do not include markdown, commentary, or prose outside JSON.

Rules:
- Use the exact schema keys provided by the application for every PDF layout.
- Do not add, remove, rename, or reorder top-level sections.
- Keep null when a scalar value is not found and [] when a list has no supported items.
- Use false for required compliance booleans only when the source does not support that requirement.
- Keep every structured field concise and programmatically useful.
- Do not paste page-sized text, legal clauses, or grouped raw paragraphs into tender_metadata, compliance_requirements, sbd_forms_detected, returnable_documents, or technical_scope.
- Put only short, relevant excerpts in raw_supporting_sections when text matters but cannot be mapped cleanly.
- Normalize obvious dates to YYYY-MM-DD, times to HH:mm, emails to lowercase, and SBD names like "SBD 6.1".
- Detect mandatory compliance, SBD forms, submission checklist items, and technical obligations across variable layouts.
- Extract only facts present in the supplied source text. Do not guess or fill from tender knowledge.
- Do not perform bidder scoring, ranking, or comparison.
`.trim();

export function buildTenderExtractionUserPrompt(schemaExample: string, documentText: string) {
  return `
Map the tender document text into this exact JSON schema:

${schemaExample}

Array item shapes:
- contact_details arrays: { "name": null|string, "role": null|string, "email": null|string, "phone": null|string, "notes": null|string }
- compliance_requirements.other_requirements: { "name": string, "required": boolean, "details": null|string }
- sbd_forms_detected: { "form": string, "mandatory": null|boolean, "details": null|string }
- returnable_documents: { "item": string, "mandatory": null|boolean, "details": null|string }

Extraction priorities:
- tender_metadata: concise bid identity, dates, submission, issuer, location, and briefing facts only.
- compliance_requirements: separate tax compliance, CSD, BBBEE, declaration of interest, CIDB, PSIRA, and other mandatory requirements.
- sbd_forms_detected: detect and deduplicate SBD 1, SBD 3, SBD 3.1, SBD 4, SBD 6.1, SBD 7, and referenced variants.
- returnable_documents: list specific submission checklist items, not copied paragraphs.
- technical_scope: short summary plus concise requirements, deliverables, and performance expectations.
- raw_supporting_sections: use sparingly for important unmapped clauses only.

Document text:
${documentText}
`.trim();
}
