"use client";

import { useState } from "react";
import type { ExtractionResponse } from "@/types/extraction";
import { ExtractionOverview } from "@/components/extraction-overview";
import { SummaryCard } from "@/components/summary-card";
import { StructuredDataRenderer } from "@/components/structured-data-renderer";
import { SectionRenderer } from "@/components/section-renderer";
import { WarningPanel } from "@/components/warning-panel";
import { ExtractedTextViewer } from "@/components/extracted-text-viewer";
import { RawJsonViewer } from "@/components/raw-json-viewer";
import { TableRenderer } from "@/components/table-renderer";

type TabKey = "overview" | "structured" | "rawText" | "rawJson";

const tabs: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "structured", label: "Structured Data" },
  { key: "rawText", label: "Raw Text" },
  { key: "rawJson", label: "Raw JSON" }
];

interface ResultTabsProps {
  result: ExtractionResponse;
}

export function ResultTabs({ result }: ResultTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              activeTab === tab.key
                ? "bg-slate-950 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" ? (
        <div className="space-y-6">
          <ExtractionOverview result={result} />
          <SummaryCard summary={result.summary || "No summary was generated."} />
          <WarningPanel warnings={result.warnings} missingFields={result.missingFields} />
        </div>
      ) : null}

      {activeTab === "structured" ? (
        <div className="space-y-6">
          {result.success && result.structuredData ? (
            <>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
                <StructuredDataRenderer
                  data={{
                    documentTitle: result.structuredData.documentTitle ?? null,
                    documentCategory: result.structuredData.documentCategory ?? result.document.type
                  }}
                  label="Document"
                />
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
                <StructuredDataRenderer data={result.structuredData.fields} label="Fields" />
              </div>
              {result.structuredData.entities &&
              Object.keys(result.structuredData.entities).length > 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
                  <StructuredDataRenderer data={result.structuredData.entities} label="Entities" />
                </div>
              ) : null}
              {result.structuredData.tables && result.structuredData.tables.length > 0 ? (
                <div className="space-y-4">
                  {result.structuredData.tables.map((table, index) => (
                    <div key={`table-${index}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Table {index + 1}
                      </p>
                      <TableRenderer table={table} />
                    </div>
                  ))}
                </div>
              ) : null}
              <SectionRenderer sections={result.structuredData.sections} />
            </>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-soft">
              No structured data was returned for this document.
            </div>
          )}
        </div>
      ) : null}

      {activeTab === "rawText" ? <ExtractedTextViewer text={result.rawText} /> : null}
      {activeTab === "rawJson" ? <RawJsonViewer value={result} /> : null}
    </div>
  );
}
