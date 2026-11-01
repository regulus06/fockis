/* ============================================================================
   EVENT CALENDAR HELPERS
   Day keys and month grids in the viewer's local calendar. Day keys are
   "YYYY-MM-DD" strings so they compare and serialise (URL ?date=) cleanly.
============================================================================ */

import type { FockisEvent } from "../types/event.types";

const pad = (value: number) => String(value).padStart(2, "0");

export function dayKeyOf(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function eventDayKey(event: Pick<FockisEvent, "startDate">): string {
  const date = new Date(event.startDate);

  return Number.isNaN(date.getTime()) ? "" : dayKeyOf(date);
}

export function parseDayKey(key: string | null | undefined): Date | null {
  if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;

  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

export interface CalendarCell {
  key: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
}

/** Six-row (or five-row) Sun–Sat grid for the month containing `month`. */
export function monthGrid(month: Date, today: Date = new Date()): CalendarCell[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);

  start.setDate(first.getDate() - first.getDay());

  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const totalDays = first.getDay() + last.getDate();
  const cells = Math.ceil(totalDays / 7) * 7;
  const todayKey = dayKeyOf(today);
  const result: CalendarCell[] = [];

  for (let index = 0; index < cells; index += 1) {
    const date = new Date(start);

    date.setDate(start.getDate() + index);

    const key = dayKeyOf(date);

    result.push({
      key,
      day: date.getDate(),
      inMonth: date.getMonth() === month.getMonth(),
      isToday: key === todayKey,
    });
  }

  return result;
}

export function isSameMonth(value: string, month: Date): boolean {
  const date = new Date(value);

  return date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth();
}

export function monthTitle(month: Date): string {
  return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(month);
}

export function longDayLabel(key: string): string {
  const date = parseDayKey(key);

  return date
    ? new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(date)
    : "";
}

/** Group events by local start day. */
export function eventsByDay<T extends Pick<FockisEvent, "startDate">>(events: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();

  events.forEach((event) => {
    const key = eventDayKey(event);

    if (!key) return;

    const bucket = map.get(key);

    if (bucket) bucket.push(event);
    else map.set(key, [event]);
  });

  return map;
}

/* ----------------------------------------------------------------------------
   .ics export ("Add to calendar") — generated in the browser from the event
   the viewer already has; nothing is sent anywhere.
---------------------------------------------------------------------------- */

function icsDate(value: string): string {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function icsText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, (match) => `\\${match}`);
}

export function downloadIcs(
  event: Pick<FockisEvent, "id" | "title" | "description" | "startDate" | "endDate" | "locationName" | "address" | "isOnline">,
  url: string,
) {
  const location = event.isOnline ? "Online" : [event.locationName, event.address].filter(Boolean).join(", ");
  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Fockis//Events//EN",
    "BEGIN:VEVENT",
    `UID:${event.id}@fockis`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${icsDate(event.startDate)}`,
    `DTEND:${icsDate(event.endDate || event.startDate)}`,
    `SUMMARY:${icsText(event.title)}`,
    event.description ? `DESCRIPTION:${icsText(`${event.description}\n\n${url}`)}` : `DESCRIPTION:${icsText(url)}`,
    location ? `LOCATION:${icsText(location)}` : "",
    `URL:${url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");

  const blob = new Blob([body], { type: "text/calendar;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = href;
  link.download = `${event.title.replace(/[^\w\d-]+/g, "-").slice(0, 60) || "event"}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 1000);
}
