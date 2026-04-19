interface ExtractedTextViewerProps {
  text: string;
}

export function ExtractedTextViewer({ text }: ExtractedTextViewerProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
      <pre className="max-h-[32rem] overflow-auto text-sm leading-7 text-slate-700">
        {text || "No raw text is available."}
      </pre>
    </div>
  );
}
