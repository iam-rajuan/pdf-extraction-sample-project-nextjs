"use client";

import { useState } from "react";
import { tenderExtractionErrorSchema, tenderExtractionSchema } from "@/lib/tender/schema";
import type { TenderExtraction } from "@/types/extraction";
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
  const [result, setResult] = useState<TenderExtraction | null>(null);
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
        const parsedFailure = tenderExtractionErrorSchema.safeParse(payload);
        setRequestError(
          parsedFailure.success
            ? parsedFailure.data.message
            : "The extraction request failed unexpectedly."
        );
        return;
      }

      const parsed = tenderExtractionSchema.parse(payload);
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
            South African Tender Extraction MVP
          </span>
          <div className="grid gap-4 lg:max-w-3xl">
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950">
              Extract structured tender data from government PDFs
            </h1>
            <p className="text-base leading-8 text-slate-600">
              Upload a tender PDF and receive one normalized JSON schema covering metadata,
              compliance, SBD forms, returnables, contacts, and technical scope.
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

          <div className="glass-panel rounded-2xl border border-white/70 p-6 shadow-soft">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Extraction Pipeline
            </p>
            <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600">
              <p>
                <span className="font-semibold text-slate-900">1. Parse PDF text</span>{" "}
                with server-side `pdf-parse` and page-level capture where available.
              </p>
              <p>
                <span className="font-semibold text-slate-900">2. Preprocess tender content</span>{" "}
                with label detection and chunking for variable layouts.
              </p>
              <p>
                <span className="font-semibold text-slate-900">3. Validate structured JSON</span>{" "}
                through OpenAI extraction, zod validation, and normalization.
              </p>
            </div>
          </div>
        </section>

        <section className="pb-12">
          {isLoading ? <Loader /> : null}
          {!isLoading && requestError ? <ErrorState message={requestError} /> : null}
          {!isLoading && result ? <ResultTabs result={result} /> : null}
          {!isLoading && !result && !requestError ? <EmptyState /> : null}
        </section>
      </div>
    </main>
  );
}
