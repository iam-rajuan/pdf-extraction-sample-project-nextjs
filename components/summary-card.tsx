interface SummaryCardProps {
  summary: string;
}

export function SummaryCard({ summary }: SummaryCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Summary</p>
      <p className="mt-3 text-sm leading-7 text-slate-700">{summary}</p>
    </div>
  );
}
