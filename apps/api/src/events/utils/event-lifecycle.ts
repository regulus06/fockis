/* ============================================================================
   EVENT LIFECYCLE
   apps/api/src/events/utils/event-lifecycle.ts

   One source of truth for an event's status and for the database filter
   that decides whether an event is still "active" (may be recommended,
   shown in discovery rails or in the feed, and accept new RSVPs).

   Dates are stored in MongoDB as UTC instants. Every comparison here is a
   timestamp comparison (Date#getTime), never a formatted string, so
   time zones and daylight saving time cannot shift the result: an event
   ending at 20:00 in its own time zone ends at exactly that instant for
   every viewer.

   Rules
     CANCELLED  the creator cancelled it (takes precedence over everything)
     POSTPONED  the organizer postponed it and has not set a new date yet
     SCHEDULED  its publication time has not arrived (organizers only see it)
     UPCOMING   now <  startDate
     LIVE       startDate <= now < endDate
     ENDED      now >= endDate

   An event whose endDate equals "now" has ENDED. Expiry is a lifecycle
   state, never a deletion: ended events stay in MongoDB with their RSVP
   history and remain readable from My Events and the details page.
============================================================================ */

import { EventStatus } from "../schemas/event.schema";

export interface LifecycleFields {
  startDate: Date | string;
  endDate: Date | string;
  isCancelled?: boolean;
  isPostponed?: boolean;
  publishAt?: Date | string | null;
}

export function toTime(value: Date | string | number | null | undefined): number {
  if (value === null || value === undefined) {
    return Number.NaN;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  return new Date(value).getTime();
}

export function getEventStatus(
  event: LifecycleFields,
  now: Date = new Date(),
): EventStatus {
  if (event.isCancelled) {
    return EventStatus.CANCELLED;
  }

  const current = now.getTime();
  const start = toTime(event.startDate);
  const end = toTime(event.endDate);

  // An event that already ended is ENDED even if it was postponed or never published.
  if (Number.isFinite(end) && current >= end) {
    return EventStatus.ENDED;
  }

  if (event.isPostponed) {
    return EventStatus.POSTPONED;
  }

  if (isScheduled(event, now)) {
    return EventStatus.SCHEDULED;
  }

  if (Number.isFinite(start) && current < start) {
    return EventStatus.UPCOMING;
  }

  return EventStatus.LIVE;
}

/** True while the event may be recommended and RSVP'd to. */
export function isEventActive(
  event: LifecycleFields,
  now: Date = new Date(),
): boolean {
  const status = getEventStatus(event, now);

  return status === EventStatus.UPCOMING || status === EventStatus.LIVE;
}

/** Publication time set and not reached yet. */
export function isScheduled(
  event: Pick<LifecycleFields, "publishAt">,
  now: Date = new Date(),
): boolean {
  const publish = toTime(event.publishAt ?? null);
  return Number.isFinite(publish) && publish > now.getTime();
}

/**
 * MongoDB filter for active events. `endDate > now` is strict, so an
 * event ending exactly now is already excluded. Postponed events are not
 * active (no date). Scheduled publication is enforced by the visibility
 * filter (utils/event-visibility.ts), which every list applies.
 */
export function activeEventFilter(now: Date = new Date()) {
  return {
    isCancelled: { $ne: true },
    isPostponed: { $ne: true },
    endDate: { $gt: now },
  };
}

/** MongoDB filter: published (no publication time, or it has passed). */
export function publishedFilter(now: Date = new Date()) {
  return { $or: [{ publishAt: null }, { publishAt: { $lte: now } }] };
}

/** Milliseconds until the event's status next changes, or null if never. */
export function msUntilNextTransition(
  event: LifecycleFields,
  now: Date = new Date(),
): number | null {
  if (event.isCancelled || event.isPostponed) {
    return null;
  }

  const current = now.getTime();
  const start = toTime(event.startDate);
  const end = toTime(event.endDate);

  if (isScheduled(event, now)) {
    return toTime(event.publishAt ?? null) - current;
  }

  if (Number.isFinite(start) && current < start) {
    return start - current;
  }

  if (Number.isFinite(end) && current < end) {
    return end - current;
  }

  return null;
}
