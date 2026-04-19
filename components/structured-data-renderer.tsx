import { isEmptyStructuredValue, isRecord, isStructuredTable, toTitleCase } from "@/lib/utils/object-helpers";
import type { StructuredValue } from "@/types/extraction";
import { TableRenderer } from "@/components/table-renderer";

interface StructuredDataRendererProps {
  data: StructuredValue;
  label?: string;
}

function PrimitiveValue({ value }: { value: Exclude<StructuredValue, object | unknown[]> }) {
  if (value === null || value === "") {
    return <span className="text-slate-400">Not available</span>;
  }

  return <span className="break-words text-slate-700">{String(value)}</span>;
}

export function StructuredDataRenderer({ data, label }: StructuredDataRendererProps) {
  if (data === null || typeof data === "string" || typeof data === "number" || typeof data === "boolean") {
    return (
      <div className="space-y-1">
        {label ? (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
        ) : null}
        <PrimitiveValue value={data} />
      </div>
    );
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return (
        <div className="space-y-1">
          {label ? (
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
          ) : null}
          <span className="text-sm text-slate-400">No items</span>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {label ? (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
        ) : null}
        <div className="space-y-3">
          {data.map((item, index) => (
            <div key={`${label ?? "item"}-${index}`} className="rounded-xl border border-slate-200 p-4">
              <StructuredDataRenderer data={item} label={`Item ${index + 1}`} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isStructuredTable(data)) {
    return (
      <div className="space-y-2">
        {label ? (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
        ) : null}
        <TableRenderer
          table={{
            headers: data.headers as string[],
            rows: data.rows as StructuredValue[][]
          }}
        />
      </div>
    );
  }

  if (!isRecord(data)) {
    return null;
  }

  const entries = Object.entries(data).filter(([, value]) => !isEmptyStructuredValue(value as StructuredValue));

  if (entries.length === 0) {
    return (
      <div className="space-y-1">
        {label ? (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
        ) : null}
        <span className="text-sm text-slate-400">No structured values available</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {label ? (
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        {entries.map(([key, value]) => (
          <div key={key} className="rounded-xl border border-slate-200 bg-white p-4">
            <StructuredDataRenderer data={value as StructuredValue} label={toTitleCase(key)} />
          </div>
        ))}
      </div>
    </div>
  );
}
