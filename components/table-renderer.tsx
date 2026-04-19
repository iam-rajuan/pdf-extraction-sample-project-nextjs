import type { SectionTable } from "@/types/extraction";

interface TableRendererProps {
  table: SectionTable;
}

export function TableRenderer({ table }: TableRendererProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              {table.headers.map((header, index) => (
                <th key={`${header}-${index}`} className="px-4 py-3 font-semibold">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white">
            {table.rows.map((row, rowIndex) => (
              <tr key={`row-${rowIndex}`} className="border-t border-slate-200 align-top">
                {row.map((cell, cellIndex) => (
                  <td key={`cell-${rowIndex}-${cellIndex}`} className="px-4 py-3 text-slate-700">
                    {typeof cell === "object" ? JSON.stringify(cell) : String(cell ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
