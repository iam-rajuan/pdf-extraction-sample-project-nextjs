import { formatConfidence } from "@/lib/utils/format-confidence";
import type { ExtractionResponse } from "@/types/extraction";
import { StatusBadge } from "@/components/status-badge";

interface ExtractionOverviewProps {
  result: ExtractionResponse;
}

export function ExtractionOverview({ result }: ExtractionOverviewProps) {
  const processedDate = new Date(result.meta.processedAt).toLocaleString();
  const items = [
    { label: "Document", value: result.document.name },
    { label: "Pages", value: result.document.pages?.toString() ?? "Unknown" },
    { label: "Type", value: result.document.type },
    { label: "Source", value: result.document.sourceType },
    { label: "Confidence", value: formatConfidence(result.confidence) },
    { label: "Parser", value: result.meta.parser },
    { label: "Processed", value: processedDate },
    { label: "OCR Used", value: result.meta.ocrUsed ? "Yes" : "No" }
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Overview
          </p>
          <h2 className="mt-2 text-lg font-semibold text-slate-950">{result.document.name}</h2>
        </div>
        <StatusBadge status={result.status} />
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <div key={item.label} className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
              {item.label}
            </p>
            <p className="mt-2 text-sm font-medium text-slate-700">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
