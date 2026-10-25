/* ============================================================================
   EVENT TIME
   Status and formatting helpers. Statuses are derived from the event's UTC
   instants and the current time, exactly like the backend
   (apps/api/src/events/utils/event-lifecycle.ts), so a page left open
   across an event's end time stops treating it as active at that instant.
============================================================================ */

import type { EventStatus, FockisEvent } from "../types/event.types";

type Timed = Pick<FockisEvent, "startDate" | "endDate" | "isCancelled">;

const ms = (value: string) => new Date(value).getTime();

export function getEventStatus(event: Timed, now: number = Date.now()): EventStatus {
  if (event.isCancelled) return "cancelled";

  const end = ms(event.endDate);
  const start = ms(event.startDate);

  if (Number.isFinite(end) && now >= end) return "ended";
  if (Number.isFinite(start) && now < start) return "upcoming";

  return "live";
}

export function isEventActive(event: Timed, now: number = Date.now()): boolean {
  const status = getEventStatus(event, now);

  return status === "upcoming" || status === "live";
}

/** Next instant (ms) at which any of these events changes status. */
export function nextTransition(events: Timed[], now: number = Date.now()): number | null {
  let next: number | null = null;

  for (const event of events) {
    if (event.isCancelled) continue;

    for (const value of [ms(event.startDate), ms(event.endDate)]) {
      if (Number.isFinite(value) && value > now && (next === null || value < next)) {
        next = value;
      }
    }
  }

  return next;
}

export function viewerTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function safeZone(zone?: string): string | undefined {
  if (!zone) return undefined;

  try {
    new Intl.DateTimeFormat(undefined, { timeZone: zone });
    return zone;
  } catch {
    return undefined;
  }
}

function format(value: string, options: Intl.DateTimeFormatOptions, zone?: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(undefined, { ...options, timeZone: safeZone(zone) }).format(date);
}

function dayKey(value: number, zone?: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: safeZone(zone),
  }).format(new Date(value));
}

/** "Today", "Tomorrow", "Sat, Oct 24" — in the viewer's calendar. */
export function relativeDay(value: string, now: number = Date.now()): string {
  const target = ms(value);

  if (!Number.isFinite(target)) return "";

  const key = dayKey(target);

  if (key === dayKey(now)) return "Today";
  if (key === dayKey(now + 86_400_000)) return "Tomorrow";

  return format(value, { weekday: "short", month: "short", day: "numeric" });
}

export function timeLabel(value: string, zone?: string): string {
  return format(value, { hour: "numeric", minute: "2-digit" }, zone);
}

/** "Today · 7:00 PM" (viewer's local time). */
export function shortWhen(event: Pick<FockisEvent, "startDate">, now: number = Date.now()): string {
  return `${relativeDay(event.startDate, now)} · ${timeLabel(event.startDate)}`;
}

/** Badge parts in the viewer's time zone. */
export function dateBadgeParts(value: string) {
  return {
    month: format(value, { month: "short" }).toUpperCase(),
    day: format(value, { day: "numeric" }),
    weekday: format(value, { weekday: "short" }),
  };
}

function zoneName(value: string, zone?: string): string {
  try {
    const parts = new Intl.DateTimeFormat(undefined, {
      timeZoneName: "short",
      timeZone: safeZone(zone),
    }).formatToParts(new Date(value));

    return parts.find((part) => part.type === "timeZoneName")?.value ?? "";
  } catch {
    return "";
  }
}

/**
 * Full range for the details page, e.g.
 *   "Sat, Oct 24, 2026 · 6:00 – 9:00 PM EDT"
 *   "Oct 24, 6:00 PM – Oct 25, 2:00 AM EDT"
 */
export function fullRange(event: Pick<FockisEvent, "startDate" | "endDate">, zone?: string): string {
  const start = event.startDate;
  const end = event.endDate;
  const sameDay = dayKey(ms(start), zone) === dayKey(ms(end), zone);
  const tz = zoneName(end, zone);

  if (sameDay) {
    return `${format(start, { weekday: "short", month: "short", day: "numeric", year: "numeric" }, zone)} · ${timeLabel(start, zone)} – ${timeLabel(end, zone)}${tz ? ` ${tz}` : ""}`;
  }

  return `${format(start, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }, zone)} – ${format(end, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }, zone)}${tz ? ` ${tz}` : ""}`;
}

/** True when the organizer's zone differs from the viewer's (show both). */
export function differsFromViewerZone(zone?: string): boolean {
  const organizer = safeZone(zone);

  return Boolean(organizer && organizer !== viewerTimeZone());
}

/** "Ends in 2h 15m", "Starts in 3 days" … */
export function countdown(event: Timed, now: number = Date.now()): string {
  const status = getEventStatus(event, now);
  const target = status === "upcoming" ? ms(event.startDate) : ms(event.endDate);
  const diff = Math.max(0, target - now);
  const minutes = Math.round(diff / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const span =
    days >= 2
      ? `${days} days`
      : hours >= 1
        ? `${hours}h${minutes % 60 ? ` ${minutes % 60}m` : ""}`
        : `${Math.max(1, minutes)} min`;

  if (status === "upcoming") return `Starts in ${span}`;
  if (status === "live") return `Ends in ${span}`;

  return status === "cancelled" ? "Cancelled" : "Ended";
}

/** Start of the viewer's local "today", as an ISO instant (for the API). */
export function localDayStartIso(now: number = Date.now()): string {
  const date = new Date(now);

  date.setHours(0, 0, 0, 0);

  return date.toISOString();
}

/** <input type="datetime-local"> value in the viewer's zone. */
export function toLocalInputValue(value: string): string {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value.slice(0, 16);

  const pad = (n: number) => String(n).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Parses a datetime-local value (viewer's zone) to a UTC ISO instant. */
export function fromLocalInputValue(value: string): string {
  if (!value) return "";

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}
