/* ============================================================================
   EVENT RECOMMENDATION (pure, no database access)
   apps/api/src/events/utils/event-recommendation.ts

   Scores eligible events for one viewer and plans where event cards go
   between the posts of one feed page. Kept free of Nest/Mongoose so it can
   be unit tested directly.

   Eligibility is decided by the database query BEFORE scoring (active,
   visible to the viewer, not by a blocked organizer). This module never
   widens that set; it only orders and spaces it.
============================================================================ */

import { getEventStatus, isEventActive, toTime } from "./event-lifecycle";
import { EventStatus } from "../schemas/event.schema";

export interface RecommendableEvent {
  id: string;
  creatorId: string;
  category: string;
  startDate: Date | string;
  endDate: Date | string;
  isCancelled?: boolean;
  isOnline?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  attendeeIds: string[];
  interestedIds: string[];
  capacity?: number | null;
}

export interface EventViewerSignals {
  viewerId?: string;
  /** Count of past Going/Interested RSVPs per category. */
  categoryAffinity: Map<string, number>;
  friendIds: Set<string>;
  followedIds: Set<string>;
  /** Viewer location, only when the client sent it (permission granted). */
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
}

export interface ScoredEvent<T extends RecommendableEvent = RecommendableEvent> {
  event: T;
  score: number;
  reasons: string[];
}

export const EVENT_RECOMMENDATION_CONFIG = {
  /** Only events starting within this horizon are recommended in the feed. */
  horizonDays: 45,
  /** Half-life (hours) of the "happening soon" boost. */
  soonHalfLifeHours: 72,
  weights: {
    soon: 1.0,
    live: 0.6,
    category: 1.2,
    organizerFriend: 0.8,
    organizerFollowed: 0.6,
    friendsAttending: 0.25,
    friendsAttendingCap: 0.75,
    popularity: 0.5,
    distance: 0.9,
  },
  /** Multipliers. */
  interestedPenalty: 0.45,
  fullPenalty: 0.2,
  defaultRadiusKm: 80,
  /** Feed placement. */
  firstSlotAfterIndex: 3,
  slotSpacing: 6,
  maxEventsPerPage: 3,
  /** Never place two events of the same category back-to-back on a page. */
  diversify: true,
};

export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function hasCoordinates(
  latitude: unknown,
  longitude: unknown,
): latitude is number {
  return (
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude)
  );
}

export function scoreEvent<T extends RecommendableEvent>(
  event: T,
  signals: EventViewerSignals,
  now: Date = new Date(),
  config = EVENT_RECOMMENDATION_CONFIG,
): ScoredEvent<T> | null {
  // Defensive: the query already filters these, but a stale document must
  // never be recommended.
  if (!isEventActive(event, now)) {
    return null;
  }

  const viewerId = signals.viewerId ?? "";

  if (viewerId && event.creatorId === viewerId) {
    return null;
  }

  // Already going: nothing to recommend.
  if (viewerId && event.attendeeIds.includes(viewerId)) {
    return null;
  }

  const w = config.weights;
  const reasons: string[] = [];
  let score = 0;

  const status = getEventStatus(event, now);
  const hoursUntilStart = Math.max(
    0,
    (toTime(event.startDate) - now.getTime()) / 3_600_000,
  );

  if (status === EventStatus.LIVE) {
    score += w.live;
    reasons.push("live");
  } else {
    const soon = Math.pow(0.5, hoursUntilStart / config.soonHalfLifeHours);

    score += w.soon * soon;

    if (hoursUntilStart <= 24) {
      reasons.push("soon");
    }
  }

  // Category interest, normalised against the viewer's strongest category.
  const affinityValues = Array.from(signals.categoryAffinity.values());
  const maxAffinity = affinityValues.length ? Math.max(...affinityValues) : 0;
  const categoryAffinity = signals.categoryAffinity.get(event.category) ?? 0;

  if (maxAffinity > 0 && categoryAffinity > 0) {
    score += w.category * (categoryAffinity / maxAffinity);
    reasons.push("category");
  }

  if (signals.friendIds.has(event.creatorId)) {
    score += w.organizerFriend;
    reasons.push("friend-organizer");
  } else if (signals.followedIds.has(event.creatorId)) {
    score += w.organizerFollowed;
    reasons.push("followed-organizer");
  }

  const friendsGoing = event.attendeeIds.filter((id) =>
    signals.friendIds.has(id),
  ).length;

  if (friendsGoing > 0) {
    score += Math.min(w.friendsAttendingCap, friendsGoing * w.friendsAttending);
    reasons.push("friends-going");
  }

  const engagement = event.attendeeIds.length + 0.5 * event.interestedIds.length;

  score += w.popularity * Math.min(1, Math.log1p(engagement) / Math.log(200));

  if (
    !event.isOnline &&
    hasCoordinates(signals.latitude, signals.longitude) &&
    hasCoordinates(event.latitude, event.longitude)
  ) {
    const radius = signals.radiusKm ?? config.defaultRadiusKm;
    const distance = haversineKm(
      signals.latitude as number,
      signals.longitude as number,
      event.latitude as number,
      event.longitude as number,
    );

    if (distance <= radius) {
      score += w.distance * (1 - distance / radius);
      reasons.push("nearby");
    }
  }

  if (viewerId && event.interestedIds.includes(viewerId)) {
    score *= config.interestedPenalty;
    reasons.push("already-interested");
  }

  if (
    typeof event.capacity === "number" &&
    event.capacity > 0 &&
    event.attendeeIds.length >= event.capacity
  ) {
    score *= config.fullPenalty;
    reasons.push("full");
  }

  return { event, score, reasons };
}

export function rankEvents<T extends RecommendableEvent>(
  events: T[],
  signals: EventViewerSignals,
  now: Date = new Date(),
  config = EVENT_RECOMMENDATION_CONFIG,
): ScoredEvent<T>[] {
  const seen = new Set<string>();
  const scored: ScoredEvent<T>[] = [];

  for (const event of events) {
    if (seen.has(event.id)) {
      continue;
    }

    seen.add(event.id);

    const result = scoreEvent(event, signals, now, config);

    if (result) {
      scored.push(result);
    }
  }

  // Stable order: score, then sooner start, then id.
  scored.sort(
    (a, b) =>
      b.score - a.score ||
      toTime(a.event.startDate) - toTime(b.event.startDate) ||
      a.event.id.localeCompare(b.event.id),
  );

  if (!config.diversify || scored.length < 3) {
    return scored;
  }

  // Greedy re-order so the same category does not appear twice in a row
  // when another category is available.
  const pending = [...scored];
  const ordered: ScoredEvent<T>[] = [];

  while (pending.length) {
    const previous = ordered[ordered.length - 1]?.event.category;
    const index = pending.findIndex((item) => item.event.category !== previous);
    const [next] = pending.splice(index === -1 ? 0 : index, 1);

    ordered.push(next);
  }

  return ordered;
}

/**
 * Zero-based post indexes on one feed page after which an event card goes.
 * Example (10-post page): after posts 3 and 9 (0-based).
 */
export function planEventSlots(
  postCount: number,
  config = EVENT_RECOMMENDATION_CONFIG,
): number[] {
  const slots: number[] = [];

  for (
    let index = config.firstSlotAfterIndex;
    index < postCount && slots.length < config.maxEventsPerPage;
    index += config.slotSpacing
  ) {
    slots.push(index);
  }

  return slots;
}

/** Comma-separated ObjectId list from the query string, capped and validated. */
export function parseEventIdList(value: unknown, max = 100): string[] {
  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  const ids = new Set<string>();

  for (const part of value.split(",")) {
    const id = part.trim();

    if (/^[a-f0-9]{24}$/i.test(id)) {
      ids.add(id.toLowerCase());
    }

    if (ids.size >= max) {
      break;
    }
  }

  return Array.from(ids);
}
