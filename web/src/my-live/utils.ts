let idCounter = 1000;

/** Generates a short, prefixed unique id (mirrors the original app's `ft` helper). */
export function makeId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

/** Formats large counts as 1.2K / 3.4M, matching the original `mt` helper. */
export function formatCount(value: number): string {
  const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
  const trim = (text: string) => text.replace(/\.0$/, "");

  if (safe >= 1_000_000) return `${trim((safe / 1_000_000).toFixed(1))}M`;
  if (safe >= 100_000) return `${Math.round(safe / 1_000)}K`;
  if (safe >= 1_000) return `${trim((Math.floor(safe / 100) / 10).toFixed(1))}K`;
  return `${Math.round(safe)}`;
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

/** "now", "2m ago", "3h ago", or a short date for older timestamps. */
export function formatRelativeTime(value?: string | number | null): string {
  if (value === undefined || value === null || value === "") return "";

  const time = typeof value === "number" ? value : new Date(value).getTime();
  if (!Number.isFinite(time)) return "";

  const seconds = Math.max(0, Math.round((Date.now() - time) / 1000));
  if (seconds < 45) return "now";

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  return new Date(time).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
