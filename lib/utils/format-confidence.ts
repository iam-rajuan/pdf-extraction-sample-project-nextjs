export function formatConfidence(value: number): string {
  const safeValue = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  return `${Math.round(safeValue * 100)}%`;
}
