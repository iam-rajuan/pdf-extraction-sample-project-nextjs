"use client";

import { useState } from "react";
import type { TenderExtraction } from "@/types/extraction";
import { RawJsonViewer } from "@/components/raw-json-viewer";
import { StructuredDataRenderer } from "@/components/structured-data-renderer";

type TabKey = "summary" | "metadata" | "compliance" | "scope" | "json";

const tabs: { key: TabKey; label: string }[] = [
  { key: "summary", label: "Tender Summary" },
  { key: "metadata", label: "Metadata" },
  { key: "compliance", label: "Compliance" },
  { key: "scope", label: "Scope & Returnables" },
  { key: "json", label: "Raw JSON" }
];

interface ResultTabsProps {
  result: TenderExtraction;
}

export function ResultTabs({ result }: ResultTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("summary");

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

      {activeTab === "summary" ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <SummaryTile label="Bid Number" value={result.tender_metadata.bid_number} />
          <SummaryTile label="Closing Date" value={result.tender_metadata.closing_date} />
          <SummaryTile label="Closing Time" value={result.tender_metadata.closing_time} />
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft lg:col-span-3">
            <StructuredDataRenderer
              label="Core Tender Details"
              data={{
                title: result.tender_metadata.title,
                description: result.tender_metadata.description,
                issuing_entity: result.tender_metadata.issuing_entity,
                department: result.tender_metadata.department,
                municipality: result.tender_metadata.municipality,
                province: result.tender_metadata.province,
                submission_method: result.tender_metadata.submission_method,
                submission_address: result.tender_metadata.submission_address,
                submission_email: result.tender_metadata.submission_email,
                submission_portal: result.tender_metadata.submission_portal
              }}
            />
          </div>
        </div>
      ) : null}

      {activeTab === "metadata" ? (
        <div className="space-y-5">
          <Panel title="Document Info" data={result.document_info} />
          <Panel title="Tender Metadata" data={result.tender_metadata} />
          <Panel title="Contact Details" data={result.contact_details} />
        </div>
      ) : null}

      {activeTab === "compliance" ? (
        <div className="space-y-5">
          <Panel title="Compliance Requirements" data={result.compliance_requirements} />
          <Panel title="SBD Forms Detected" data={result.sbd_forms_detected} />
          <Panel title="Evaluation Readiness" data={result.evaluation_readiness} />
        </div>
      ) : null}

      {activeTab === "scope" ? (
        <div className="space-y-5">
          <Panel title="Technical Scope" data={result.technical_scope} />
          <Panel title="Returnable Documents" data={result.returnable_documents} />
          <Panel title="Supporting Sections" data={result.raw_supporting_sections} />
        </div>
      ) : null}

      {activeTab === "json" ? (
        <RawJsonViewer
          value={result}
          fileName={`${result.document_info.file_name.replace(/\.pdf$/i, "")}-extraction.json`}
        />
      ) : null}
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 break-words text-lg font-semibold text-slate-900">
        {value || "Not found"}
      </p>
    </div>
  );
}

function Panel({ title, data }: { title: string; data: unknown }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
      <StructuredDataRenderer data={data as never} label={title} />
    </div>
  );
}
