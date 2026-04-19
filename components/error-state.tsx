interface ErrorStateProps {
  title?: string;
  message: string;
}

export function ErrorState({ title = "Extraction error", message }: ErrorStateProps) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
      <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-rose-700">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-rose-900">{message}</p>
    </div>
  );
}
