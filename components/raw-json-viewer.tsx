"use client";

import { useState } from "react";
import { Copy, Check, Download } from "lucide-react";
import { stringifyPrettyJson } from "@/lib/utils/safe-json";

interface RawJsonViewerProps {
  value: unknown;
  fileName?: string;
}

export function RawJsonViewer({ value, fileName = "tender-extraction.json" }: RawJsonViewerProps) {
  const [copied, setCopied] = useState(false);
  const formatted = stringifyPrettyJson(value);

  async function handleCopy() {
    await navigator.clipboard.writeText(formatted);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  function handleDownload() {
    const blob = new Blob([formatted], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-950 text-slate-100 shadow-soft">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <p className="text-sm font-semibold">Normalized response JSON</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-slate-900"
          >
            <Download className="h-4 w-4" />
            Download
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-slate-900"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
      <pre className="max-h-[32rem] overflow-auto px-4 py-4 text-xs leading-6">{formatted}</pre>
    </div>
  );
}
