import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Optional,
} from "@nestjs/common";

import { EventEmitter2 } from "@nestjs/event-emitter";

import { InjectConnection, InjectModel } from "@nestjs/mongoose";

import { Connection, Model, PipelineStage, Types } from "mongoose";

import { promises as fs } from "fs";

import {
  Event,
  EventCategory,
  EventCoverMediaType,
  EventDocument,
  EventRsvpStatus,
  EventStatus,
  EventVisibility,
} from "../schemas/event.schema";

import { CreateEventDto } from "../dto/create-event.dto";
import { NotificationsService } from "../../notifications/notifications.service";
import { isOrgEventManager } from "../utils/org-manager";
import { sanitizeEventHtml, textLength } from "../utils/rich-text";
import { UpdateEventDto } from "../dto/update-event.dto";
import type {
  DiscoverEventsQueryDto,
  EventSectionsQueryDto,
} from "../dto/discover-events.dto";

import {
  activeEventFilter,
  getEventStatus,
  isEventActive,
  isScheduled,
} from "../utils/event-lifecycle";

import {
  buildEventVisibilityFilter,
  canViewEvent,
} from "../utils/event-visibility";

import {
  EMPTY_RELATIONSHIPS,
  EventViewerRelationships,
  loadEventViewerRelationships,
} from "../utils/viewer-relationships";

import {
  normalizeSettings,
  RegistrationAccess,
  RegistrationMode,
  settingsOf,
  type EventRegistrationSettings,
} from "../registrations/registration-settings";

import {
  EVENT_RECOMMENDATION_CONFIG,
  haversineKm,
  rankEvents,
  RecommendableEvent,
} from "../utils/event-recommendation";

/* ============================================================================
   TYPES
============================================================================ */

type Filter = Record<string, any>;

/** Lean event document as returned by .lean() / aggregate(). */
export type EventLean = Omit<Event, never> & {
  _id: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
};

export interface EventOrganizer {
  id: string;
  username: string;
  name: string;
  avatar: string;
  verified: boolean;
}

/** Registration facts every viewer may see (prices, mode, dates). */
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
  attendanceOptions: string[];
  access: RegistrationAccess;
  registeredSeats: number;
  /** Signed-in viewer can see the meeting link through GET /events/:id/join. */
  hasOnlineMeeting: boolean;
}

export interface SerializedEvent {
  id: string;
  creatorId: string;
  organizer: EventOrganizer | null;
  title: string;
  description: string;
  category: EventCategory;
  visibility: EventVisibility;
  startDate: string;
  endDate: string;
  timeZone: string;
  locationName: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  isOnline: boolean;
  /** Only returned to people who can join (organizer, Going, Interested). */
  onlineUrl: string;
  coverImageUrl: string;
  coverVideoUrl: string;
  coverMediaType: EventCoverMediaType;
  attendeeCount: number;
  interestedCount: number;
  capacity: number | null;
  spotsLeft: number | null;
  isFull: boolean;
  isGoing: boolean;
  isInterested: boolean;
  isInvited: boolean;
  viewerRsvp: EventRsvpStatus | null;
  isOwner: boolean;
  status: EventStatus;
  isCancelled: boolean;
  cancelledAt: string | null;
  cancellationReason: string;
  canRsvp: boolean;
  distanceKm?: number;
  createdAt: string | null;
  updatedAt: string | null;
  registration: EventRegistrationSummary;
  /** Full settings, organizer only (for the edit form). */
  registrationSettings?: EventRegistrationSettings;
  /** Organization events. */
  organizationId: string | null;
  eventType: string;
  orgCategory: string;
  isDraft: boolean;
  isArchived: boolean;
  /** The viewer may manage this event (organizer or organization event manager). */
  canManage: boolean;
  /** Host of the meeting link ("meet.fockis.com", "zoom.us"…), managers only. */
  meetingProvider?: string;
  /** in_person | online | hybrid (in person with an online option). */
  format: EventFormatKind;
  country: string;
  city: string;
  isPostponed: boolean;
  postponedAt: string | null;
  postponementReason: string;
  /** Scheduled publication time (managers only; others never see unpublished events). */
  publishAt: string | null;
  isSaved: boolean;
}

export type EventFormatKind = "in_person" | "online" | "hybrid";

/** Counts for the "My Events" card (all real, from the database). */
export interface MyEventsSummary {
  upcoming: number;
  registered: number;
  tickets: number;
  saved: number;
  hosted: number;
  past: number;
}

export interface RsvpResult {
  success: true;
  eventId: string;
  status: EventRsvpStatus | null;
  going: boolean;
  interested: boolean;
  attendeeCount: number;
  interestedCount: number;
}

export interface FeedEventRecommendationOptions {
  viewerId?: string;
  relationships: EventViewerRelationships;
  excludeIds?: string[];
  /** Restrict organizers (Following / Friends feed modes). */
  organizerIds?: string[];
  limit: number;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  now?: Date;
}

/* ============================================================================
   CONSTANTS
============================================================================ */

const DAY_MS = 86_400_000;
const MAX_EVENT_DURATION_MS = 90 * DAY_MS;
const MAX_LIST = 200;
const MAX_HISTORY = 500;
const ORGANIZER_FIELDS = "username firstName lastName profilePicture verified";

/* ============================================================================
   HELPERS
============================================================================ */

/** "meet.fockis.com", "zoom.us"… from a meeting link (empty when it isn't a URL). */
function meetingProviderOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** In person / online / hybrid, from what is stored (no extra field to keep in sync). */
export function formatOf(event: { isOnline?: boolean; registration?: unknown }): EventFormatKind {
  if (event.isOnline) return "online";
  const options = (event.registration as { attendanceOptions?: unknown } | null | undefined)?.attendanceOptions;
  return Array.isArray(options) && options.includes("online") ? "hybrid" : "in_person";
}

/** MongoDB filters matching formatOf(). */
export function formatFilter(format: string | undefined): Filter {
  if (format === "online") return { isOnline: true };
  if (format === "hybrid") return { isOnline: { $ne: true }, "registration.attendanceOptions": "online" };
  if (format === "in-person") return { isOnline: { $ne: true }, "registration.attendanceOptions": { $ne: "online" } };
  return {};
}

/** Free: no registration settings (RSVP events) or settings marked free. Paid: at least one priced ticket. */
export function priceFilter(price: string | undefined): Filter {
  if (price === "free") return { "registration.isFree": { $ne: false } };
  if (price === "paid") return { "registration.isFree": false };
  return {};
}

const COUNTRY_CODE = /^[A-Z]{2}$/;

function and(...filters: Filter[]): Filter {
  const parts = filters.filter((filter) => filter && Object.keys(filter).length);

  if (parts.length === 0) {
    return {};
  }

  return parts.length === 1 ? parts[0] : { $and: parts };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function idList(values: unknown): string[] {
  return Array.isArray(values) ? values.map((value) => String(value)) : [];
}

function toObjectIds(ids: string[]): Types.ObjectId[] {
  return ids
    .filter((id) => Types.ObjectId.isValid(id))
    .map((id) => new Types.ObjectId(id));
}

function isoOrNull(value: unknown): string | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(String(value));

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function boundingBox(latitude: number, longitude: number, radiusKm: number) {
  const latDelta = radiusKm / 111.32;
  const cos = Math.max(0.01, Math.cos((latitude * Math.PI) / 180));
  const lngDelta = radiusKm / (111.32 * cos);

  return {
    latitude: { $gte: latitude - latDelta, $lte: latitude + latDelta },
    longitude: { $gte: longitude - lngDelta, $lte: longitude + lngDelta },
  };
}

/** Weekday (0 = Sunday) of an instant in an IANA zone; UTC on failure. */
function weekdayIn(instant: Date, timeZone?: string): number {
  try {
    const name = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      timeZone: timeZone || "UTC",
    }).format(instant);

    return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(name);
  } catch {
    return instant.getUTCDay();
  }
}

/* ============================================================================
   SERVICE
============================================================================ */

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    @InjectModel(Event.name)
    private readonly eventModel: Model<EventDocument>,

    @InjectConnection()
    private readonly connection: Connection,

    /** Tells registrations about time / place changes and cancellations. */
    @Optional()
    private readonly emitter?: EventEmitter2,

    /** Tells organization members about newly published events. */
    @Optional()
    private readonly notifications?: NotificationsService,
  ) {}

  /* ==========================================================================
     IDS
  ========================================================================== */

  private objectId(id: string, label = "event"): Types.ObjectId {
    if (!id || !Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ${label} ID.`);
    }

    return new Types.ObjectId(id);
  }

  /* ==========================================================================
     VIEWER CONTEXT
  ========================================================================== */

  async loadRelationships(viewerId?: string): Promise<EventViewerRelationships> {
    try {
      return await loadEventViewerRelationships(this.connection, viewerId, this.logger);
    } catch (error) {
      this.logger.warn(`Relationship lookup failed: ${String(error)}`);
      return { ...EMPTY_RELATIONSHIPS };
    }
  }

  private async visibleFilter(viewerId: string) {
    const relationships = await this.loadRelationships(viewerId);

    return {
      relationships,
      filter: buildEventVisibilityFilter(viewerId, relationships),
    };
  }

  /**
   * Loads one event the viewer is allowed to see. Events the viewer may
   * not see are reported as "not found" so their existence is not leaked.
   */
  private async loadVisible(
    eventId: string,
    viewerId: string,
  ): Promise<{ event: EventLean; relationships: EventViewerRelationships }> {
    const _id = this.objectId(eventId);

    const [event, relationships] = await Promise.all([
      this.eventModel.findById(_id).lean<EventLean>().exec(),
      this.loadRelationships(viewerId),
    ]);

    if (!event || !canViewEvent(event, viewerId, relationships)) {
      throw new NotFoundException("Event not found.");
    }

    return { event, relationships };
  }

  /** One event the viewer (or a signed-out guest) may see; "not found" otherwise. */
  async getViewable(eventId: string, viewerId?: string): Promise<EventLean> {
    const _id = this.objectId(eventId);
    const [event, relationships] = await Promise.all([
      this.eventModel.findById(_id).lean<EventLean>().exec(),
      viewerId ? this.loadRelationships(viewerId) : Promise.resolve({ ...EMPTY_RELATIONSHIPS }),
    ]);

    if (!event || !canViewEvent(event, viewerId, relationships)) {
      throw new NotFoundException("Event not found.");
    }

    return event;
  }

  /* ==========================================================================
     ORGANIZERS
  ========================================================================== */

  private async loadOrganizers(events: EventLean[]): Promise<Map<string, EventOrganizer>> {
    const organizers = new Map<string, EventOrganizer>();
    const ids = Array.from(new Set(events.map((event) => String(event.creatorId))));
    const userModel = this.connection.models["User"];

    if (!userModel || ids.length === 0) {
      return organizers;
    }

    try {
      const users = await userModel
        .find({ _id: { $in: toObjectIds(ids) } })
        .select(ORGANIZER_FIELDS)
        .lean()
        .exec();

      for (const user of users as any[]) {
        organizers.set(String(user._id), this.toPerson(user));
      }
    } catch (error) {
      this.logger.warn(`Could not load organizers: ${String(error)}`);
    }

    return organizers;
  }

  private toPerson(user: any): EventOrganizer {
    const name = [user?.firstName, user?.lastName]
      .map((part) => String(part ?? "").trim())
      .filter(Boolean)
      .join(" ");

    return {
      id: String(user?._id ?? ""),
      username: String(user?.username ?? ""),
      name: name || String(user?.username ?? ""),
      avatar: String(user?.profilePicture ?? ""),
      verified: Boolean(user?.verified),
    };
  }

  /* ==========================================================================
     SERIALIZE
  ========================================================================== */

  serialize(
    event: EventLean,
    viewerId?: string,
    organizers?: Map<string, EventOrganizer>,
    now: Date = new Date(),
    extras: { distanceKm?: number; manager?: boolean } = {},
  ): SerializedEvent {
    const creatorId = String(event.creatorId);
    const manager = Boolean(extras.manager || (viewerId && viewerId === creatorId));
    const attendees = idList(event.attendeeIds);
    const interested = idList(event.interestedIds);
    const invited = idList(event.invitedIds);

    const isOwner = Boolean(viewerId && viewerId === creatorId);
    const isGoing = Boolean(viewerId && attendees.includes(viewerId));
    const isInterested = Boolean(viewerId && !isGoing && interested.includes(viewerId));
    const isInvited = Boolean(viewerId && invited.includes(viewerId));

    const status = getEventStatus(event, now);
    const settings = settingsOf(event);
    const registrationRequired = settings.mode === RegistrationMode.REQUIRED;
    const registeredSeats = Number(event.registeredSeats ?? 0);
    const capacity =
      typeof event.capacity === "number" && event.capacity > 0 ? event.capacity : null;
    // With registration, places are counted from registrations (several people
    // per registration); otherwise from the Going list as before.
    const taken = registrationRequired ? registeredSeats : attendees.length;
    const spotsLeft = capacity === null ? null : Math.max(0, capacity - taken);
    const isFull = spotsLeft === 0;
    const active = status === EventStatus.UPCOMING || status === EventStatus.LIVE;
    // The meeting link travels with the event only for the original RSVP flow
    // (public access); otherwise it is handed out by GET /events/:id/join after
    // checking registration and access.
    const legacyLink =
      settings.mode === RegistrationMode.RSVP && settings.access === RegistrationAccess.PUBLIC;
    const prices = settings.ticketTypes.map((ticket) => ticket.price);

    const coverMediaType = event.coverMediaType ?? EventCoverMediaType.IMAGE;

    return {
      id: String(event._id),
      creatorId,
      organizer: organizers?.get(creatorId) ?? null,
      title: event.title,
      description: event.description ?? "",
      category: event.category ?? EventCategory.GENERAL,
      visibility: event.visibility ?? EventVisibility.PUBLIC,
      startDate: new Date(event.startDate).toISOString(),
      endDate: new Date(event.endDate).toISOString(),
      timeZone: event.timeZone ?? "",
      locationName: event.locationName ?? "",
      address: event.address ?? "",
      latitude: typeof event.latitude === "number" ? event.latitude : null,
      longitude: typeof event.longitude === "number" ? event.longitude : null,
      isOnline: Boolean(event.isOnline),
      onlineUrl: manager || (legacyLink && (isGoing || isInterested)) ? event.onlineUrl ?? "" : "",
      coverImageUrl: event.coverImageUrl ?? "",
      coverVideoUrl: event.coverVideoUrl ?? "",
      coverMediaType,
      attendeeCount: attendees.length,
      interestedCount: interested.length,
      capacity,
      spotsLeft,
      isFull,
      isGoing,
      isInterested,
      isInvited,
      viewerRsvp: isGoing
        ? EventRsvpStatus.GOING
        : isInterested
          ? EventRsvpStatus.INTERESTED
          : null,
      isOwner,
      status,
      isCancelled: Boolean(event.isCancelled),
      cancelledAt: isoOrNull(event.cancelledAt),
      cancellationReason: event.cancellationReason ?? "",
      canRsvp: active && !isOwner && settings.mode !== RegistrationMode.REQUIRED && (!isFull || isGoing),
      ...(typeof extras.distanceKm === "number"
        ? { distanceKm: Math.round(extras.distanceKm * 10) / 10 }
        : {}),
      createdAt: isoOrNull(event.createdAt),
      updatedAt: isoOrNull(event.updatedAt),
      registration: {
        mode: settings.mode,
        isFree: settings.isFree,
        minPrice: prices.length ? Math.min(...prices) : 0,
        maxPrice: prices.length ? Math.max(...prices) : 0,
        currency: settings.currency,
        requireApproval: settings.requireApproval,
        waitlistEnabled: settings.waitlistEnabled,
        opensAt: isoOrNull(settings.opensAt),
        closesAt: isoOrNull(settings.closesAt),
        attendanceOptions: settings.attendanceOptions,
        access: settings.access,
        registeredSeats,
        hasOnlineMeeting:
          Boolean(event.onlineUrl) &&
          (Boolean(event.isOnline) || settings.attendanceOptions.includes("online")),
      },
      ...(manager ? { registrationSettings: settings } : {}),
      organizationId: event.organizationId ? String(event.organizationId) : null,
      eventType: event.eventType ?? "",
      orgCategory: event.orgCategory ?? "",
      isDraft: Boolean(event.isDraft),
      isArchived: Boolean(event.isArchived),
      canManage: manager,
      ...(manager && event.onlineUrl ? { meetingProvider: meetingProviderOf(event.onlineUrl) } : {}),
      format: formatOf(event),
      country: event.country ?? "",
      city: event.city ?? "",
      isPostponed: Boolean(event.isPostponed),
      postponedAt: isoOrNull(event.postponedAt),
      postponementReason: event.postponementReason ?? "",
      publishAt: manager ? isoOrNull(event.publishAt) : null,
      isSaved: Boolean(viewerId && idList(event.savedIds).includes(viewerId)),
    };
  }

  private async serializeMany(
    events: EventLean[],
    viewerId?: string,
    now: Date = new Date(),
    distanceFrom?: { latitude: number; longitude: number },
    managedOrgs?: string[],
  ): Promise<SerializedEvent[]> {
    const organizers = await this.loadOrganizers(events);

    return events.map((event) => {
      const distanceKm =
        distanceFrom &&
        typeof event.latitude === "number" &&
        typeof event.longitude === "number"
          ? haversineKm(
              distanceFrom.latitude,
              distanceFrom.longitude,
              event.latitude,
              event.longitude,
            )
          : undefined;

      const manager = Boolean(
        managedOrgs && event.organizationId && managedOrgs.includes(String(event.organizationId)),
      );
      return this.serialize(event, viewerId, organizers, now, { distanceKm, manager });
    });
  }

  /* ==========================================================================
     VALIDATION
  ========================================================================== */

  private validateDateRange(startDate: Date, endDate: Date) {
    if (Number.isNaN(startDate.getTime())) {
      throw new BadRequestException("Invalid start date.");
    }

    if (Number.isNaN(endDate.getTime())) {
      throw new BadRequestException("Invalid end date.");
    }

    if (endDate.getTime() <= startDate.getTime()) {
      throw new BadRequestException("The end date/time must be after the start date/time.");
    }

    if (endDate.getTime() - startDate.getTime() > MAX_EVENT_DURATION_MS) {
      throw new BadRequestException("An event can last at most 90 days.");
    }
  }

  private validateLocation(values: {
    isOnline: boolean;
    onlineUrl: string;
    locationName: string;
    address: string;
    latitude?: number | null;
    longitude?: number | null;
  }) {
    const hasLat = typeof values.latitude === "number";
    const hasLng = typeof values.longitude === "number";

    if (hasLat !== hasLng) {
      throw new BadRequestException("Provide both latitude and longitude, or neither.");
    }

    if (values.isOnline && !values.onlineUrl.trim()) {
      throw new BadRequestException("Add the online meeting link for an online event.");
    }

    if (!values.isOnline && !values.locationName.trim() && !values.address.trim()) {
      throw new BadRequestException("Add a venue name or address for an in-person event.");
    }
  }

  private validateMediaFile(file?: Express.Multer.File) {
    if (!file) {
      return;
    }

    const isImage = file.mimetype.startsWith("image/");
    const isVideo = file.mimetype.startsWith("video/");

    if (!isImage && !isVideo) {
      throw new BadRequestException("Event media must be an image or video.");
    }

    if (isImage && file.size > 10 * 1024 * 1024) {
      throw new BadRequestException("Event images must be 10 MB or smaller.");
    }

    if (isVideo && file.size > 100 * 1024 * 1024) {
      throw new BadRequestException("Event videos must be 100 MB or smaller.");
    }
  }

  private mediaTypeOf(file?: Express.Multer.File): EventCoverMediaType | undefined {
    if (!file) {
      return undefined;
    }

    if (file.mimetype.startsWith("video/")) {
      return EventCoverMediaType.VIDEO;
    }

    if (file.mimetype.startsWith("image/")) {
      return EventCoverMediaType.IMAGE;
    }

    return undefined;
  }

  /**
   * Public URL of a file Multer stored on disk under ./uploads/events.
   * There is deliberately no fallback: a file that was not stored has no
   * URL, and pretending otherwise would save a broken link.
   */
  private mediaUrlOf(file?: Express.Multer.File): string | undefined {
    if (!file) {
      return undefined;
    }

    this.validateMediaFile(file);

    if (!file.filename) {
      throw new InternalServerErrorException("The uploaded file could not be stored.");
    }

    return `/uploads/events/${file.filename}`;
  }

  /** Removes files Multer already wrote when the request is rejected. */
  async discardUploads(...files: Array<Express.Multer.File | undefined>) {
    await Promise.all(
      files
        .filter((file): file is Express.Multer.File => Boolean(file?.path))
        .map((file) =>
          fs.unlink(file.path).catch((error: unknown) => {
            this.logger.warn(`Could not remove rejected upload ${file.path}: ${String(error)}`);
          }),
        ),
    );
  }

  /* ==========================================================================
     CREATE
  ========================================================================== */

  async create(
    userId: string,
    dto: CreateEventDto,
    coverImageFile?: Express.Multer.File,
    coverVideoFile?: Express.Multer.File,
  ): Promise<SerializedEvent> {
    try {
      const creatorId = this.objectId(userId, "user");
      const startDate = new Date(dto.startDate);
      const endDate = new Date(dto.endDate);

      this.validateDateRange(startDate, endDate);

      if (endDate.getTime() <= Date.now()) {
        throw new BadRequestException("The event's end time is already in the past.");
      }

      const isOnline = dto.isOnline ?? false;
      const publishAt = this.publishAtOf(dto.publishAt, endDate);
      const country = this.countryOf(dto.country);

      // Organization events: only the organization's event managers.
      const organizationId = dto.organizationId ? this.objectId(dto.organizationId, "organization") : null;
      if (organizationId && !(await isOrgEventManager(this.connection, organizationId, userId))) {
        throw new ForbiddenException("You need the Manage events permission of this organization.");
      }
      const description = this.cleanDescription(dto.description, organizationId ? 2000 : 5000);

      let registration =
        dto.registration !== undefined
          ? normalizeSettings(dto.registration, { isOnline, endDate })
          : null;
      if (organizationId) {
        registration = registration ?? normalizeSettings({}, { isOnline, endDate });
        // Members-only access always means members of this organization.
        registration.organizationId = String(organizationId);
      }
      // Hybrid (in person + online) events keep the meeting link too.
      const hybrid = Boolean(registration?.attendanceOptions.includes("online"));
      const onlineUrl = isOnline || hybrid ? dto.onlineUrl?.trim() ?? "" : "";
      const locationName = dto.locationName?.trim() ?? "";
      const address = dto.address?.trim() ?? "";

      this.validateLocation({
        isOnline,
        onlineUrl,
        locationName,
        address,
        latitude: dto.latitude,
        longitude: dto.longitude,
      });

      if (coverImageFile && coverVideoFile) {
        throw new BadRequestException("Choose either an image or a video, not both.");
      }

      const uploaded = coverImageFile ?? coverVideoFile;
      const uploadedUrl = this.mediaUrlOf(uploaded);
      const uploadedType = this.mediaTypeOf(uploaded);

      const coverImageUrl =
        uploadedType === EventCoverMediaType.IMAGE
          ? uploadedUrl
          : uploadedType
            ? ""
            : dto.coverImageUrl?.trim() ?? "";

      const coverVideoUrl =
        uploadedType === EventCoverMediaType.VIDEO
          ? uploadedUrl
          : uploadedType
            ? ""
            : dto.coverVideoUrl?.trim() ?? "";

      const coverMediaType =
        uploadedType ??
        (coverVideoUrl ? EventCoverMediaType.VIDEO : EventCoverMediaType.IMAGE);

      const event = await this.eventModel.create({
        registration,
        registeredSeats: 0,
        ticketSeats: {},
        creatorId,
        title: dto.title.trim(),
        description,
        organizationId,
        eventType: dto.eventType ?? "",
        orgCategory: dto.orgCategory?.trim() ?? "",
        isDraft: Boolean(organizationId && dto.isDraft),
        isArchived: false,
        updatedBy: creatorId,
        category: dto.category ?? EventCategory.GENERAL,
        visibility: dto.visibility ?? EventVisibility.PUBLIC,
        startDate,
        endDate,
        timeZone: dto.timeZone ?? "",
        locationName: isOnline ? "" : locationName,
        address: isOnline ? "" : address,
        latitude: isOnline ? undefined : dto.latitude ?? undefined,
        longitude: isOnline ? undefined : dto.longitude ?? undefined,
        isOnline,
        onlineUrl,
        capacity: dto.capacity ?? null,
        coverImageUrl,
        coverVideoUrl,
        coverMediaType,
        attendeeIds: [creatorId],
        interestedIds: [],
        invitedIds: [],
        isCancelled: false,
        publishAt,
        country: isOnline ? "" : country,
        city: isOnline ? "" : (dto.city ?? "").trim().slice(0, 120),
        savedIds: [],
      });

      // Members hear about it once it is visible: now, or when its publication time comes (not sent then).
      if (organizationId && !event.isDraft && !publishAt && dto.notifyMembers) await this.notifyMembers(event);

      const [serialized] = await this.serializeMany(
        [event.toObject() as unknown as EventLean],
        userId,
      );

      return serialized;
    } catch (error) {
      await this.discardUploads(coverImageFile, coverVideoFile);
      throw error;
    }
  }

  /* ==========================================================================
     LISTS (legacy endpoints, now expiry-aware)
  ========================================================================== */

  /**
   * GET /events
   * Active events the viewer may see, soonest first. Ended events are
   * excluded unless includeEnded is set (history views).
   */
  async findAll(viewerId: string, includeEnded = false): Promise<SerializedEvent[]> {
    const now = new Date();
    const { filter } = await this.visibleFilter(viewerId);

    const events = await this.eventModel
      .find(
        and(
          filter,
          includeEnded ? { isCancelled: { $ne: true } } : activeEventFilter(now),
        ),
      )
      .sort({ startDate: 1, _id: 1 })
      .limit(MAX_LIST)
      .lean<EventLean[]>()
      .exec();

    return this.serializeMany(events, viewerId, now);
  }

  /** GET /events/upcoming — active (upcoming or live) events. */
  async findUpcoming(viewerId: string): Promise<SerializedEvent[]> {
    return this.findAll(viewerId, false);
  }

  /** GET /events/nearby */
  async findNearby(
    latitude: number,
    longitude: number,
    radiusKm = 50,
    viewerId?: string,
  ): Promise<SerializedEvent[]> {
    const now = new Date();
    const radius = Math.min(500, Math.max(1, radiusKm));
    const relationships = await this.loadRelationships(viewerId);

    const events = await this.eventModel
      .find(
        and(
          buildEventVisibilityFilter(viewerId, relationships),
          activeEventFilter(now),
          { isOnline: { $ne: true } },
          boundingBox(latitude, longitude, radius),
        ),
      )
      .sort({ startDate: 1 })
      .limit(MAX_LIST)
      .lean<EventLean[]>()
      .exec();

    const within = events
      .map((event) => ({
        event,
        distance: haversineKm(latitude, longitude, event.latitude as number, event.longitude as number),
      }))
      .filter((item) => item.distance <= radius)
      .sort((a, b) => a.distance - b.distance);

    return this.serializeMany(
      within.map((item) => item.event),
      viewerId,
      now,
      { latitude, longitude },
    );
  }

  /* ==========================================================================
     DISCOVER
  ========================================================================== */

  private dayWindow(dayStart?: string) {
    const parsed = dayStart ? new Date(dayStart) : null;

    if (parsed && !Number.isNaN(parsed.getTime())) {
      return parsed;
    }

    const now = new Date();

    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }

  private whenFilter(
    when: string | undefined,
    now: Date,
    dayStart: Date,
    timeZone?: string,
  ): Filter {
    const start = dayStart.getTime();

    switch (when) {
      case "live":
        return { startDate: { $lte: now } };
      case "today":
        return { startDate: { $lt: new Date(start + DAY_MS) } };
      case "tomorrow":
        return {
          startDate: { $lt: new Date(start + 2 * DAY_MS) },
          endDate: { $gt: new Date(start + DAY_MS) },
        };
      case "this-week":
        return { startDate: { $lt: new Date(start + 7 * DAY_MS) } };
      case "this-weekend": {
        // Saturday 00:00 to Monday 00:00 in the viewer's calendar.
        const weekday = weekdayIn(new Date(start + 12 * 3_600_000), timeZone);
        const weekendStart =
          weekday === 0 ? start - DAY_MS : start + ((6 - weekday + 7) % 7) * DAY_MS;

        return {
          startDate: { $lt: new Date(weekendStart + 2 * DAY_MS) },
          endDate: { $gt: new Date(Math.max(weekendStart, now.getTime())) },
        };
      }
      case "next-30-days":
        return { startDate: { $lt: new Date(now.getTime() + 30 * DAY_MS) } };
      case "this-month": {
        // Until the first day of next month in the viewer's calendar
        // (dayStart is the viewer's local midnight, as a UTC instant).
        const local = new Date(start + 12 * 3_600_000);
        const day = Number(
          new Intl.DateTimeFormat("en-US", { day: "numeric", timeZone: timeZone || "UTC" }).format(local),
        );
        const daysInMonth = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 0)).getUTCDate();
        return { startDate: { $lt: new Date(start + (daysInMonth - day + 1) * DAY_MS) } };
      }
      default:
        return {};
    }
  }

  /**
   * GET /events/discover
   * Search + filters + sorting, paginated, executed entirely in MongoDB.
   */
  async discover(
    viewerId: string,
    query: DiscoverEventsQueryDto,
  ) {
    const now = new Date();
    const page = query.page ?? 1;
    const limit = query.limit ?? 18;
    const { filter: visibility } = await this.visibleFilter(viewerId);
    const dayStart = this.dayWindow(query.dayStart);

    const filters: Filter[] = [visibility, activeEventFilter(now)];

    const q = query.q?.trim();

    if (q) {
      const pattern = new RegExp(escapeRegex(q), "i");
      const matchesCategory = (Object.values(EventCategory) as string[]).filter((category) =>
        pattern.test(category),
      );

      filters.push({
        $or: [
          { title: pattern },
          { description: pattern },
          { locationName: pattern },
          { address: pattern },
          ...(matchesCategory.length ? [{ category: { $in: matchesCategory } }] : []),
        ],
      });
    }

    if (query.category) {
      filters.push({ category: query.category });
    }

    filters.push(this.whenFilter(query.when, now, dayStart, query.tz));

    if (query.from) {
      filters.push({ startDate: { $gte: new Date(query.from) } });
    }

    if (query.to) {
      filters.push({ startDate: { $lte: new Date(query.to) } });
    }

    filters.push(formatFilter(query.format));
    filters.push(priceFilter(query.price));

    if (query.country) {
      filters.push({ country: query.country.toUpperCase() });
    }

    if (query.city?.trim()) {
      const cityPattern = new RegExp(`^\\s*${escapeRegex(query.city.trim())}\\s*$`, "i");
      // Events created before the city field: match the city inside the address.
      filters.push({ $or: [{ city: cityPattern }, { address: new RegExp(escapeRegex(query.city.trim()), "i") }] });
    }

    if (query.interests && viewerId) {
      const affinity = await this.categoryAffinity(viewerId);
      const top = Array.from(affinity.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([category]) => category);
      // No history yet: nothing to narrow by, show everything.
      if (top.length) filters.push({ category: { $in: top } });
    }

    if (query.availability === "open") {
      filters.push({
        $or: [
          { capacity: null },
          { $expr: { $lt: [{ $size: { $ifNull: ["$attendeeIds", []] } }, "$capacity"] } },
        ],
      });
    }

    const hasPoint = typeof query.lat === "number" && typeof query.lng === "number";
    const radiusKm = query.radiusKm;

    if (hasPoint && radiusKm) {
      filters.push({ isOnline: { $ne: true } });
      filters.push(boundingBox(query.lat as number, query.lng as number, radiusKm));
    }

    let sort = query.sort ?? (q ? "relevance" : "date");

    if (sort === "distance" && !hasPoint) {
      sort = "date";
    }

    if (sort === "distance") {
      filters.push({ latitude: { $type: "number" }, longitude: { $type: "number" } });
    }

    const computed: Record<string, unknown> = {
      _pop: {
        $add: [
          { $size: { $ifNull: ["$attendeeIds", []] } },
          { $multiply: [0.5, { $size: { $ifNull: ["$interestedIds", []] } }] },
        ],
      },
    };

    if (sort === "price") {
      // Lowest ticket price; RSVP events (no settings) count as free.
      computed._price = {
        $cond: [
          { $eq: ["$registration.isFree", false] },
          { $min: { $ifNull: ["$registration.ticketTypes.price", [0]] } },
          0,
        ],
      };
    }

    if (q) {
      computed._titleHit = {
        $cond: [{ $regexMatch: { input: "$title", regex: escapeRegex(q), options: "i" } }, 1, 0],
      };
    }

    if (hasPoint) {
      const cos = Math.cos(((query.lat as number) * Math.PI) / 180);

      computed._dist2 = {
        $cond: [
          { $and: [{ $isNumber: "$latitude" }, { $isNumber: "$longitude" }] },
          {
            $add: [
              { $pow: [{ $subtract: ["$latitude", query.lat] }, 2] },
              { $pow: [{ $multiply: [{ $subtract: ["$longitude", query.lng] }, cos] }, 2] },
            ],
          },
          1e9,
        ],
      };
    }

    const sortStage: Record<string, 1 | -1> =
      sort === "price"
        ? { _price: 1, startDate: 1, _id: 1 }
        : sort === "popularity"
        ? { _pop: -1, startDate: 1, _id: 1 }
        : sort === "distance"
          ? { _dist2: 1, startDate: 1, _id: 1 }
          : sort === "relevance"
            ? { ...(q ? { _titleHit: -1 as const } : {}), startDate: 1, _pop: -1, _id: 1 }
            : { startDate: 1, _id: 1 };

    const pipeline: PipelineStage[] = [
      { $match: and(...filters) },
      { $addFields: computed },
      { $sort: sortStage },
      {
        $facet: {
          items: [{ $skip: (page - 1) * limit }, { $limit: limit }],
          total: [{ $count: "count" }],
        },
      },
    ];

    const [result] = await this.eventModel.aggregate(pipeline).exec();
    const items = (result?.items ?? []) as EventLean[];
    const total = Number(result?.total?.[0]?.count ?? 0);

    return {
      items: await this.serializeMany(
        items,
        viewerId,
        now,
        hasPoint ? { latitude: query.lat as number, longitude: query.lng as number } : undefined,
      ),
      page,
      limit,
      total,
      hasMore: page * limit < total,
      serverTime: now.toISOString(),
    };
  }

  /* ==========================================================================
     SECTIONS (Discover page)
  ========================================================================== */

  async sections(viewerId: string, query: EventSectionsQueryDto) {
    const now = new Date();
    const limit = query.limit ?? 12;
    const { filter: visibility } = await this.visibleFilter(viewerId);
    const base = and(visibility, activeEventFilter(now));
    const dayStart = this.dayWindow(query.dayStart);
    const hasPoint = typeof query.lat === "number" && typeof query.lng === "number";
    const radius = query.radiusKm ?? 50;

    const find = (filter: Filter, sort: Record<string, 1 | -1>, max = limit) =>
      this.eventModel
        .find(and(base, filter))
        .sort(sort)
        .limit(max)
        .lean<EventLean[]>()
        .exec();

    const popular = (filter: Filter, max = limit) =>
      this.eventModel
        .aggregate([
          { $match: and(base, filter) },
          {
            $addFields: {
              _pop: {
                $add: [
                  { $size: { $ifNull: ["$attendeeIds", []] } },
                  { $multiply: [0.5, { $size: { $ifNull: ["$interestedIds", []] } }] },
                ],
              },
            },
          },
          { $sort: { _pop: -1, startDate: 1, _id: 1 } },
          { $limit: max },
        ])
        .exec() as Promise<EventLean[]>;

    const affinity = await this.categoryAffinity(viewerId);
    const topCategories = Array.from(affinity.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([category]) => category);

    const viewer = Types.ObjectId.isValid(viewerId) ? new Types.ObjectId(viewerId) : null;
    const notMine = viewer
      ? { creatorId: { $ne: viewer }, attendeeIds: { $ne: viewer }, interestedIds: { $ne: viewer } }
      : {};

    const [happeningNow, today, featured, recommendedRaw, nearbyRaw, online, upcoming] =
      await Promise.all([
        find({ startDate: { $lte: now } }, { endDate: 1 }),
        find(
          { startDate: { $gt: now, $lt: new Date(dayStart.getTime() + DAY_MS) } },
          { startDate: 1 },
        ),
        popular({ startDate: { $lt: new Date(now.getTime() + 30 * DAY_MS) } }, 8),
        topCategories.length
          ? popular({ ...notMine, category: { $in: topCategories } }, limit * 2)
          : popular(notMine, limit * 2),
        hasPoint
          ? find(
              { isOnline: { $ne: true }, ...boundingBox(query.lat as number, query.lng as number, radius) },
              { startDate: 1 },
              MAX_LIST,
            )
          : Promise.resolve([] as EventLean[]),
        find({ isOnline: true }, { startDate: 1 }),
        find({ startDate: { $gt: now } }, { startDate: 1 }),
      ]);

    const nearby = hasPoint
      ? nearbyRaw
          .map((event) => ({
            event,
            distance: haversineKm(
              query.lat as number,
              query.lng as number,
              event.latitude as number,
              event.longitude as number,
            ),
          }))
          .filter((item) => item.distance <= radius)
          .sort((a, b) => a.distance - b.distance)
          .slice(0, limit)
          .map((item) => item.event)
      : [];

    const relationships = await this.loadRelationships(viewerId);
    const recommended = rankEvents(
      recommendedRaw.map((event) => this.toRecommendable(event)),
      {
        viewerId,
        categoryAffinity: affinity,
        friendIds: new Set(relationships.friendIds),
        followedIds: new Set(relationships.followedIds),
        latitude: query.lat,
        longitude: query.lng,
        radiusKm: radius,
      },
      now,
    )
      .slice(0, limit)
      .map((item) => recommendedRaw.find((event) => String(event._id) === item.event.id))
      .filter((event): event is EventLean => Boolean(event));

    const all = [...happeningNow, ...today, ...featured, ...recommended, ...nearby, ...online, ...upcoming];
    const organizers = await this.loadOrganizers(all);
    const point = hasPoint ? { latitude: query.lat as number, longitude: query.lng as number } : undefined;

    const out = (events: EventLean[]) =>
      events.map((event) =>
        this.serialize(event, viewerId, organizers, now, {
          distanceKm:
            point && typeof event.latitude === "number" && typeof event.longitude === "number"
              ? haversineKm(point.latitude, point.longitude, event.latitude, event.longitude)
              : undefined,
        }),
      );

    return {
      happeningNow: out(happeningNow),
      today: out(today),
      featured: out(featured),
      recommended: out(recommended),
      nearby: out(nearby),
      online: out(online),
      upcoming: out(upcoming),
      serverTime: now.toISOString(),
    };
  }

  /* ==========================================================================
     DETAILS
  ========================================================================== */

  /**
   * GET /events/:id
   * Readable after it ended or was cancelled (history), as long as the
   * viewer may see it.
   */
  async findOne(id: string, viewerId: string): Promise<SerializedEvent> {
    const { event, relationships } = await this.loadVisible(id, viewerId);
    const [serialized] = await this.serializeMany([event], viewerId, undefined, undefined, relationships.managedOrganizationIds);

    return serialized;
  }

  /** GET /events/:id/related — active events in the same category or by the same organizer. */
  async related(id: string, viewerId: string, limit = 6): Promise<SerializedEvent[]> {
    const { event, relationships } = await this.loadVisible(id, viewerId);
    const now = new Date();

    const events = await this.eventModel
      .find(
        and(
          buildEventVisibilityFilter(viewerId, relationships),
          activeEventFilter(now),
          { _id: { $ne: event._id } },
          { $or: [{ category: event.category }, { creatorId: event.creatorId }] },
        ),
      )
      .sort({ startDate: 1 })
      .limit(Math.min(12, Math.max(1, limit)))
      .lean<EventLean[]>()
      .exec();

    return this.serializeMany(events, viewerId, now);
  }

  /* ==========================================================================
     UPDATE
  ========================================================================== */

  async update(
    userId: string,
    eventId: string,
    dto: UpdateEventDto,
    coverImageFile?: Express.Multer.File,
    coverVideoFile?: Express.Multer.File,
  ): Promise<SerializedEvent> {
    try {
      const event = await this.eventModel.findById(this.objectId(eventId)).exec();

      if (!event) {
        throw new NotFoundException("Event not found.");
      }

      if (!(await this.canManageEvent(event, userId))) {
        throw new ForbiddenException("Only the event creator or the organization's event managers can update this event.");
      }

      if (event.isCancelled) {
        throw new BadRequestException("A cancelled event can no longer be edited.");
      }

      const startDate = dto.startDate ? new Date(dto.startDate) : event.startDate;
      const endDate = dto.endDate ? new Date(dto.endDate) : event.endDate;

      this.validateDateRange(startDate, endDate);

      const datesChanged =
        startDate.getTime() !== event.startDate.getTime() ||
        endDate.getTime() !== event.endDate.getTime();

      if (datesChanged && endDate.getTime() <= Date.now()) {
        throw new BadRequestException("The new end time is already in the past.");
      }

      const isOnline = dto.isOnline ?? event.isOnline;
      const nextSettings =
        dto.registration !== undefined
          ? normalizeSettings(dto.registration, { isOnline, endDate })
          : settingsOf({ registration: event.registration, isOnline });
      // Hybrid (in person + online) events keep the meeting link too.
      const hybrid = nextSettings.attendanceOptions.includes("online");
      const onlineUrl = isOnline || hybrid ? (dto.onlineUrl ?? event.onlineUrl ?? "").trim() : "";
      const locationName = isOnline ? "" : (dto.locationName ?? event.locationName ?? "").trim();
      const address = isOnline ? "" : (dto.address ?? event.address ?? "").trim();

      const latitude =
        isOnline ? null : dto.latitude !== undefined ? dto.latitude : event.latitude ?? null;
      const longitude =
        isOnline ? null : dto.longitude !== undefined ? dto.longitude : event.longitude ?? null;

      this.validateLocation({ isOnline, onlineUrl, locationName, address, latitude, longitude });

      if (coverImageFile && coverVideoFile) {
        throw new BadRequestException("Choose either an image or a video, not both.");
      }

      const uploaded = coverImageFile ?? coverVideoFile;

      if (uploaded) {
        const url = this.mediaUrlOf(uploaded) ?? "";
        const type = this.mediaTypeOf(uploaded);

        event.coverImageUrl = type === EventCoverMediaType.IMAGE ? url : "";
        event.coverVideoUrl = type === EventCoverMediaType.VIDEO ? url : "";
        event.coverMediaType = type ?? EventCoverMediaType.IMAGE;
      } else if (dto.coverVideoUrl !== undefined && dto.coverVideoUrl.trim()) {
        event.coverVideoUrl = dto.coverVideoUrl.trim();
        event.coverImageUrl = "";
        event.coverMediaType = EventCoverMediaType.VIDEO;
      } else if (dto.coverImageUrl !== undefined) {
        // An explicit empty string removes the cover.
        event.coverImageUrl = dto.coverImageUrl.trim();
        event.coverVideoUrl = "";
        event.coverMediaType = EventCoverMediaType.IMAGE;
      }

      if (dto.title !== undefined) event.title = dto.title.trim();
      if (dto.description !== undefined) event.description = this.cleanDescription(dto.description, event.organizationId ? 2000 : 5000);
      if (dto.eventType !== undefined) event.eventType = dto.eventType;
      if (dto.orgCategory !== undefined) event.orgCategory = dto.orgCategory.trim();
      if (dto.isDraft !== undefined && event.organizationId) event.isDraft = dto.isDraft;
      event.updatedBy = this.objectId(userId, "user");
      if (dto.category !== undefined) event.category = dto.category;
      if (dto.visibility !== undefined) event.visibility = dto.visibility;
      if (dto.timeZone !== undefined) event.timeZone = dto.timeZone;
      if (dto.capacity !== undefined) event.capacity = dto.capacity;
      if (dto.publishAt !== undefined) {
        // Once an event is public it can't be "unpublished" by a future time (people may be registered).
        const alreadyPublic = !isScheduled(event) && !event.isDraft;
        const next = this.publishAtOf(dto.publishAt, endDate);
        if (next && alreadyPublic && Number(event.registeredSeats ?? 0) + idList(event.attendeeIds).length > 1) {
          throw new BadRequestException("This event is already published and people have joined it, so it can't be scheduled for later.");
        }
        event.publishAt = next;
      }
      if (dto.country !== undefined) event.country = isOnline ? "" : this.countryOf(dto.country);
      if (dto.city !== undefined) event.city = isOnline ? "" : dto.city.trim().slice(0, 120);
      if (isOnline) {
        event.country = "";
        event.city = "";
      }

      // New dates end a postponement (the event is back on the calendar).
      if (datesChanged && event.isPostponed) {
        event.isPostponed = false;
        event.postponedAt = null;
        event.postponementReason = "";
      }

      // Never shrink below what registrations already hold.
      const heldSeats = Number(event.registeredSeats ?? 0);
      if (typeof event.capacity === "number" && event.capacity > 0 && event.capacity < heldSeats) {
        throw new BadRequestException(
          `${heldSeats} places are already taken by registrations, so capacity can't be lower than that.`,
        );
      }

      if (dto.registration !== undefined) {
        const settings = nextSettings;
        if (event.organizationId) settings.organizationId = String(event.organizationId);
        const sold = (event.ticketSeats ?? {}) as Record<string, number>;
        const previous = settingsOf(event.toObject() as unknown as EventLean);

        for (const ticket of previous.ticketTypes) {
          const taken = Number(sold[ticket.id] ?? 0);
          const next = settings.ticketTypes.find((item) => item.id === ticket.id);

          if (taken > 0 && !next) {
            throw new BadRequestException(`"${ticket.name}" already has registrations and can't be removed.`);
          }

          if (taken > 0 && next && next.quantity !== null && next.quantity < taken) {
            throw new BadRequestException(`"${next.name}" already has ${taken} registrations; its quantity can't be lower.`);
          }

          if (taken > 0 && next && next.price !== ticket.price) {
            throw new BadRequestException(`"${ticket.name}" already has registrations; create a new ticket type for a different price.`);
          }
        }

        event.set("registration", settings);
        event.markModified("registration");
      }

      const locationChanged =
        isOnline !== event.isOnline ||
        locationName !== (event.locationName ?? "") ||
        address !== (event.address ?? "") ||
        onlineUrl !== (event.onlineUrl ?? "");

      event.startDate = startDate;
      event.endDate = endDate;
      event.isOnline = isOnline;
      event.onlineUrl = onlineUrl;
      event.locationName = locationName;
      event.address = address;
      event.set("latitude", latitude ?? undefined);
      event.set("longitude", longitude ?? undefined);

      await event.save();

      // "Send notifications": once, when the event is (or becomes) published.
      if (event.organizationId && !event.isDraft && dto.notifyMembers) {
        await this.notifyMembers(event);
      }

      // Registrants hear about new times and places (and their reminders move).
      this.emitter?.emit("events.updated", {
        eventId: String(event._id),
        timeChanged: datesChanged,
        locationChanged,
      });

      const [serialized] = await this.serializeMany(
        [event.toObject() as unknown as EventLean],
        userId,
        undefined,
        undefined,
        event.organizationId ? [String(event.organizationId)] : undefined,
      );

      return serialized;
    } catch (error) {
      await this.discardUploads(coverImageFile, coverVideoFile);
      throw error;
    }
  }

  /* ==========================================================================
     ORGANIZATION EVENTS
  ========================================================================== */

  /** Creator, or an event manager of the event's organization. */
  async canManageEvent(event: { creatorId: unknown; organizationId?: unknown }, userId: string): Promise<boolean> {
    if (userId && String(event.creatorId) === userId) return true;
    return Boolean(event.organizationId) && isOrgEventManager(this.connection, event.organizationId, userId);
  }

  private async requireOrgManager(organizationId: string, userId: string): Promise<Types.ObjectId> {
    const org = this.objectId(organizationId, "organization");
    if (!(await isOrgEventManager(this.connection, org, userId))) {
      throw new ForbiddenException("You need the Manage events permission of this organization.");
    }
    return org;
  }

  /**
   * Plain text stays as it is; editor HTML is reduced to the allow-list.
   * Organization events allow 2,000 visible characters, other events 5,000.
   */
  private cleanDescription(value: string | undefined, limit: number): string {
    const clean = sanitizeEventHtml(String(value ?? "").trim());
    if (textLength(clean) > limit) throw new BadRequestException(`The description can be at most ${limit.toLocaleString("en-US")} characters.`);
    return clean;
  }

  /** In-app notification to the organization's active members (once per event). */
  private async notifyMembers(event: EventDocument): Promise<void> {
    if (!this.notifications || event.membersNotified || !event.organizationId) return;
    try {
      const members = await this.connection
        .collection("church_members")
        .find({ organizationId: event.organizationId, status: "active", userId: { $ne: null } }, { projection: { userId: 1 } })
        .limit(5000)
        .toArray();
      const org = await this.connection
        .collection("church_organizations")
        .findOne({ _id: event.organizationId }, { projection: { name: 1 } });
      const when = new Date(event.startDate).toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: event.timeZone || "UTC",
      });
      const creator = String(event.creatorId);
      for (const m of members) {
        const recipientId = String(m.userId);
        if (!recipientId || recipientId === creator) continue;
        await this.notifications.create({
          recipientId,
          type: "SYSTEM",
          title: `New event: ${event.title}`,
          message: `${org?.name ?? "Your organization"} · ${when}`,
          entityId: String(event._id),
          entityType: "event",
          link: `/events/${String(event._id)}`,
        });
      }
      event.membersNotified = true;
      await event.save();
    } catch (error) {
      this.logger.warn(`Could not notify members about event ${String(event._id)}: ${String(error)}`);
    }
  }

  /**
   * GET /events/organization/:organizationId (public)
   * Upcoming and ongoing events of the organization that this viewer may
   * see: public events for everyone, members-only events for its members.
   * Never drafts or archived events. Meeting links are not included.
   */
  async organizationEvents(organizationId: string, viewerId?: string, includePast = false): Promise<SerializedEvent[]> {
    const org = this.objectId(organizationId, "organization");
    const now = new Date();
    const relationships = viewerId ? await this.loadRelationships(viewerId) : { ...EMPTY_RELATIONSHIPS };
    const events = await this.eventModel
      .find(
        and(
          buildEventVisibilityFilter(viewerId, relationships),
          { organizationId: org },
          includePast ? { isCancelled: { $ne: true } } : activeEventFilter(now),
        ),
      )
      .sort(includePast ? { startDate: -1 } : { startDate: 1 })
      .limit(50)
      .lean<EventLean[]>()
      .exec();
    return this.serializeMany(events, viewerId, now);
  }

  /**
   * GET /events/organization/:organizationId/manage (event managers)
   * Every event of the organization with tab counts and registration counts.
   */
  async manageOrganizationEvents(
    organizationId: string,
    userId: string,
    q: { tab?: string; search?: string; type?: string; page?: number; limit?: number },
  ) {
    const org = await this.requireOrgManager(organizationId, userId);
    const now = new Date();
    const base = { organizationId: org };
    const live = { isCancelled: { $ne: true }, startDate: { $lte: now }, endDate: { $gt: now } };
    const tabs: Record<string, Record<string, unknown>> = {
      all: { isArchived: { $ne: true } },
      upcoming: { isArchived: { $ne: true }, isDraft: { $ne: true }, isCancelled: { $ne: true }, startDate: { $gt: now } },
      ongoing: { isArchived: { $ne: true }, isDraft: { $ne: true }, ...live },
      past: { isArchived: { $ne: true }, isDraft: { $ne: true }, $or: [{ endDate: { $lte: now } }, { isCancelled: true }] },
      drafts: { isArchived: { $ne: true }, isDraft: true },
      archived: { isArchived: true },
    };
    const tab = tabs[String(q.tab)] ? String(q.tab) : "all";
    const filter: Record<string, unknown> = { ...base, ...tabs[tab] };
    if (q.type) filter.eventType = String(q.type).slice(0, 60);
    const search = String(q.search ?? "").trim().slice(0, 100);
    if (search) {
      const rx = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
      filter.$and = [{ $or: [{ title: rx }, { locationName: rx }, { address: rx }] }];
    }
    const limit = Math.min(100, Math.max(1, Number(q.limit) || 25));
    const page = Math.max(1, Number(q.page) || 1);

    const [events, total, counts] = await Promise.all([
      this.eventModel
        .find(filter)
        .sort(tab === "upcoming" || tab === "ongoing" ? { startDate: 1 } : { startDate: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean<EventLean[]>()
        .exec(),
      this.eventModel.countDocuments(filter).exec(),
      Promise.all(Object.entries(tabs).map(async ([k, f]) => [k, await this.eventModel.countDocuments({ ...base, ...f }).exec()] as const)),
    ]);

    // Registration counts per event (and pending approvals for the whole organization).
    const ids = events.map((e) => e._id);
    const regs = this.connection.collection("event_registrations");
    const [byEvent, pending] = await Promise.all([
      ids.length
        ? regs
            .aggregate<{ _id: { e: Types.ObjectId; s: string }; n: number; seats: number; checked: number }>([
              { $match: { eventId: { $in: ids } } },
              {
                $group: {
                  _id: { e: "$eventId", s: "$status" },
                  n: { $sum: 1 },
                  seats: { $sum: { $ifNull: ["$quantity", 1] } },
                  checked: { $sum: { $cond: [{ $in: ["$attendanceStatus", ["checked_in", "partially_checked_in"]] }, 1, 0] } },
                },
              },
            ])
            .toArray()
        : Promise.resolve([]),
      (async () => {
        const orgEventIds = await this.eventModel.find(base).distinct("_id").exec();
        return orgEventIds.length ? regs.countDocuments({ eventId: { $in: orgEventIds }, status: "pending_approval" }) : 0;
      })(),
    ]);
    const stats = new Map<string, Record<string, number>>();
    for (const row of byEvent) {
      const key = String(row._id.e);
      const m = stats.get(key) ?? {};
      m[row._id.s] = row.n;
      // Registrations with at least one checked-in attendee (QR or manual check-in).
      m.checked_in = (m.checked_in ?? 0) + (row.checked ?? 0);
      stats.set(key, m);
    }

    const serialized = await this.serializeMany(events, userId, now, undefined, [String(org)]);
    return {
      items: serialized.map((e) => ({ ...e, registrationCounts: stats.get(e.id) ?? {} })),
      total,
      page,
      limit,
      tab,
      counts: Object.fromEntries(counts),
      pendingRegistrations: pending,
    };
  }

  async archive(userId: string, eventId: string, archived: boolean): Promise<SerializedEvent> {
    const event = await this.eventModel.findById(this.objectId(eventId)).exec();
    if (!event) throw new NotFoundException("Event not found.");
    if (!event.organizationId) throw new BadRequestException("Only organization events can be archived.");
    if (!(await this.canManageEvent(event, userId))) throw new ForbiddenException("You can't manage this event.");
    event.isArchived = archived;
    event.archivedAt = archived ? new Date() : null;
    event.updatedBy = this.objectId(userId, "user");
    await event.save();
    const [serialized] = await this.serializeMany([event.toObject() as unknown as EventLean], userId, undefined, undefined, [String(event.organizationId)]);
    return serialized;
  }

  /* ==========================================================================
     CANCEL (soft, keeps the document and RSVP history)
  ========================================================================== */

  async cancel(userId: string, eventId: string, reason?: string) {
    const event = await this.eventModel.findById(this.objectId(eventId)).exec();

    if (!event) {
      throw new NotFoundException("Event not found.");
    }

    if (!(await this.canManageEvent(event, userId))) {
      throw new ForbiddenException("Only the event creator or the organization's event managers can cancel this event.");
    }

    if (event.isCancelled) {
      const [serialized] = await this.serializeMany([event.toObject() as unknown as EventLean], userId);

      return { success: true, cancelled: true, message: "Event is already cancelled.", event: serialized };
    }

    if (getEventStatus(event) === EventStatus.ENDED) {
      throw new BadRequestException("This event has already ended.");
    }

    event.isCancelled = true;
    event.cancelledAt = new Date();
    event.cancellationReason = reason?.trim() ?? "";

    await event.save();

    this.emitter?.emit("events.cancelled", {
      eventId: String(event._id),
      reason: event.cancellationReason,
    });

    const [serialized] = await this.serializeMany([event.toObject() as unknown as EventLean], userId);

    return { success: true, cancelled: true, message: "Event cancelled successfully.", event: serialized };
  }

  /* ==========================================================================
     POSTPONE (date to be announced). Rescheduling via update() lifts it.
  ========================================================================== */

  async postpone(userId: string, eventId: string, reason?: string) {
    const event = await this.eventModel.findById(this.objectId(eventId)).exec();
    if (!event) throw new NotFoundException("Event not found.");
    if (!(await this.canManageEvent(event, userId))) {
      throw new ForbiddenException("Only the event creator or the organization's event managers can postpone this event.");
    }
    const status = getEventStatus(event);
    if (status === EventStatus.CANCELLED) throw new BadRequestException("A cancelled event can't be postponed.");
    if (status === EventStatus.ENDED) throw new BadRequestException("This event has already ended.");

    if (!event.isPostponed) {
      event.isPostponed = true;
      event.postponedAt = new Date();
      event.postponementReason = (reason ?? "").trim().slice(0, 1000);
      event.updatedBy = this.objectId(userId, "user");
      await event.save();
      // Registrants are told the date changed (same channel as a reschedule).
      this.emitter?.emit("events.updated", { eventId: String(event._id), timeChanged: true, locationChanged: false, postponed: true });
    }

    const [serialized] = await this.serializeMany([event.toObject() as unknown as EventLean], userId, undefined, undefined,
      event.organizationId ? [String(event.organizationId)] : undefined);
    return { success: true, event: serialized };
  }

  /* ==========================================================================
     SAVED (bookmarks)
  ========================================================================== */

  async setSaved(userId: string, eventId: string, saved: boolean) {
    const { event } = await this.loadVisible(eventId, userId);
    const user = this.objectId(userId, "user");
    await this.eventModel
      .updateOne({ _id: event._id }, saved ? { $addToSet: { savedIds: user } } : { $pull: { savedIds: user } })
      .exec();
    return { success: true, eventId: String(event._id), saved };
  }

  /** Saved events the viewer can still see: upcoming first, then past (most recent first). */
  async savedEvents(userId: string): Promise<SerializedEvent[]> {
    const user = this.objectId(userId, "user");
    const { filter } = await this.visibleFilter(userId);
    const now = new Date();
    const events = await this.eventModel
      .find(and(filter, { savedIds: user }))
      .sort({ startDate: 1 })
      .limit(MAX_HISTORY)
      .lean<EventLean[]>()
      .exec();
    const active = events.filter((event) => isEventActive(event, now));
    const rest = events.filter((event) => !isEventActive(event, now)).reverse();
    return this.serializeMany([...active, ...rest], userId, now);
  }

  /* ==========================================================================
     MY EVENTS SUMMARY (real counts for the sidebar card)
  ========================================================================== */

  async mySummary(userId: string): Promise<MyEventsSummary> {
    const user = this.objectId(userId, "user");
    const now = new Date();
    const { filter } = await this.visibleFilter(userId);
    const registrations = this.connection.collection("event_registrations");
    const activeRegistration = { $in: ["pending_payment", "pending_approval", "confirmed", "waitlisted"] };

    const [upcoming, saved, hosted, past, registered, tickets] = await Promise.all([
      // Going / Interested / created, still to come (or happening now).
      this.eventModel.countDocuments(
        and(activeEventFilter(now), { $or: [{ attendeeIds: user }, { interestedIds: user }, { creatorId: user }] }),
      ).exec(),
      this.eventModel.countDocuments(and(filter, activeEventFilter(now), { savedIds: user })).exec(),
      this.eventModel.countDocuments({ creatorId: user, isArchived: { $ne: true } }).exec(),
      // Ended events the user went to or hosted.
      this.eventModel.countDocuments({
        isCancelled: { $ne: true },
        endDate: { $lte: now },
        $or: [{ attendeeIds: user }, { creatorId: user }],
      }).exec(),
      registrations.countDocuments({ userId: user, status: activeRegistration, eventEndDate: { $gt: now } }),
      // Paid admissions held by the user.
      registrations.countDocuments({ userId: user, status: "confirmed", paymentStatus: "paid" }),
    ]);

    return { upcoming, registered, tickets, saved, hosted, past };
  }

  /* ==========================================================================
     PAST EVENTS
  ========================================================================== */

  /**
   * scope "public": ended events anyone may see (newest first).
   * scope "mine": ended events the viewer went to, registered for or hosted.
   * Cancelled events are left out; nothing is ever deleted.
   */
  async pastEvents(viewerId: string, scope: "public" | "mine", page = 1, limit = 18) {
    const now = new Date();
    const { filter } = await this.visibleFilter(viewerId);
    const conditions: Filter[] = [filter, { isCancelled: { $ne: true }, endDate: { $lte: now } }];

    if (scope === "mine") {
      const user = this.objectId(viewerId, "user");
      const registered = await this.connection
        .collection("event_registrations")
        .distinct("eventId", { userId: user, status: "confirmed" });
      conditions.push({ $or: [{ attendeeIds: user }, { creatorId: user }, { _id: { $in: registered } }] });
    }

    const query = and(...conditions);
    const [items, total] = await Promise.all([
      this.eventModel.find(query).sort({ endDate: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean<EventLean[]>().exec(),
      this.eventModel.countDocuments(query).exec(),
    ]);
    return {
      items: await this.serializeMany(items, viewerId, now),
      page,
      limit,
      total,
      hasMore: page * limit < total,
      serverTime: now.toISOString(),
    };
  }

  /* ==========================================================================
     INPUT HELPERS
  ========================================================================== */

  /** Validates a scheduled publication time. Null / empty = publish now. */
  private publishAtOf(value: string | null | undefined, endDate: Date): Date | null {
    if (value === undefined || value === null || value === "") return null;
    const at = new Date(value);
    if (Number.isNaN(at.getTime())) throw new BadRequestException("Enter a valid publication date and time.");
    if (at.getTime() <= Date.now()) return null; // already due: publish now
    if (at.getTime() >= endDate.getTime()) throw new BadRequestException("The event must be published before it ends.");
    return at;
  }

  private countryOf(value: string | undefined): string {
    const code = (value ?? "").trim().toUpperCase();
    if (!code) return "";
    if (!COUNTRY_CODE.test(code)) throw new BadRequestException("Choose a valid country.");
    return code;
  }

  /* ==========================================================================
     DELETE (permanent, creator only)
  ========================================================================== */

  async remove(userId: string, eventId: string) {
    const event = await this.eventModel.findById(this.objectId(eventId)).exec();

    if (!event) {
      throw new NotFoundException("Event not found.");
    }

    if (!(await this.canManageEvent(event, userId))) {
      throw new ForbiddenException("Only the event creator or the organization's event managers can delete this event.");
    }

    const result = await event.deleteOne();

    if (!result || (typeof result.deletedCount === "number" && result.deletedCount !== 1)) {
      throw new InternalServerErrorException("The event could not be deleted.");
    }

    return { success: true, message: "Event deleted successfully." };
  }

  /* ==========================================================================
     RSVP
     Atomic and idempotent: repeating a request leaves the same state and
     never creates duplicates ($addToSet). Going and Interested are
     mutually exclusive. Ended and cancelled events are rejected by the
     update filter itself, so a race with cancellation or expiry cannot
     sneak an RSVP in.
  ========================================================================== */

  private rsvpResult(event: EventLean, userId: string): RsvpResult {
    const attendees = idList(event.attendeeIds);
    const interested = idList(event.interestedIds);
    const going = attendees.includes(userId);
    const isInterested = !going && interested.includes(userId);

    return {
      success: true,
      eventId: String(event._id),
      status: going ? EventRsvpStatus.GOING : isInterested ? EventRsvpStatus.INTERESTED : null,
      going,
      interested: isInterested,
      attendeeCount: attendees.length,
      interestedCount: interested.length,
    };
  }

  /** Explains why a conditional RSVP update matched nothing. */
  private async explainRsvpFailure(eventId: Types.ObjectId, userId: string): Promise<never> {
    const event = await this.eventModel.findById(eventId).lean<EventLean>().exec();

    if (!event) {
      throw new NotFoundException("Event not found.");
    }

    const status = getEventStatus(event);

    if (status === EventStatus.CANCELLED) {
      throw new BadRequestException("This event has been cancelled.");
    }

    if (status === EventStatus.ENDED) {
      throw new BadRequestException("This event has already ended.");
    }

    if (status === EventStatus.POSTPONED) {
      throw new BadRequestException("This event has been postponed. You can join once it has a new date.");
    }

    if (
      typeof event.capacity === "number" &&
      idList(event.attendeeIds).length >= event.capacity &&
      !idList(event.attendeeIds).includes(userId)
    ) {
      throw new ConflictException("This event is full.");
    }

    throw new ConflictException("Your RSVP could not be updated. Please try again.");
  }

  async rsvp(
    userId: string,
    eventId: string,
    status: EventRsvpStatus = EventRsvpStatus.GOING,
  ): Promise<RsvpResult> {
    const { event } = await this.loadVisible(eventId, userId);
    const user = this.objectId(userId, "user");

    if (!isEventActive(event)) {
      return this.explainRsvpFailure(event._id, userId);
    }

    if (String(event.creatorId) === userId) {
      // The organizer is always Going.
      return this.rsvpResult(event, userId);
    }

    const mode = settingsOf(event).mode;

    if (status === EventRsvpStatus.GOING && mode === RegistrationMode.REQUIRED) {
      throw new BadRequestException("Register for this event to attend.");
    }

    if (
      status === EventRsvpStatus.INTERESTED &&
      mode === RegistrationMode.REQUIRED &&
      idList(event.attendeeIds).includes(userId)
    ) {
      throw new BadRequestException("You're registered for this event. Cancel your registration to leave it.");
    }

    if (status === EventRsvpStatus.GOING && mode === RegistrationMode.NONE) {
      throw new BadRequestException("This event doesn't take RSVPs. You can save it as Interested.");
    }

    const now = new Date();
    const base = { _id: event._id, ...activeEventFilter(now) };

    const updated =
      status === EventRsvpStatus.INTERESTED
        ? await this.eventModel
            .findOneAndUpdate(
              base,
              { $addToSet: { interestedIds: user }, $pull: { attendeeIds: user } },
              { returnDocument: "after" },
            )
            .lean<EventLean>()
            .exec()
        : await this.eventModel
            .findOneAndUpdate(
              {
                ...base,
                $or: [
                  { capacity: null },
                  { attendeeIds: user },
                  {
                    $expr: {
                      $lt: [{ $size: { $ifNull: ["$attendeeIds", []] } }, "$capacity"],
                    },
                  },
                ],
              },
              { $addToSet: { attendeeIds: user }, $pull: { interestedIds: user } },
              { returnDocument: "after" },
            )
            .lean<EventLean>()
            .exec();

    if (!updated) {
      return this.explainRsvpFailure(event._id, userId);
    }

    return this.rsvpResult(updated, userId);
  }

  /** DELETE /events/:id/rsvp — leaves Going and Interested. */
  async cancelRsvp(userId: string, eventId: string): Promise<RsvpResult> {
    const { event } = await this.loadVisible(eventId, userId);
    const user = this.objectId(userId, "user");

    if (String(event.creatorId) === userId) {
      return this.rsvpResult(event, userId);
    }

    if (
      settingsOf(event).mode === RegistrationMode.REQUIRED &&
      idList(event.attendeeIds).includes(userId)
    ) {
      throw new BadRequestException("You're registered for this event. Cancel your registration instead.");
    }

    if (!isEventActive(event)) {
      // RSVP history of ended/cancelled events is kept as it was.
      return this.explainRsvpFailure(event._id, userId);
    }

    const updated = await this.eventModel
      .findOneAndUpdate(
        { _id: event._id, ...activeEventFilter(new Date()) },
        { $pull: { attendeeIds: user, interestedIds: user } },
        { returnDocument: "after" },
      )
      .lean<EventLean>()
      .exec();

    if (!updated) {
      return this.explainRsvpFailure(event._id, userId);
    }

    return this.rsvpResult(updated, userId);
  }

  /* ==========================================================================
     INVITES (organizer only; grants access to private events)
  ========================================================================== */

  async invite(userId: string, eventId: string, userIds: string[]) {
    const event = await this.eventModel.findById(this.objectId(eventId)).lean<EventLean>().exec();

    if (!event) {
      throw new NotFoundException("Event not found.");
    }

    if (String(event.creatorId) !== userId) {
      throw new ForbiddenException("Only the event creator can invite people.");
    }

    if (!isEventActive(event)) {
      throw new BadRequestException("You can only invite people to upcoming or live events.");
    }

    const relationships = await this.loadRelationships(userId);
    const blocked = new Set(relationships.blockedIds);
    const ids = Array.from(new Set(userIds))
      .filter((id) => Types.ObjectId.isValid(id) && id !== userId && !blocked.has(id))
      .slice(0, 100);

    if (!ids.length) {
      throw new BadRequestException("Choose at least one person to invite.");
    }

    const updated = await this.eventModel
      .findOneAndUpdate(
        { _id: event._id },
        { $addToSet: { invitedIds: { $each: toObjectIds(ids) } } },
        { returnDocument: "after" },
      )
      .lean<EventLean>()
      .exec();

    if (!updated) {
      throw new NotFoundException("Event not found.");
    }

    return { success: true, invitedCount: idList(updated.invitedIds).length, invited: ids };
  }

  /* ==========================================================================
     ATTENDEES
  ========================================================================== */

  async attendees(
    eventId: string,
    viewerId: string,
    options: { status?: string; page?: number; limit?: number } = {},
  ) {
    const { event, relationships } = await this.loadVisible(eventId, viewerId);
    const status =
      options.status === EventRsvpStatus.INTERESTED
        ? EventRsvpStatus.INTERESTED
        : EventRsvpStatus.GOING;
    const page = Math.max(1, Math.floor(options.page ?? 1));
    const limit = Math.min(100, Math.max(1, Math.floor(options.limit ?? 30)));

    const all = idList(status === EventRsvpStatus.GOING ? event.attendeeIds : event.interestedIds);
    const blocked = new Set(relationships.blockedIds);
    const visibleIds = all.filter((id) => !blocked.has(id));

    // Organizer first, then friends, then everyone else (stable).
    const friends = new Set(relationships.friendIds);
    const creator = String(event.creatorId);
    const ordered = [...visibleIds].sort(
      (a, b) =>
        Number(b === creator) - Number(a === creator) ||
        Number(friends.has(b)) - Number(friends.has(a)),
    );

    const pageIds = ordered.slice((page - 1) * limit, page * limit);
    const userModel = this.connection.models["User"];
    const users = userModel && pageIds.length
      ? ((await userModel
          .find({ _id: { $in: toObjectIds(pageIds) } })
          .select(ORGANIZER_FIELDS)
          .lean()
          .exec()) as any[])
      : [];

    const byId = new Map(users.map((user) => [String(user._id), user]));

    return {
      eventId: String(event._id),
      status,
      attendeeCount: idList(event.attendeeIds).length,
      interestedCount: idList(event.interestedIds).length,
      // Legacy field kept for older clients: the IDs on this page.
      attendeeIds: pageIds,
      attendees: pageIds
        .map((id) => byId.get(id))
        .filter(Boolean)
        .map((user) => ({
          ...this.toPerson(user),
          isOrganizer: String(user._id) === creator,
          isFriend: friends.has(String(user._id)),
        })),
      friendsGoingCount: idList(event.attendeeIds).filter((id) => friends.has(id)).length,
      page,
      limit,
      hasMore: page * limit < ordered.length,
    };
  }

  /* ==========================================================================
     MY EVENTS (history included)
  ========================================================================== */

  /** Events the user created: upcoming, live, ended and cancelled. */
  async myEvents(userId: string): Promise<SerializedEvent[]> {
    const events = await this.eventModel
      .find({ creatorId: this.objectId(userId, "user") })
      .sort({ startDate: -1 })
      .limit(MAX_HISTORY)
      .lean<EventLean[]>()
      .exec();

    return this.serializeMany(events, userId);
  }

  /**
   * Events the user is Going to or Interested in, including ended and
   * cancelled ones so history stays visible. Events the user created are
   * listed under myEvents instead.
   */
  async myRsvps(userId: string): Promise<SerializedEvent[]> {
    const user = this.objectId(userId, "user");
    const relationships = await this.loadRelationships(userId);

    const events = await this.eventModel
      .find(
        and(
          { creatorId: { $ne: user } },
          { $or: [{ attendeeIds: user }, { interestedIds: user }] },
          relationships.blockedIds.length
            ? { creatorId: { $nin: toObjectIds(relationships.blockedIds) } }
            : {},
        ),
      )
      .sort({ startDate: 1 })
      .limit(MAX_HISTORY)
      .lean<EventLean[]>()
      .exec();

    return this.serializeMany(events, userId);
  }

  /* ==========================================================================
     FEED RECOMMENDATIONS
  ========================================================================== */

  private toRecommendable(event: EventLean): RecommendableEvent {
    return {
      id: String(event._id),
      creatorId: String(event.creatorId),
      category: String(event.category ?? EventCategory.GENERAL),
      startDate: event.startDate,
      endDate: event.endDate,
      isCancelled: Boolean(event.isCancelled),
      isOnline: Boolean(event.isOnline),
      latitude: typeof event.latitude === "number" ? event.latitude : null,
      longitude: typeof event.longitude === "number" ? event.longitude : null,
      attendeeIds: idList(event.attendeeIds),
      interestedIds: idList(event.interestedIds),
      capacity: typeof event.capacity === "number" ? event.capacity : null,
    };
  }

  /** Categories of events the viewer went to or was interested in (last year). */
  async categoryAffinity(viewerId?: string): Promise<Map<string, number>> {
    const affinity = new Map<string, number>();

    if (!viewerId || !Types.ObjectId.isValid(viewerId)) {
      return affinity;
    }

    const viewer = new Types.ObjectId(viewerId);

    try {
      const rows = await this.eventModel
        .aggregate([
          {
            $match: {
              creatorId: { $ne: viewer },
              startDate: { $gte: new Date(Date.now() - 365 * DAY_MS) },
              $or: [{ attendeeIds: viewer }, { interestedIds: viewer }],
            },
          },
          { $sort: { startDate: -1 } },
          { $limit: 300 },
          {
            $group: {
              _id: "$category",
              score: {
                $sum: { $cond: [{ $in: [viewer, { $ifNull: ["$attendeeIds", []] }] }, 2, 1] },
              },
            },
          },
        ])
        .exec();

      for (const row of rows) {
        if (row._id) {
          affinity.set(String(row._id), Number(row.score) || 0);
        }
      }
    } catch (error) {
      this.logger.warn(`Could not load event category affinity: ${String(error)}`);
    }

    return affinity;
  }

  /**
   * Ranked, eligible events for one feed page. Only active events the
   * viewer may see are ever loaded (the expiry and visibility rules are in
   * the query). Events in excludeIds (already shown or dismissed in this
   * scrolling session) are skipped.
   */
  async recommendForFeed(options: FeedEventRecommendationOptions): Promise<SerializedEvent[]> {
    const now = options.now ?? new Date();
    const limit = Math.max(0, Math.min(10, options.limit));

    if (limit === 0) {
      return [];
    }

    const viewerId = options.viewerId;
    const exclude = toObjectIds(options.excludeIds ?? []);
    const viewer = viewerId && Types.ObjectId.isValid(viewerId) ? new Types.ObjectId(viewerId) : null;

    const filter = and(
      buildEventVisibilityFilter(viewerId, options.relationships),
      activeEventFilter(now),
      {
        startDate: {
          $lt: new Date(now.getTime() + EVENT_RECOMMENDATION_CONFIG.horizonDays * DAY_MS),
        },
      },
      exclude.length ? { _id: { $nin: exclude } } : {},
      viewer ? { creatorId: { $ne: viewer }, attendeeIds: { $ne: viewer } } : {},
      options.organizerIds
        ? { creatorId: { $in: toObjectIds(options.organizerIds) } }
        : {},
    );

    const [candidates, affinity] = await Promise.all([
      this.eventModel
        .find(filter)
        .sort({ startDate: 1, _id: 1 })
        .limit(150)
        .lean<EventLean[]>()
        .exec(),
      this.categoryAffinity(viewerId),
    ]);

    if (candidates.length === 0) {
      return [];
    }

    const ranked = rankEvents(
      candidates.map((event) => this.toRecommendable(event)),
      {
        viewerId,
        categoryAffinity: affinity,
        friendIds: new Set(options.relationships.friendIds),
        followedIds: new Set(options.relationships.followedIds),
        latitude: options.latitude,
        longitude: options.longitude,
        radiusKm: options.radiusKm,
      },
      now,
    ).slice(0, limit);

    const byId = new Map(candidates.map((event) => [String(event._id), event]));
    const chosen = ranked
      .map((item) => byId.get(item.event.id))
      .filter((event): event is EventLean => Boolean(event));

    const point =
      typeof options.latitude === "number" && typeof options.longitude === "number"
        ? { latitude: options.latitude, longitude: options.longitude }
        : undefined;

    return this.serializeMany(chosen, viewerId, now, point);
  }
}
