let idCounter = 1000;

/** Generates a short, prefixed unique id (mirrors the original app's `ft` helper). */
export function makeId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

/** Formats large counts as 1.2K / 3.4M, matching the original `mt` helper. */
export function formatCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  return `${value}`;
}

/** Formats a dollar amount, matching the original `ht` helper. */
export function formatCurrency(value: number): string {
  return `$${value.toFixed(2)}`;
}

/** Formats elapsed seconds as mm:ss or hh:mm:ss, matching the original `gt` helper. */
export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return hours > 0 ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}
