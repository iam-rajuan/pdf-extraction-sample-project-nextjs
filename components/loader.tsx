import { LoaderCircle } from "lucide-react";

export function Loader() {
  return (
    <div className="glass-panel rounded-3xl border border-white/70 p-8 text-center shadow-soft">
      <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-accent" />
      <h2 className="mt-4 text-lg font-semibold text-slate-900">Running real extraction</h2>
      <p className="mt-2 text-sm text-slate-500">
        The backend is parsing the uploaded PDF, mapping tender sections, and validating the fixed
        JSON schema.
      </p>
    </div>
  );
}
