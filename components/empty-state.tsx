import { FileSearch } from "lucide-react";

export function EmptyState() {
  return (
    <div className="glass-panel rounded-3xl border border-white/70 p-8 text-center shadow-soft">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
        <FileSearch className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-slate-900">No extraction yet</h2>
      <p className="mx-auto mt-2 max-w-2xl text-sm leading-7 text-slate-500">
        Upload a PDF and run real extraction to review tender metadata, mandatory compliance,
        SBD forms, returnables, technical scope, and the fixed raw JSON schema.
      </p>
    </div>
  );
}
