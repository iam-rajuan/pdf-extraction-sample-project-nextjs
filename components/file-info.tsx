import { FileText, Trash2 } from "lucide-react";
import { formatBytes } from "@/lib/utils/format-bytes";

interface FileInfoProps {
  file: File;
  onClear: () => void;
}

export function FileInfo({ file, onClear }: FileInfoProps) {
  return (
    <div className="glass-panel rounded-2xl border border-white/70 bg-white/85 p-4 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-slate-100 p-2 text-slate-600">
            <FileText className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-900">{file.name}</p>
            <div className="flex flex-wrap gap-2 text-xs text-slate-500">
              <span>{file.type || "application/pdf"}</span>
              <span>•</span>
              <span>{formatBytes(file.size)}</span>
              <span>•</span>
              <span>Ready for extraction</span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
        >
          <Trash2 className="h-4 w-4" />
          Remove
        </button>
      </div>
    </div>
  );
}
