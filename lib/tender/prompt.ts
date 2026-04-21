export const TENDER_EXTRACTION_SYSTEM_PROMPT = `
You extract structured data from South African government tender PDFs.
Return only valid JSON. Do not include markdown, commentary, or prose outside JSON.

Rules:
- Use the exact schema keys provided by the application.
- Keep null when a value is not found.
- Use false for boolean compliance/evaluation findings that are not supported by the text.
- Keep strings concise and programmatically useful.
- Do not dump full pages or huge paragraphs into structured fields.
- Put only short, relevant excerpts in raw_supporting_sections when needed.
- Normalize obvious emails to lowercase.
- Detect South African tender concepts across variable layouts, not only one template.
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
- returnable_documents: { "name": string, "mandatory": null|boolean, "details": null|string }

Document text:
${documentText}
`.trim();
}
