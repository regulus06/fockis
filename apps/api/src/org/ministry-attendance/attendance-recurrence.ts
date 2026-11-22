/**
 * attendance-recurrence.ts
 * -----------------------------------------------------------------------------
 * Which calendar dates a ministry meeting occurs on. Every occurrence gets its
 * own attendance session, keyed "m:<meetingKey>:<YYYY-MM-DD>" — so saving or
 * editing a meeting can never create a second session for the same date.
 *
 *   once      — only on anchorDate
 *   weekly    — on the selected weekdays, from anchorDate
 *   biweekly  — on the selected weekdays, every other week from anchorDate's week
 *   monthly   — on anchorDate's day of the month (skips months without it)
 * Optional endDate stops the series.
 * -----------------------------------------------------------------------------
 */

import { addDays, daysBetween, weekdayOf } from "./attendance-time";

export type MeetingFrequency = "once" | "weekly" | "biweekly" | "monthly";

export interface RecurringMeeting {
  key?: string;
  name: string;
  frequency?: MeetingFrequency;
  weekdays?: number[];
  anchorDate?: string;
  endDate?: string;
  startClock?: string;
  endClock?: string;
  timeZone?: string;
  location?: string;
  attendance?: boolean;
}

/** A meeting has enough structure to create attendance sessions. */
export function isSchedulable(m: RecurringMeeting): m is RecurringMeeting & Required<Pick<RecurringMeeting, "key" | "frequency" | "anchorDate" | "startClock" | "timeZone">> {
  return Boolean(m.key && m.frequency && m.anchorDate && m.startClock && m.timeZone && m.attendance !== false);
}

export function occursOn(m: RecurringMeeting, ymd: string): boolean {
  if (!isSchedulable(m)) return false;
  if (ymd < m.anchorDate) return false;
  if (m.endDate && ymd > m.endDate) return false;

  const weekdays = m.weekdays && m.weekdays.length > 0 ? m.weekdays : [weekdayOf(m.anchorDate)];

  switch (m.frequency) {
    case "once":
      return ymd === m.anchorDate;
    case "weekly":
      return weekdays.includes(weekdayOf(ymd));
    case "biweekly": {
      if (!weekdays.includes(weekdayOf(ymd))) return false;
      const anchorWeekStart = addDays(m.anchorDate, -weekdayOf(m.anchorDate));
      const weekStart = addDays(ymd, -weekdayOf(ymd));
      return (daysBetween(anchorWeekStart, weekStart) / 7) % 2 === 0;
    }
    case "monthly":
      return ymd.slice(8, 10) === m.anchorDate.slice(8, 10);
    default:
      return false;
  }
}

export function occurrenceKey(meetingKey: string, ymd: string): string {
  return `m:${meetingKey}:${ymd}`;
}

/** Dates (inclusive) a meeting occurs on between from and to. Capped at 400 days. */
export function occurrencesBetween(m: RecurringMeeting, from: string, to: string): string[] {
  const out: string[] = [];
  const span = Math.min(daysBetween(from, to), 400);
  for (let i = 0; i <= span; i++) {
    const d = addDays(from, i);
    if (occursOn(m, d)) out.push(d);
  }
  return out;
}
