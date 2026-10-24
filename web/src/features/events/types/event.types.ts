/* ============================================================================
   FOCKIS EVENTS — TYPES
   Mirrors apps/api/src/events (schemas/event.schema.ts, services/events.service.ts).
============================================================================ */

export type EventCategory =
  | "general" | "music" | "sports" | "business" | "education" | "food" | "community"
  | "party" | "conference" | "religious" | "school" | "academic" | "fundraiser"
  | "workshop" | "meeting" | "networking" | "cultural" | "health" | "youth"
  | "technology" | "environment" | "political" | "civic" | "arts" | "other";

export type EventVisibility = "public" | "friends" | "private" | "organization";
export type EventStatus = "upcoming" | "live" | "ended" | "cancelled";
export type EventCoverMediaType = "image" | "video";
export type EventRsvpStatus = "going" | "interested";

export interface EventPerson {
  id: string;
  username: string;
  name: string;
  avatar: string;
  verified: boolean;
  isOrganizer?: boolean;
  isFriend?: boolean;
}

export interface FockisEvent {
  id: string;
  creatorId: string;
  organizer: EventPerson | null;
  title: string;
  description?: string;
  category: EventCategory;
  visibility: EventVisibility;
  /** UTC ISO instants. */
  startDate: string;
  endDate: string;
  /** IANA zone the organizer scheduled in ("" for older events). */
  timeZone: string;
  locationName?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  isOnline: boolean;
  /** Empty unless the viewer is the organizer, Going or Interested. */
  onlineUrl?: string;
  coverImageUrl?: string;
  coverVideoUrl?: string;
  coverMediaType?: EventCoverMediaType;
  attendeeCount: number;
  interestedCount: number;
  capacity: number | null;
  spotsLeft: number | null;
  isFull: boolean;
  isGoing?: boolean;
  isInterested: boolean;
  isInvited: boolean;
  viewerRsvp: EventRsvpStatus | null;
  isOwner: boolean;
  /** Server-computed at response time; re-derive with getEventStatus(). */
  status: EventStatus;
  isCancelled: boolean;
  cancelledAt: string | null;
  cancellationReason?: string | null;
  canRsvp: boolean;
  distanceKm?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventInput {
  title: string;
  description?: string;
  category?: EventCategory;
  visibility?: EventVisibility;
  startDate: string;
  endDate: string;
  timeZone?: string;
  locationName?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  isOnline?: boolean;
  onlineUrl?: string;
  capacity?: number | null;
  coverImageUrl?: string;
  coverVideoUrl?: string;
  coverMediaType?: EventCoverMediaType;
  coverImageFile?: File;
  eventVideoFile?: File;
}

export type UpdateEventInput = Partial<CreateEventInput>;

export interface RsvpResponse {
  success: boolean;
  eventId?: string;
  status: EventRsvpStatus | null;
  going: boolean;
  interested: boolean;
  attendeeCount: number;
  interestedCount: number;
}

export interface EventAttendeesResponse {
  eventId: string;
  status: EventRsvpStatus;
  attendeeCount: number;
  interestedCount: number;
  attendees: EventPerson[];
  friendsGoingCount: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export type EventWhen =
  | "any" | "live" | "today" | "tomorrow" | "this-week" | "this-weekend" | "next-30-days";
export type EventFormat = "any" | "online" | "in-person";
export type EventAvailability = "any" | "open";
export type EventSort = "relevance" | "date" | "popularity" | "distance";

export interface EventDiscoverQuery {
  q?: string;
  category?: EventCategory | "";
  when?: EventWhen;
  format?: EventFormat;
  availability?: EventAvailability;
  sort?: EventSort;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  page?: number;
  limit?: number;
}

export interface EventPage {
  items: FockisEvent[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  serverTime: string;
}

export interface EventSections {
  happeningNow: FockisEvent[];
  today: FockisEvent[];
  featured: FockisEvent[];
  recommended: FockisEvent[];
  nearby: FockisEvent[];
  online: FockisEvent[];
  upcoming: FockisEvent[];
  serverTime: string;
}

/** One event placed between feed posts (GET /feed → events[]). */
export interface FeedEventSlot {
  type: "event";
  key: string;
  afterPostId: string;
  afterIndex: number;
  event: FockisEvent;
}

export interface ViewerLocation {
  latitude: number;
  longitude: number;
}
