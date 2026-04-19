import { LoaderCircle, RotateCcw, Upload } from "lucide-react";

interface ActionBarProps {
  disabled: boolean;
  loading: boolean;
  hasResult: boolean;
  onExtract: () => void;
  onReset: () => void;
}

export function ActionBar({
  disabled,
  loading,
  hasResult,
  onExtract,
  onReset
}: ActionBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={disabled || loading}
        onClick={onExtract}
        className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {loading ? "Extracting..." : "Extract Data"}
      </button>
      <button
        type="button"
        onClick={onReset}
        disabled={loading || !hasResult}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <RotateCcw className="h-4 w-4" />
        Reset result
      </button>
    </div>
  );
}
