import { useMemo } from "react";

import { useSyncedEvent } from "../hooks/eventSync";
import type { FockisEvent } from "../types/event.types";
import EventRsvpActions from "./EventRsvpActions";

interface Props {
  /** Preferred: the full event. */
  event?: FockisEvent;
  /** Legacy props (older callers passed only an ID). */
  eventId?: string;
  initiallyGoing?: boolean;
  onChanged?: (going: boolean, count: number) => void;
  size?: "sm" | "md";
}

/** "Going" toggle. Kept as a default export for existing imports. */
export default function EventRsvpButton({ event, eventId, initiallyGoing, size = "md" }: Props) {
  const fallback = useMemo<FockisEvent>(
    () => ({
      id: eventId ?? "",
      creatorId: "",
      organizer: null,
      title: "",
      category: "general",
      visibility: "public",
      startDate: new Date(0).toISOString(),
      endDate: new Date(8.64e15).toISOString(),
      timeZone: "",
      isOnline: false,
      attendeeCount: 0,
      interestedCount: 0,
      capacity: null,
      spotsLeft: null,
      isFull: false,
      isGoing: Boolean(initiallyGoing),
      isInterested: false,
      isInvited: false,
      viewerRsvp: initiallyGoing ? "going" : null,
      isOwner: false,
      status: "upcoming",
      isCancelled: false,
      cancelledAt: null,
      canRsvp: true,
      createdAt: "",
      updatedAt: "",
    }),
    [eventId, initiallyGoing],
  );

  const synced = useSyncedEvent(event ?? fallback);

  if (!synced.id) return null;

  return <EventRsvpActions event={synced} size={size} only="going" />;
}

export function EventInterestedButton({ event, size = "md" }: { event: FockisEvent; size?: "sm" | "md" }) {
  const synced = useSyncedEvent(event);

  return <EventRsvpActions event={synced} size={size} only="interested" />;
}
