export function formatAiCredits(value?: number): string {
  return new Intl.NumberFormat().format(value ?? 0);
}

export function formatDuration(seconds = 0): string {
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.round(seconds % 60);
  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}

export function formatAiDate(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}
