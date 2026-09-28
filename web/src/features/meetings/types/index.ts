// ============================================================================
// Fockis Meetings — shared types
// ============================================================================

/**
 * Meeting lifecycle status.
 */
export type MeetingStatus =
  | "scheduled"
  | "starting_soon"
  | "late"
  | "live"
  | "ended"
  | "cancelled";

/**
 * Who controls a meeting.
 */
export type ParticipantRole =
  | "host"
  | "co-host"
  | "participant";

/**
 * Attendance state.
 */
export type AttendanceStatus =
  | "present"
  | "late"
  | "absent"
  | "left_early"
  | "host"
  | "co_host";

/**
 * Determines who owns the meeting.
 *
 * user:
 *   Normal Fockis personal meeting.
 *
 * organization:
 *   Church, business, school, ministry, or other organization-owned meeting.
 */
export type MeetingOwnerType =
  | "user"
  | "organization";

/**
 * Organization type.
 *
 * Church is the first organization context supported by the
 * Church administration system, while keeping the type extensible.
 */
export type MeetingOrganizationType =
  | "church"
  | "business"
  | "school"
  | "community"
  | "other";

/**
 * Church-specific meeting categories.
 */
export type ChurchMeetingType =
  | "general"
  | "leadership"
  | "department"
  | "group"
  | "prayer"
  | "bible_study"
  | "pastoral"
  | "counseling"
  | "volunteer"
  | "event"
  | "other";

/**
 * Meeting visibility.
 */
export type MeetingVisibility =
  | "private"
  | "invite_only"
  | "members"
  | "organization"
  | "public";

/**
 * Basic Fockis user.
 */
export interface FockisUser {
  id: string;
  displayName: string;
  avatarUrl?: string;
  email?: string;
}

/**
 * Organization information attached to a meeting.
 *
 * For Church meetings:
 * organizationType = "church"
 */
export interface MeetingOrganization {
  id: string;
  name: string;
  type: MeetingOrganizationType;
  logoUrl?: string;
}

/**
 * Optional Church context.
 *
 * A meeting may belong to:
 * - the church organization
 * - a department
 * - a group
 * - an event
 *
 * Only organizationId is required for a Church-owned meeting.
 */
export interface MeetingChurchContext {
  organizationId: string;
  organizationName?: string;

  departmentId?: string;
  departmentName?: string;

  groupId?: string;
  groupName?: string;

  eventId?: string;
  eventName?: string;

  meetingType?: ChurchMeetingType;
}

/**
 * Meeting agenda item.
 */
export interface MeetingAgendaItem {
  id: string;
  order: number;
  title: string;
  completed?: boolean;
}

/**
 * Meeting security settings.
 */
export interface MeetingSecuritySettings {
  waitingRoomEnabled: boolean;
  allowJoinBeforeHost: boolean;
  muteParticipantsOnEntry: boolean;

  screenShareWhoCanShare:
    | "host_only"
    | "everyone";

  locked: boolean;
}

/**
 * AI Meeting Secretary configuration.
 */
export interface AiSecretaryConfig {
  enabled: boolean;

  takeNotes: boolean;

  generateTranscript: boolean;

  identifyMainPoints: boolean;

  identifyDecisions: boolean;

  identifyActionItems: boolean;

  identifyQuestions: boolean;

  generateSummary: boolean;

  generatePdfReport: boolean;
}

/**
 * ============================================================================
 * Meeting invitation
 * ============================================================================
 *
 * Represents an invitation sent to a Fockis user for a meeting.
 */
export interface MeetingInvitation {
  id: string;

  meetingId?: string;
  userId?: string;
  inviteeId?: string;

  displayName?: string;
  userName?: string;
  email?: string;
  avatarUrl?: string | null;

  status?:
    | "pending"
    | "accepted"
    | "declined"
    | "cancelled"
    | "expired"
    | string;

  invitedBy?: string;
  invitedAt?: string;
  respondedAt?: string;

  meeting?: Meeting;

  [key: string]: unknown;
}

/**
 * ============================================================================
 * Meeting
 * ============================================================================
 *
 * This interface supports BOTH:
 *
 * 1. Normal Fockis user meetings
 * 2. Organization-owned meetings such as Church meetings
 *
 * Existing meetings can continue using:
 *
 * ownerType: "user"
 * ownerId: hostId
 *
 * Church meetings use:
 *
 * ownerType: "organization"
 * ownerId: organizationId
 * organizationId: organizationId
 */
export interface Meeting {
  /**
   * Unique meeting ID.
   */
  id: string;

  /**
   * Meeting title.
   *
   * Kept as "topic" for compatibility with the existing system.
   */
  topic: string;

  description?: string;

  /**
   * --------------------------------------------------------------------------
   * Ownership
   * --------------------------------------------------------------------------
   */

  /**
   * Who owns the meeting.
   *
   * Existing personal meetings:
   *   "user"
   *
   * Church/organization meetings:
   *   "organization"
   */
  ownerType?: MeetingOwnerType;

  /**
   * ID of the owner.
   *
   * For personal meetings:
   *   user ID
   *
   * For organization meetings:
   *   organization ID
   */
  ownerId?: string;

  /**
   * Organization information.
   *
   * Present when the meeting belongs to an organization.
   */
  organization?: MeetingOrganization;

  /**
   * Organization ID.
   *
   * This is intentionally separate from "organization"
   * so API requests can work with a simple ID.
   */
  organizationId?: string;

  /**
   * Organization-specific meeting context.
   *
   * Used by Church meetings to associate the meeting with:
   *
   * - church
   * - department
   * - group
   * - event
   * - meeting type
   */
  churchContext?: MeetingChurchContext;

  /**
   * --------------------------------------------------------------------------
   * Host
   * --------------------------------------------------------------------------
   */

  hostId: string;

  hostName: string;

  /**
   * Optional full host object.
   */
  host?: FockisUser;

  /**
   * --------------------------------------------------------------------------
   * Scheduling
   * --------------------------------------------------------------------------
   */

  date: string;

  startTime: string;

  endTime: string;

  durationMinutes: number;

  timezone: string;

  /**
   * --------------------------------------------------------------------------
   * Meeting access
   * --------------------------------------------------------------------------
   */

  meetingCode: string;

  passcode?: string;

  joinLink: string;

  visibility?: MeetingVisibility;

  /**
   * Whether guests who are not organization members can join.
   */
  allowGuests?: boolean;

  /**
   * Whether participants must be approved before joining.
   */
  requireApproval?: boolean;

  /**
   * Maximum number of participants.
   */
  maxParticipants?: number;

  /**
   * --------------------------------------------------------------------------
   * Status
   * --------------------------------------------------------------------------
   */

  status: MeetingStatus;

  /**
   * --------------------------------------------------------------------------
   * Participants
   * --------------------------------------------------------------------------
   */

  participants: FockisUser[];

  participantCount: number;

  agenda: MeetingAgendaItem[];

  security: MeetingSecuritySettings;

  secretary: AiSecretaryConfig;

  recordingEnabled?: boolean;
}

/**
 * ============================================================================
 * Meeting participant
 * ============================================================================
 *
 * Used when an individual user is connected to a meeting.
 *
 * For Church meetings, organizationId can identify the Church context.
 */
export interface MeetingParticipant {
  id: string;

  meetingId: string;

  userId: string;

  user: FockisUser;

  organizationId?: string;

  role: ParticipantRole;

  status:
    | "invited"
    | "accepted"
    | "declined"
    | "joined"
    | "left";

  invitedAt?: string;

  acceptedAt?: string;

  joinedAt?: string;

  leftAt?: string;
}

/**
 * ============================================================================
 * Waiting room
 * ============================================================================
 */

export interface WaitingRoomEntry {
  id: string;

  meetingId?: string;

  user: FockisUser;

  requestedAt: string;
}

/**
 * ============================================================================
 * Room participant
 * ============================================================================
 */

export interface RoomParticipant {
  id: string;

  user: FockisUser;

  role: ParticipantRole;

  micOn: boolean;

  cameraOn: boolean;

  handRaised: boolean;

  isSpeaking: boolean;

  screenSharing: boolean;

  connectionQuality:
    | "good"
    | "weak"
    | "poor"
    | "reconnecting";

  joinedAt: string;

  leftAt?: string;
}

/**
 * ============================================================================
 * Chat
 * ============================================================================
 */

export interface ChatMessage {
  id: string;

  authorId: string;

  authorName: string;

  body: string;

  sentAt: string;

  mentions?: string[];

  attachmentName?: string;

  reactions?: {
    emoji: string;
    count: number;
  }[];
}

/**
 * ============================================================================
 * Late notices
 * ============================================================================
 */

export interface LateNotice {
  id: string;

  participantId: string;

  participantName: string;

  expectedMinutes: number;

  message: string;

  sentAt: string;
}

/**
 * ============================================================================
 * Transcript
 * ============================================================================
 */

export interface TranscriptLine {
  id: string;

  speakerId: string;

  speakerName: string;

  text: string;

  timestamp: string;
}

/**
 * ============================================================================
 * AI Secretary
 * ============================================================================
 */

export type SecretaryStatus =
  | "off"
  | "listening"
  | "processing"
  | "generating_summary"
  | "complete"
  | "error";

/**
 * ============================================================================
 * Meeting summary
 * ============================================================================
 */

export interface MeetingDecision {
  id: string;

  text: string;
}

export interface MeetingActionItem {
  id: string;

  assigneeName: string;

  task: string;

  dueDate?: string;
}

export interface MeetingQuestion {
  id: string;

  text: string;

  answered?: boolean;
}

export interface MeetingSummary {
  meetingId: string;

  overview: string;

  mainPoints: string[];

  decisions: MeetingDecision[];

  actionItems: MeetingActionItem[];

  questions: MeetingQuestion[];

  nextSteps: string[];

  generatedAt: string;
}

/**
 * ============================================================================
 * Attendance
 * ============================================================================
 */

export interface AttendanceRecord {
  userId: string;

  userName: string;

  status: AttendanceStatus;

  joinedAt?: string;

  leftAt?: string;

  minutesPresent?: number;

  /**
   * Church organization context.
   */
  organizationId?: string;

  /**
   * Optional Church department.
   */
  departmentId?: string;

  /**
   * Optional Church group.
   */
  groupId?: string;
}

/**
 * ============================================================================
 * PDF report
 * ============================================================================
 */

export type PdfGenerationStatus =
  | "idle"
  | "requested"
  | "generating"
  | "ready"
  | "error";

export interface MeetingPdfReport {
  meetingId: string;

  status: PdfGenerationStatus;

  downloadUrl?: string;

  error?: string;
}

/**
 * ============================================================================
 * Meeting creation/update helpers
 * ============================================================================
 */

/**
 * Data required to create a normal or organization-owned meeting.
 */
export interface CreateMeetingInput {
  topic: string;

  description?: string;

  /**
   * "user" for normal Fockis meetings.
   * "organization" for Church/organization meetings.
   */
  ownerType?: MeetingOwnerType;

  /**
   * Owner ID.
   */
  ownerId?: string;

  /**
   * Church/organization ID.
   */
  organizationId?: string;

  /**
   * Optional Church-specific context.
   */
  churchContext?: MeetingChurchContext;

  /**
   * Meeting host.
   */
  hostId: string;

  hostName?: string;

  /**
   * Schedule.
   */
  date: string;

  startTime: string;

  endTime: string;

  durationMinutes: number;

  timezone: string;

  /**
   * Access.
   */
  visibility?: MeetingVisibility;

  allowGuests?: boolean;

  requireApproval?: boolean;

  maxParticipants?: number;

  /**
   * Optional meeting access code.
   *
   * The backend may generate these automatically.
   */
  meetingCode?: string;

  passcode?: string;

  /**
   * Meeting settings.
   */
  agenda?: MeetingAgendaItem[];

  security?: MeetingSecuritySettings;

  secretary?: AiSecretaryConfig;

  recordingEnabled?: boolean;
}

/**
 * Meeting update payload.
 */
export interface UpdateMeetingInput {
  topic?: string;

  description?: string;

  organizationId?: string;

  churchContext?: MeetingChurchContext;

  date?: string;

  startTime?: string;

  endTime?: string;

  durationMinutes?: number;

  timezone?: string;

  visibility?: MeetingVisibility;

  allowGuests?: boolean;

  requireApproval?: boolean;

  maxParticipants?: number;

  agenda?: MeetingAgendaItem[];

  security?: MeetingSecuritySettings;

  secretary?: AiSecretaryConfig;

  recordingEnabled?: boolean;

  status?: MeetingStatus;
}

/**
 * ============================================================================
 * Church meeting helpers
 * ============================================================================
 */

/**
 * Data used by the Church admin scheduling screen.
 */
export interface CreateChurchMeetingInput
  extends CreateMeetingInput {
  ownerType: "organization";

  organizationId: string;

  churchContext?: MeetingChurchContext;
}

/**
 * Church meeting filters.
 */
export interface ChurchMeetingFilters {
  organizationId: string;

  status?: MeetingStatus;

  meetingType?: ChurchMeetingType;

  departmentId?: string;

  groupId?: string;

  eventId?: string;

  search?: string;
}

/**
 * ============================================================================
 * Async request helper
 * ============================================================================
 */

export type ApiResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: string;
    };