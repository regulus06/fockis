/* ============================================================================
   FEED EVENT PLACEMENT (pure)
   Turns the `events` slots of one GET /feed page into cards anchored to
   posts that are actually on screen.

   - The server says "after post X". The client may have dropped X (it was
     already displayed, deduplicated, or filtered), so the card moves to the
     nearest displayed post of the same page instead.
   - An event is placed at most once per scrolling session.
   - Two events are never anchored to the same post.
============================================================================ */

import type { FeedEventSlot, FockisEvent } from "../types/event.types";

export interface PlacedFeedEvent {
  key: string;
  anchorPostId: string;
  event: FockisEvent;
}

export function placeFeedEvents(
  slots: FeedEventSlot[],
  pagePostIds: string[],
  appendedPostIds: string[],
  alreadyPlacedEventIds: Set<string>,
  takenAnchors: Set<string>,
): PlacedFeedEvent[] {
  if (!slots.length || !appendedPostIds.length) return [];

  const appended = new Set(appendedPostIds);
  const placed: PlacedFeedEvent[] = [];
  const placedNow = new Set<string>();

  for (const slot of slots) {
    const id = slot?.event?.id;

    if (!id || alreadyPlacedEventIds.has(id) || placedNow.has(id)) continue;

    // Preferred anchor, else the first displayed post at or after the
    // slot's position on this page, else the last displayed post.
    let anchor = appended.has(slot.afterPostId) ? slot.afterPostId : "";

    if (!anchor) {
      const after = pagePostIds.slice(Math.max(0, slot.afterIndex));

      anchor = after.find((postId) => appended.has(postId)) ?? appendedPostIds[appendedPostIds.length - 1];
    }

    if (takenAnchors.has(anchor)) {
      const start = appendedPostIds.indexOf(anchor);
      const next = appendedPostIds.slice(start + 1).find((postId) => !takenAnchors.has(postId));

      if (!next) continue;

      anchor = next;
    }

    takenAnchors.add(anchor);
    placedNow.add(id);
    placed.push({ key: `event:${id}`, anchorPostId: anchor, event: slot.event });
  }

  return placed;
}

/** IDs to send as ?excludeEvents=, newest last, capped. */
export function excludeList(ids: Iterable<string>, max = 100): string[] {
  const list = Array.from(new Set(ids));

  return list.slice(Math.max(0, list.length - max));
}
