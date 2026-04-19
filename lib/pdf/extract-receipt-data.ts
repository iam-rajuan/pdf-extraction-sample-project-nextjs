import {
  addField,
  collectTopEntities,
  entityRecordFromPairs,
  findFirstMatch,
  mergeRecords
} from "@/lib/pdf/extraction-helpers";
import type { ExtractionContext, ExtractorResult } from "@/lib/pdf/extraction-helpers";

export function extractReceiptData(context: ExtractionContext): ExtractorResult {
  const merchant =
    findFirstMatch(context.normalizedText, [/\bmerchant\s*[:\-]?\s*([^\n]+)/i]) ??
    context.topLines[0] ??
    null;
  const transactionDate = findFirstMatch(context.normalizedText, [
    /\b(?:transaction|purchase|date)\s*[:\-]?\s*([^\n]+)/i
  ]);
  const total = findFirstMatch(context.normalizedText, [
    /\btotal(?: paid)?\s*[:\-]?\s*([^\n]+)/i,
    /\bamount paid\s*[:\-]?\s*([^\n]+)/i
  ]);
  const tax = findFirstMatch(context.normalizedText, [/\btax\s*[:\-]?\s*([^\n]+)/i]);
  const paymentMethod = findFirstMatch(context.normalizedText, [
    /\bpayment method\s*[:\-]?\s*([^\n]+)/i,
    /\bcard type\s*[:\-]?\s*([^\n]+)/i,
    /\bpaid by\s*[:\-]?\s*([^\n]+)/i
  ]);
  const transactionId = findFirstMatch(context.normalizedText, [
    /\btransaction(?: id)?\s*[:\-]?\s*([^\n]+)/i,
    /\bauth(?:orization)?\s*[:\-]?\s*([^\n]+)/i
  ]);

  const fields = mergeRecords(context.keyValueFields);
  addField(fields, "Merchant", merchant);
  addField(fields, "Transaction Date", transactionDate);
  addField(fields, "Total", total);
  addField(fields, "Tax", tax);
  addField(fields, "Payment Method", paymentMethod);
  addField(fields, "Transaction ID", transactionId);
  addField(fields, "Item Count", context.tables[0]?.rows.length ?? 0);

  const entities = mergeRecords(
    collectTopEntities(context),
    entityRecordFromPairs([
      ["merchant", merchant],
      ["transactionDate", transactionDate],
      ["paymentMethod", paymentMethod],
      ["total", total]
    ])
  );

  const summary = [
    merchant ? `Receipt from ${merchant}` : "Receipt document",
    transactionDate ? `dated ${transactionDate}` : null,
    total ? `with total ${total}` : null
  ]
    .filter(Boolean)
    .join(" ");

  return {
    documentCategory: "receipt",
    documentTitle: merchant ? `Receipt - ${merchant}` : context.title,
    fields,
    entities,
    sections: context.sections,
    tables: context.tables,
    missingFields: ["Merchant", "Total"].filter((key) => !(key in fields)),
    summary: `${summary}.`,
    confidence: 0.69
  };
}
