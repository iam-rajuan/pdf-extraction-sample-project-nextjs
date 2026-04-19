"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { stringifyPrettyJson } from "@/lib/utils/safe-json";

interface RawJsonViewerProps {
  value: unknown;
}

export function RawJsonViewer({ value }: RawJsonViewerProps) {
  const [copied, setCopied] = useState(false);
  const formatted = stringifyPrettyJson(value);

  async function handleCopy() {
    await navigator.clipboard.writeText(formatted);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-950 text-slate-100 shadow-soft">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <p className="text-sm font-semibold">Normalized response JSON</p>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-slate-900"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="max-h-[32rem] overflow-auto px-4 py-4 text-xs leading-6">{formatted}</pre>
    </div>
  );
}
