interface WarningPanelProps {
  warnings: string[];
  missingFields: string[];
}

export function WarningPanel({ warnings, missingFields }: WarningPanelProps) {
  if (warnings.length === 0 && missingFields.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">
        Extraction notes
      </p>
      {warnings.length > 0 ? (
        <div className="mt-3">
          <p className="text-sm font-semibold text-amber-900">Warnings</p>
          <ul className="mt-2 space-y-2 text-sm text-amber-800">
            {warnings.map((warning, index) => (
              <li key={`${warning}-${index}`}>• {warning}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {missingFields.length > 0 ? (
        <div className="mt-4">
          <p className="text-sm font-semibold text-amber-900">Missing or weak fields</p>
          <ul className="mt-2 flex flex-wrap gap-2 text-sm text-amber-800">
            {missingFields.map((field) => (
              <li key={field} className="rounded-full bg-white/75 px-3 py-1">
                {field}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
