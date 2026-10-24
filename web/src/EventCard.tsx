export type EventCategory =
  | "general" | "music" | "sports" | "business" | "education" | "food"
  | "community" | "party" | "conference" | "religious" | "school"
  | "academic" | "fundraiser" | "workshop" | "meeting" | "networking"
  | "cultural" | "health" | "youth" | "technology" | "environment"
  | "political" | "civic" | "other";

export type EventVisibility = "public" | "friends" | "private" | "organization";
export type EventStatus = "upcoming" | "live" | "ended" | "cancelled";
export type EventCoverMediaType = "image" | "video";

export interface FockisEvent {
  id: string;
  creatorId: string;
  organizationId?: string | null;
  organization?: {
    id: string;
    name?: string;
    displayName?: string;
    logoUrl?: string | null;
    type?: string;
  } | null;
  title: string;
  description?: string;
  category: EventCategory;
  visibility: EventVisibility;
  startDate: string;
  endDate: string;
  locationName?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  isOnline: boolean;
  onlineUrl?: string;
  coverImageUrl?: string;
  coverVideoUrl?: string;
  coverMediaType?: EventCoverMediaType;
  attendeeCount: number;
  isGoing?: boolean;
  isInterested?: boolean;
  status: EventStatus;
  isCancelled: boolean;
  cancellationReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventInput {
  title: string;
  description?: string;
  category?: EventCategory;
  visibility?: EventVisibility;
  organizationId?: string;
  startDate: string;
  endDate: string;
  locationName?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  isOnline?: boolean;
  onlineUrl?: string;
  coverImageUrl?: string;
  coverVideoUrl?: string;
  coverMediaType?: EventCoverMediaType;
  coverImageFile?: File;
  eventVideoFile?: File;
  capacity?: number;
  requireRsvp?: boolean;
}

export type UpdateEventInput = Partial<CreateEventInput>;

export interface RsvpResponse {
  success: boolean;
  going: boolean;
  attendeeCount: number;
}

export interface OrganizationEventQuery {
  organizationId: string;
  search?: string;
  category?: EventCategory | "all";
  status?: EventStatus | "all";
}
