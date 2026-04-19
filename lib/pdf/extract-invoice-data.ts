import {
  addField,
  collectTopEntities,
  entityRecordFromPairs,
  findFirstMatch,
  mergeRecords
} from "@/lib/pdf/extraction-helpers";
import type { ExtractionContext, ExtractorResult } from "@/lib/pdf/extraction-helpers";

function detectVendor(topLines: string[]): string | null {
  return topLines.find(
    (line) =>
      line.length > 3 &&
      line.length < 80 &&
      !/\b(invoice|bill to|invoice date|due date|amount due|tax)\b/i.test(line)
  ) ?? null;
}

export function extractInvoiceData(context: ExtractionContext): ExtractorResult {
  const invoiceNumber = findFirstMatch(context.normalizedText, [
    /\binvoice(?: number| no| #)?\s*[:#-]?\s*([A-Z0-9-]+)/i,
    /\bref(?:erence)?\s*[:#-]?\s*([A-Z0-9-]+)/i
  ]);
  const invoiceDate = findFirstMatch(context.normalizedText, [/\binvoice date\s*[:\-]?\s*([^\n]+)/i]);
  const dueDate = findFirstMatch(context.normalizedText, [/\bdue date\s*[:\-]?\s*([^\n]+)/i]);
  const subtotal = findFirstMatch(context.normalizedText, [/\bsubtotal\s*[:\-]?\s*([^\n]+)/i]);
  const tax = findFirstMatch(context.normalizedText, [/\btax\s*[:\-]?\s*([^\n]+)/i]);
  const total = findFirstMatch(context.normalizedText, [
    /\bamount due\s*[:\-]?\s*([^\n]+)/i,
    /\btotal(?: amount)?\s*[:\-]?\s*([^\n]+)/i
  ]);
  const customer = findFirstMatch(context.normalizedText, [
    /\bbill to\s*[:\-]?\s*([^\n]+)/i,
    /\bcustomer\s*[:\-]?\s*([^\n]+)/i
  ]);
  const currency =
    context.normalizedText.match(/\bcurrency\s*[:\-]?\s*([A-Z]{3})/i)?.[1] ??
    context.normalizedText.match(/\b(USD|EUR|GBP|BDT)\b/i)?.[1] ??
    null;
  const vendor = detectVendor(context.topLines);

  const fields = mergeRecords(context.keyValueFields);
  addField(fields, "Vendor", vendor);
  addField(fields, "Customer", customer);
  addField(fields, "Invoice Number", invoiceNumber);
  addField(fields, "Invoice Date", invoiceDate);
  addField(fields, "Due Date", dueDate);
  addField(fields, "Subtotal", subtotal);
  addField(fields, "Tax", tax);
  addField(fields, "Total", total);
  addField(fields, "Currency", currency);
  addField(fields, "Line Items Detected", context.tables[0]?.rows.length ?? 0);

  const entities = mergeRecords(
    collectTopEntities(context),
    entityRecordFromPairs([
      ["vendor", vendor],
      ["customer", customer],
      ["invoiceNumber", invoiceNumber],
      ["invoiceDate", invoiceDate],
      ["dueDate", dueDate],
      ["total", total]
    ])
  );

  const missingFields = ["Vendor", "Invoice Number", "Total"].filter((key) => !(key in fields));
  const summary = [
    vendor ? `Invoice from ${vendor}` : "Invoice document",
    customer ? `to ${customer}` : null,
    total ? `for ${total}` : null,
    dueDate ? `due ${dueDate}` : null
  ]
    .filter(Boolean)
    .join(" ");

  return {
    documentCategory: "invoice",
    documentTitle: vendor ? `Invoice - ${vendor}` : context.title,
    fields,
    entities,
    sections: context.sections,
    tables: context.tables,
    missingFields,
    summary: `${summary}.`,
    confidence: 0.72
  };
}
