import type { StructuredRecord, StructuredValue } from "@/types/extraction";
import { safeString } from "@/lib/utils/safe-json";

export function compactObject<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => {
      if (entry === null || entry === undefined) {
        return false;
      }

      if (typeof entry === "string") {
        return entry.trim().length > 0;
      }

      if (Array.isArray(entry)) {
        return entry.length > 0;
      }

      if (typeof entry === "object") {
        return Object.keys(entry).length > 0;
      }

      return true;
    })
  ) as Partial<T>;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function toTitleCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function isStructuredTable(value: unknown): value is { headers: unknown; rows: unknown } {
  if (!isRecord(value)) {
    return false;
  }

  return Array.isArray(value.headers) && Array.isArray(value.rows);
}

export function isEmptyStructuredValue(value: StructuredValue): boolean {
  if (value === null) {
    return true;
  }

  if (typeof value === "string") {
    return value.trim().length === 0;
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  if (typeof value === "object") {
    return Object.keys(value).length === 0;
  }

  return false;
}

export function flattenKeyValueLines(text: string): StructuredRecord {
  const fields: StructuredRecord = {};
  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    const match = line.match(/^([A-Za-z][A-Za-z0-9 /#&()._-]{1,40})\s*[:\-]\s*(.+)$/);
    if (!match) {
      continue;
    }

    const key = toTitleCase(match[1]);
    const value = safeString(match[2]).trim();

    if (value) {
      fields[key] = value;
    }
  }

  return fields;
}
