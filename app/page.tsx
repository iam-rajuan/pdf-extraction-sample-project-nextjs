"use client";

import { useState } from "react";
import { assertExtractionResponse } from "@/lib/pdf/normalize-response";
import { extractionFailureResponseSchema } from "@/lib/schemas/extraction-response";
import type { ExtractionResponse } from "@/types/extraction";
import { ActionBar } from "@/components/action-bar";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { FileInfo } from "@/components/file-info";
import { FileUpload } from "@/components/file-upload";
import { Loader } from "@/components/loader";
import { ResultTabs } from "@/components/result-tabs";

export default function HomePage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function handleFileSelect(selectedFile: File | null) {
    if (!selectedFile) {
      setFile(null);
      setUploadError("Only PDF files are accepted.");
      return;
    }

    const isPdf =
      selectedFile.type === "application/pdf" || selectedFile.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      setFile(null);
      setUploadError("Only PDF files are accepted.");
      return;
    }

    setFile(selectedFile);
    setUploadError(null);
    setRequestError(null);
  }

  function clearFile() {
    setFile(null);
    setUploadError(null);
  }

  function resetAll() {
    setResult(null);
    setRequestError(null);
    setUploadError(null);
  }

  async function handleExtract() {
    if (!file) {
      setUploadError("Select a PDF before starting extraction.");
      return;
    }

    setIsLoading(true);
    setRequestError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/extract-pdf", {
        method: "POST",
        body: formData
      });

      const payload = await response.json();

      if (!response.ok) {
        const parsedFailure = extractionFailureResponseSchema.safeParse(payload);
        setRequestError(
          parsedFailure.success
            ? parsedFailure.data.message
            : "The extraction request failed unexpectedly."
        );

        if (parsedFailure.success) {
          setResult(parsedFailure.data);
        }

        return;
      }

      const parsed = assertExtractionResponse(payload);
      setResult(parsed);
    } catch (error) {
      setRequestError(
        error instanceof Error
          ? error.message
          : "A network or parsing error interrupted the extraction request."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-10 lg:px-8">
      <div className="grid gap-10">
        <section className="grid gap-4">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            PDF Extraction Platform
          </span>
          <div className="grid gap-4 lg:max-w-3xl">
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950">
              Backend-first PDF extraction with dynamic structured review
            </h1>
            <p className="text-base leading-8 text-slate-600">
              Upload a PDF, extract content through a real backend pipeline, inspect normalized
              fields and sections, and evaluate extraction quality with OCR-ready fallbacks.
            </p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            <FileUpload onFileSelect={handleFileSelect} error={uploadError} disabled={isLoading} />
            {file ? <FileInfo file={file} onClear={clearFile} /> : null}
            <ActionBar
              disabled={!file}
              loading={isLoading}
              hasResult={Boolean(result)}
              onExtract={handleExtract}
              onReset={resetAll}
            />
          </div>

          <div className="glass-panel rounded-3xl border border-white/70 p-6 shadow-soft">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              What this MVP does
            </p>
            <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600">
              <p>Processes uploads through an App Router API route using a Node runtime.</p>
              <p>Extracts text with `pdf-parse`, normalizes the response, and detects document type heuristically.</p>
              <p>Flags OCR-required scenarios without coupling the UI to parser-specific output.</p>
              <p>Renders variable structured data, sections, tables, raw text, JSON, warnings, and missing fields.</p>
            </div>
          </div>
        </section>

        <section className="pb-12">
          {isLoading ? <Loader /> : null}
          {!isLoading && requestError && !result ? <ErrorState message={requestError} /> : null}
          {!isLoading && result ? <ResultTabs result={result} /> : null}
          {!isLoading && !result && !requestError ? <EmptyState /> : null}
        </section>
      </div>
    </main>
  );
}
