// ============================================================================
// FOCKIS EVENT TYPES
// ============================================================================
//
// Events are universal across Fockis.
//
// An event may be:
//   1. A personal/global Fockis event
//   2. An organization event
//
// Organization events are identified by organizationId.
//
// This allows the same Events system to support:
// - Churches
// - Ministries
// - Schools
// - Colleges / Universities
// - Businesses
// - Nonprofits
// - Civic organizations
// - Political organizations
// - Sports organizations
// - Arts & Culture organizations
// - Health organizations
// - Youth organizations
// - Clubs & Associations
// - Technology organizations
// - Environmental organizations
// - Other organizations
// ============================================================================

// ============================================================================
// EVENT CATEGORY
// ============================================================================

export type EventCategory =
  | 'general'
  | 'music'
  | 'sports'
  | 'business'
  | 'education'
  | 'food'
  | 'community'
  | 'party'
  | 'conference'
  | 'religious'
  | 'school'
  | 'academic'
  | 'fundraiser'
  | 'workshop'
  | 'meeting'
  | 'networking'
  | 'cultural'
  | 'health'
  | 'youth'
  | 'technology'
  | 'environment'
  | 'political'
  | 'civic'
  | 'other';

// ============================================================================
// EVENT VISIBILITY
// ============================================================================

export type EventVisibility =
  | 'public'
  | 'friends'
  | 'private'
  | 'organization';

// ============================================================================
// EVENT STATUS
// ============================================================================

export type EventStatus =
  | 'upcoming'
  | 'live'
  | 'ended'
  | 'cancelled';

// ============================================================================
// EVENT
// ============================================================================

export interface FockisEvent {
  id: string;

  /**
   * User who created/owns the event.
   */
  creatorId: string;

  /**
   * Organization that owns the event.
   *
   * Undefined/null means this is a normal global/personal
   * Fockis event.
   */
  organizationId?: string | null;

  /**
   * Optional organization snapshot information.
   *
   * Useful when the backend populates organization information.
   */
  organization?: {
    id: string;
    name?: string;
    displayName?: string;
    logoUrl?: string | null;
    type?: string;
  } | null;

  title: string;

  description: string;

  category: EventCategory;

  visibility: EventVisibility;

  // ==========================================================================
  // DATE / TIME
  // ==========================================================================

  startDate: string;

  endDate: string;

  // ==========================================================================
  // LOCATION
  // ==========================================================================

  locationName: string;

  address: string;

  latitude: number | null;

  longitude: number | null;

  // ==========================================================================
  // ONLINE EVENT
  // ==========================================================================

  isOnline: boolean;

  onlineUrl: string;

  // ==========================================================================
  // COVER IMAGE
  // ==========================================================================

  coverImageUrl: string;

  // ==========================================================================
  // EVENT VIDEO
  // ==========================================================================

  eventVideoUrl: string;

  // ==========================================================================
  // ATTENDEES
  // ==========================================================================

  attendeeCount: number;

  // ==========================================================================
  // STATUS
  // ==========================================================================

  status: EventStatus;

  isCancelled: boolean;

  cancellationReason?: string | null;

  // ==========================================================================
  // TIMESTAMPS
  // ==========================================================================

  createdAt: string;

  updatedAt: string;
}

// ============================================================================
// CREATE EVENT
// ============================================================================

export interface CreateEventInput {
  title: string;

  description?: string;

  category?: EventCategory;

  visibility?: EventVisibility;

  /**
   * If supplied, the event belongs to this organization.
   *
   * The backend MUST verify that the authenticated user has
   * permission to create an event for this organization.
   */
  organizationId?: string;

  // ==========================================================================
  // DATE / TIME
  // ==========================================================================

  startDate: string;

  endDate: string;

  // ==========================================================================
  // LOCATION
  // ==========================================================================

  locationName?: string;

  address?: string;

  latitude?: number;

  longitude?: number;

  // ==========================================================================
  // ONLINE EVENT
  // ==========================================================================

  isOnline?: boolean;

  onlineUrl?: string;

  // ==========================================================================
  // COVER IMAGE
  // ==========================================================================

  coverImageUrl?: string;

  coverImageFile?: File;

  // ==========================================================================
  // EVENT VIDEO
  // ==========================================================================

  eventVideoUrl?: string;

  eventVideoFile?: File;
}

// ============================================================================
// UPDATE EVENT
// ============================================================================

export type UpdateEventInput =
  Partial<CreateEventInput>;

// ============================================================================
// RSVP
// ============================================================================

export interface RsvpResponse {
  success: boolean;

  going: boolean;

  attendeeCount: number;
}

// ============================================================================
// ORGANIZATION EVENT QUERY
// ============================================================================

export interface OrganizationEventQuery {
  organizationId: string;

  search?: string;

  category?: EventCategory | 'all';

  status?:
    | 'all'
    | 'upcoming'
    | 'live'
    | 'ended'
    | 'cancelled';
}