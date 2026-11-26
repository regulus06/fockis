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
/**
 * "live" = happening now by the clock (not a livestream). "postponed" = new date
 * to be announced. "scheduled" = not published yet (managers only).
 */
export type EventStatus = "upcoming" | "live" | "ended" | "cancelled" | "postponed" | "scheduled";
export type EventFormatKind = "in_person" | "online" | "hybrid";
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

export type RegistrationMode = "none" | "rsvp" | "required";
export type RegistrationAccess = "public" | "members" | "selected";
export type AttendanceOption = "in_person" | "online";
export type QuestionType = "short_text" | "long_text" | "dropdown" | "single_choice" | "multiple_choice" | "yes_no";

export interface RegistrationQuestion {
  id: string;
  type: QuestionType;
  label: string;
  required: boolean;
  options: string[];
}

export interface TicketTypeInput {
  id: string;
  name: string;
  description: string;
  price: number;
  /** null = limited only by the event capacity. */
  quantity: number | null;
}

/** Organizer settings (mirrors registrations/registration-settings.ts). */
export interface RegistrationSettingsInput {
  mode: RegistrationMode;
  opensAt: string | null;
  closesAt: string | null;
  waitlistEnabled: boolean;
  requireApproval: boolean;
  allowGuests: boolean;
  maxTicketsPerUser: number;
  isFree?: boolean;
  currency: string;
  ticketTypes: TicketTypeInput[];
  taxRatePercent: number;
  serviceFee: number;
  questions: RegistrationQuestion[];
  askAccessibility: boolean;
  askSpecialRequests: boolean;
  attendanceOptions: AttendanceOption[];
  termsText: string;
  termsUrl: string;
  cancellationPolicy: string;
  allowCancellation: boolean;
  cancellationDeadlineHours: number;
  qrCheckIn: boolean;
  individualCheckIn: boolean;
  confirmationEmail: boolean;
  reminders: boolean;
  access: RegistrationAccess;
  organizationId: string | null;
  selectedGroupIds: string[];
  earlyJoinMinutes: number;
  checkInStaffIds: string[];
  /** Standard: live QR, account-bound, single use. Enhanced: + staff identity check, no guests. */
  ticketSecurity?: "standard" | "enhanced";
  /** Lifetime of one live entry QR: 15, 30 or 60 seconds. */
  qrTtlSeconds?: number;
  allowReentry?: boolean;
  showHolderPhoto?: boolean;
}

/** Registration facts every viewer gets with an event. */
export interface EventRegistrationSummary {
  mode: RegistrationMode;
  isFree: boolean;
  minPrice: number;
  maxPrice: number;
  currency: string;
  requireApproval: boolean;
  waitlistEnabled: boolean;
  opensAt: string | null;
  closesAt: string | null;
  attendanceOptions: AttendanceOption[];
  access: RegistrationAccess;
  registeredSeats: number;
  hasOnlineMeeting: boolean;
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
  /** Always present from the API (defaults to optional RSVP). */
  registration?: EventRegistrationSummary;
  /** Organizer only. */
  registrationSettings?: RegistrationSettingsInput;
  /* Organization events (empty / false for personal events). */
  organizationId?: string | null;
  eventType?: string;
  orgCategory?: string;
  isDraft?: boolean;
  isArchived?: boolean;
  /** The viewer may edit this event (organizer or organization event manager). */
  canManage?: boolean;
  /** Recognized meeting service of the pasted link (managers only). */
  meetingProvider?: string;
  /** In person / online / hybrid (in person with an online option). */
  format: EventFormatKind;
  /** ISO country code of the venue ("" if unknown or online). */
  country: string;
  city: string;
  isPostponed: boolean;
  postponedAt: string | null;
  postponementReason: string;
  /** Scheduled publication time (managers only). */
  publishAt: string | null;
  /** The viewer saved (bookmarked) it. */
  isSaved: boolean;
}

/** Real counts for the "My Events" card (GET /events/my-summary). */
export interface MyEventsSummary {
  upcoming: number;
  registered: number;
  tickets: number;
  saved: number;
  hosted: number;
  past: number;
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
  /** Registration settings; null resets to optional RSVP. */
  registration?: RegistrationSettingsInput | null;
  /** Create / keep the event under this organization (needs its Manage events permission). */
  organizationId?: string;
  eventType?: string;
  orgCategory?: string;
  /** Save without publishing. */
  isDraft?: boolean;
  /** Notify the organization's active members when the event is published. */
  notifyMembers?: boolean;
  /** Scheduled publication (ISO). null / "" = publish now. */
  publishAt?: string | null;
  /** ISO country code of the venue. */
  country?: string;
  city?: string;
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
  | "any" | "live" | "today" | "tomorrow" | "this-week" | "this-weekend" | "this-month" | "next-30-days";
export type EventFormat = "any" | "online" | "in-person" | "hybrid";
export type EventAvailability = "any" | "open";
export type EventSort = "relevance" | "date" | "popularity" | "distance" | "price";
export type EventPrice = "any" | "free" | "paid";

export interface EventDiscoverQuery {
  q?: string;
  category?: EventCategory | "";
  when?: EventWhen;
  format?: EventFormat;
  availability?: EventAvailability;
  price?: EventPrice;
  /** ISO country code. */
  country?: string;
  city?: string;
  /** Only categories the viewer engages with most. */
  interests?: boolean;
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
