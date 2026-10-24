/* ============================================================================
   EVENT VISIBILITY
   apps/api/src/events/utils/event-visibility.ts

   Who may see an event (and therefore its details, attendees and RSVP):

     public        everyone, except users in a block relationship with
                   the organizer
     friends       the organizer and the organizer's accepted friends
     private       the organizer, invited people, and people already on
     organization  the event (Going or Interested)

   The organizer always sees their own events. A block in either direction
   hides the event from the other user regardless of visibility.

   The same rule exists twice: as a MongoDB filter (lists, discovery,
   feed) and as a function (single-event reads and writes). The tests in
   event-visibility.spec.ts keep the two in agreement.
============================================================================ */

import { Types } from "mongoose";

import { EventVisibility } from "../schemas/event.schema";
import type { EventViewerRelationships } from "./viewer-relationships";

export interface VisibilityFields {
  creatorId: Types.ObjectId | string;
  visibility?: EventVisibility | string;
  attendeeIds?: Array<Types.ObjectId | string>;
  interestedIds?: Array<Types.ObjectId | string>;
  invitedIds?: Array<Types.ObjectId | string>;
}

function toObjectIds(ids: string[]): Types.ObjectId[] {
  return ids
    .filter((id) => Types.ObjectId.isValid(id))
    .map((id) => new Types.ObjectId(id));
}

export function buildEventVisibilityFilter(
  viewerId: string | undefined,
  relationships: EventViewerRelationships,
): Record<string, unknown> {
  const audience: Record<string, unknown>[] = [
    { visibility: EventVisibility.PUBLIC },
    // Documents created before visibility existed default to public.
    { visibility: { $exists: false } },
  ];

  if (viewerId && Types.ObjectId.isValid(viewerId)) {
    const viewer = new Types.ObjectId(viewerId);

    audience.push({ creatorId: viewer });

    if (relationships.friendIds.length) {
      audience.push({
        visibility: EventVisibility.FRIENDS,
        creatorId: { $in: toObjectIds(relationships.friendIds) },
      });
    }

    audience.push({
      visibility: { $in: [EventVisibility.PRIVATE, EventVisibility.ORGANIZATION] },
      $or: [
        { attendeeIds: viewer },
        { interestedIds: viewer },
        { invitedIds: viewer },
      ],
    });
  }

  const filter: Record<string, unknown> = { $or: audience };

  if (relationships.blockedIds.length) {
    filter.creatorId = { $nin: toObjectIds(relationships.blockedIds) };
  }

  return filter;
}

export function canViewEvent(
  event: VisibilityFields,
  viewerId: string | undefined,
  relationships: EventViewerRelationships,
): boolean {
  const creator = String(event.creatorId);

  if (viewerId && creator === viewerId) {
    return true;
  }

  if (relationships.blockedIds.includes(creator)) {
    return false;
  }

  const visibility = event.visibility ?? EventVisibility.PUBLIC;

  if (visibility === EventVisibility.PUBLIC) {
    return true;
  }

  if (!viewerId) {
    return false;
  }

  if (visibility === EventVisibility.FRIENDS) {
    return relationships.friendIds.includes(creator);
  }

  const onEvent = [
    ...(event.attendeeIds ?? []),
    ...(event.interestedIds ?? []),
    ...(event.invitedIds ?? []),
  ].some(
    (id) => String(id) === viewerId,
  );

  return onEvent;
}
