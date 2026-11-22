/**
 * attendance-time.ts
 * -----------------------------------------------------------------------------
 * Time rules for ministry attendance. No dependencies — uses Intl.
 *
 *   zonedLocalToUtc("2026-11-15", "13:00", "America/New_York")
 *     → the UTC instant of 1:00 PM local time on that date (DST-aware)
 *
 *   officialArrival(arrivalUtc, scheduledStartUtc)
 *     → { status: "present" | "late", lateMinutes }
 *
 * LATE RULE (business rule, computed on the server only):
 *   Times are compared at whole-minute precision, the way a clock shows them.
 *   Arrival at or before the scheduled start minute  → Present, 0 minutes.
 *   Arrival in a later minute                         → Late by the number of
 *                                                       whole minutes elapsed.
 *   Start 1:00 PM — 12:59 → Present · 1:00 → Present · 1:01 → Late 1 ·
 *   1:07 → Late 7 · 1:30 → Late 30. No grace period hides lateness.
 * -----------------------------------------------------------------------------
 */

const DTF_CACHE = new Map<string, Intl.DateTimeFormat>();

function dtf(timeZone: string): Intl.DateTimeFormat {
  let f = DTF_CACHE.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    DTF_CACHE.set(timeZone, f);
  }
  return f;
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    dtf(timeZone);
    return true;
  } catch {
    return false;
  }
}

/** Wall-clock parts of an instant in a time zone. */
export function zonedParts(date: Date, timeZone: string) {
  const parts: Record<string, number> = {};
  for (const p of dtf(timeZone).formatToParts(date)) {
    if (p.type !== "literal") parts[p.type] = Number(p.value);
  }
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour === 24 ? 0 : parts.hour,
    minute: parts.minute,
    second: parts.second,
  };
}

/** Offset (ms) of a time zone at an instant: local wall clock − UTC. */
function offsetAt(date: Date, timeZone: string): number {
  const p = zonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** YYYY-MM-DD + HH:mm in `timeZone` → UTC Date. Handles DST transitions. */
export function zonedLocalToUtc(ymd: string, hhmm: string, timeZone: string): Date {
  const [y, mo, d] = ymd.split("-").map(Number);
  const [h, mi] = hhmm.split(":").map(Number);
  const wall = Date.UTC(y, mo - 1, d, h, mi, 0);
  // Two passes converge for every real zone, including DST change days.
  let guess = wall - offsetAt(new Date(wall), timeZone);
  guess = wall - offsetAt(new Date(guess), timeZone);
  return new Date(guess);
}

/** Local calendar date (YYYY-MM-DD) of an instant in a time zone. */
export function localYmd(date: Date, timeZone: string): string {
  const p = zonedParts(date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** Local HH:mm of an instant in a time zone. */
export function localHhmm(date: Date, timeZone: string): string {
  const p = zonedParts(date, timeZone);
  return `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
}

export function isYmd(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

export function isHhmm(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

/** Day arithmetic on calendar dates (no time zone involved). */
export function addDays(ymd: string, days: number): string {
  const t = Date.parse(`${ymd}T00:00:00Z`) + days * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}

export function weekdayOf(ymd: string): number {
  return new Date(`${ymd}T00:00:00Z`).getUTCDay();
}

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

export type OfficialStatus = "present" | "late";

/**
 * Official status and late minutes for an arrival, by the scheduled start.
 * Whole-minute comparison: 1:00:59 is still 1:00 → Present.
 */
export function officialArrival(arrival: Date, scheduledStart: Date): { status: OfficialStatus; lateMinutes: number } {
  const arrivalMinute = Math.floor(arrival.getTime() / 60_000);
  const startMinute = Math.floor(scheduledStart.getTime() / 60_000);
  const late = arrivalMinute - startMinute;
  return late > 0 ? { status: "late", lateMinutes: late } : { status: "present", lateMinutes: 0 };
}
