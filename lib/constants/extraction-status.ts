import type { ExtractionStatus } from "@/types/extraction";

export const EXTRACTION_STATUS_LABELS: Record<ExtractionStatus, string> = {
  success: "Success",
  partial_success: "Partial success",
  failed: "Failed"
};
