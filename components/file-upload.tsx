"use client";

import { useRef, useState } from "react";
import { FileUp, ShieldAlert } from "lucide-react";

interface FileUploadProps {
  onFileSelect: (file: File | null) => void;
  error?: string | null;
  disabled?: boolean;
}

export function FileUpload({ onFileSelect, error, disabled }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  function handleFile(file: File | null) {
    if (!file) {
      onFileSelect(null);
      return;
    }

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    onFileSelect(isPdf ? file : null);
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          handleFile(event.dataTransfer.files?.[0] ?? null);
        }}
        disabled={disabled}
        className={`glass-panel flex min-h-52 w-full flex-col items-center justify-center rounded-3xl border border-dashed px-6 py-10 text-center transition ${
          isDragging
            ? "border-accent bg-accentSoft"
            : "border-slate-300 bg-white/75 hover:border-slate-400 hover:bg-white"
        } disabled:cursor-not-allowed disabled:opacity-60`}
      >
        <div className="rounded-2xl bg-slate-950 p-3 text-white">
          <FileUp className="h-6 w-6" />
        </div>
        <div className="mt-4 space-y-2">
          <p className="text-base font-semibold text-slate-900">Upload a PDF for real extraction</p>
          <p className="max-w-xl text-sm text-slate-500">
            Drag and drop a tender PDF here, or browse from disk. The uploaded file is parsed on
            the server and mapped into normalized structured JSON.
          </p>
        </div>
        <span className="mt-5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700">
          Choose PDF
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
      />
      {error ? (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}
    </div>
  );
}
