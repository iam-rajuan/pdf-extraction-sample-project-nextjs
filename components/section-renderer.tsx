import type { ExtractedSection } from "@/types/extraction";
import { StructuredDataRenderer } from "@/components/structured-data-renderer";
import { TableRenderer } from "@/components/table-renderer";

interface SectionRendererProps {
  sections: ExtractedSection[];
}

export function SectionRenderer({ sections }: SectionRendererProps) {
  if (sections.length === 0) {
    return <p className="text-sm text-slate-500">No sections were identified.</p>;
  }

  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <div key={section.id} className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            {section.title}
          </h3>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
            {section.content}
          </p>
          {section.fields && Object.keys(section.fields).length > 0 ? (
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <StructuredDataRenderer data={section.fields} />
            </div>
          ) : null}
          {section.table ? (
            <div className="mt-4">
              <TableRenderer table={section.table} />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
