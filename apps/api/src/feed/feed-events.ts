/* ============================================================================
   FEED EVENT SLOTS
   apps/api/src/feed/feed-events.ts

   Events are mixed into GET /feed WITHOUT turning them into posts:

     {
       feed:   [ ...posts, unchanged ],
       events: [
         { type: "event", key: "event:<id>", afterPostId, afterIndex, event },
         ...
       ]
     }

   `feed` keeps exactly the shape older clients (web, mobile) already
   parse, so nothing that ignores `events` breaks. Clients that understand
   `events` render each card right after the post `afterPostId`.

   Repetition control
   - The client sends ?excludeEvents=<id,id,...> with the events it has
     already shown or dismissed in the current scrolling session.
   - For You additionally remembers, per (viewer, session), which events
     this server already served, so a client that sends nothing still
     does not see the same event twice in one session.
============================================================================ */

import type { SerializedEvent } from "../events/services/events.service";
import { planEventSlots } from "../events/utils/event-recommendation";

export interface FeedEventSlot {
  type: "event";
  key: string;
  afterPostId: string;
  afterIndex: number;
  event: SerializedEvent;
}

export function buildFeedEventSlots(
  postIds: string[],
  events: SerializedEvent[],
): FeedEventSlot[] {
  const slots = planEventSlots(postIds.length);
  const placed: FeedEventSlot[] = [];
  const used = new Set<string>();

  for (const afterIndex of slots) {
    const event = events.find((item) => !used.has(item.id));

    if (!event) {
      break;
    }

    used.add(event.id);
    placed.push({
      type: "event",
      key: `event:${event.id}`,
      afterPostId: postIds[afterIndex],
      afterIndex,
      event,
    });
  }

  return placed;
}

/** Bounded, expiring memory of events served per feed session. */
export class ServedEventsStore {
  private readonly entries = new Map<string, { ids: Set<string>; touchedAt: number }>();

  constructor(
    private readonly ttlMs = 30 * 60_000,
    private readonly maxEntries = 5_000,
    private readonly maxIdsPerEntry = 200,
  ) {}

  get(key: string | undefined, now = Date.now()): string[] {
    if (!key) {
      return [];
    }

    const entry = this.entries.get(key);

    if (!entry) {
      return [];
    }

    if (now - entry.touchedAt > this.ttlMs) {
      this.entries.delete(key);
      return [];
    }

    return Array.from(entry.ids);
  }

  add(key: string | undefined, ids: string[], now = Date.now()) {
    if (!key || ids.length === 0) {
      return;
    }

    const entry = this.entries.get(key) ?? { ids: new Set<string>(), touchedAt: now };

    for (const id of ids) {
      entry.ids.add(id);
    }

    while (entry.ids.size > this.maxIdsPerEntry) {
      const oldest = entry.ids.values().next().value;

      if (oldest === undefined) {
        break;
      }

      entry.ids.delete(oldest);
    }

    entry.touchedAt = now;
    this.entries.delete(key);
    this.entries.set(key, entry);

    while (this.entries.size > this.maxEntries) {
      const oldestKey = this.entries.keys().next().value;

      if (oldestKey === undefined) {
        break;
      }

      this.entries.delete(oldestKey);
    }
  }
}
