import type { StructuredValue } from "@/types/extraction";

export function safeString(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return "";
}

export function stringifyPrettyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "{}";
  }
}

export function normalizePrimitive(value: unknown): StructuredValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  return safeString(value);
}
