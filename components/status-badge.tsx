import { EXTRACTION_STATUS_LABELS } from "@/lib/constants/extraction-status";
import type { ExtractionStatus } from "@/types/extraction";

const statusStyles: Record<ExtractionStatus, string> = {
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  partial_success: "bg-amber-50 text-amber-700 ring-amber-200",
  failed: "bg-rose-50 text-rose-700 ring-rose-200"
};

interface StatusBadgeProps {
  status: ExtractionStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${statusStyles[status]}`}
    >
      {EXTRACTION_STATUS_LABELS[status]}
    </span>
  );
}
