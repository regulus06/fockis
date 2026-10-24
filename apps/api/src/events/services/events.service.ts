import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";

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
import { UpdateEventDto } from "../dto/update-event.dto";
import type {
  DiscoverEventsQueryDto,
  EventSectionsQueryDto,
} from "../dto/discover-events.dto";

import {
  activeEventFilter,
  getEventStatus,
  isEventActive,
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
    extras: { distanceKm?: number } = {},
  ): SerializedEvent {
    const creatorId = String(event.creatorId);
    const attendees = idList(event.attendeeIds);
    const interested = idList(event.interestedIds);
    const invited = idList(event.invitedIds);

    const isOwner = Boolean(viewerId && viewerId === creatorId);
    const isGoing = Boolean(viewerId && attendees.includes(viewerId));
    const isInterested = Boolean(viewerId && !isGoing && interested.includes(viewerId));
    const isInvited = Boolean(viewerId && invited.includes(viewerId));

    const status = getEventStatus(event, now);
    const capacity =
      typeof event.capacity === "number" && event.capacity > 0 ? event.capacity : null;
    const spotsLeft = capacity === null ? null : Math.max(0, capacity - attendees.length);
    const isFull = spotsLeft === 0;
    const active = status === EventStatus.UPCOMING || status === EventStatus.LIVE;

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
      onlineUrl: isOwner || isGoing || isInterested ? event.onlineUrl ?? "" : "",
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
      canRsvp: active && !isOwner && (!isFull || isGoing),
      ...(typeof extras.distanceKm === "number"
        ? { distanceKm: Math.round(extras.distanceKm * 10) / 10 }
        : {}),
      createdAt: isoOrNull(event.createdAt),
      updatedAt: isoOrNull(event.updatedAt),
    };
  }

  private async serializeMany(
    events: EventLean[],
    viewerId?: string,
    now: Date = new Date(),
    distanceFrom?: { latitude: number; longitude: number },
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

      return this.serialize(event, viewerId, organizers, now, { distanceKm });
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
      const onlineUrl = isOnline ? dto.onlineUrl?.trim() ?? "" : "";
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
        creatorId,
        title: dto.title.trim(),
        description: dto.description?.trim() ?? "",
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
      });

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

    if (query.format === "online") {
      filters.push({ isOnline: true });
    } else if (query.format === "in-person") {
      filters.push({ isOnline: { $ne: true } });
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
      sort === "popularity"
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
    const { event } = await this.loadVisible(id, viewerId);
    const [serialized] = await this.serializeMany([event], viewerId);

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

      if (!event.creatorId.equals(this.objectId(userId, "user"))) {
        throw new ForbiddenException("Only the event creator can update this event.");
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
      const onlineUrl = isOnline ? (dto.onlineUrl ?? event.onlineUrl ?? "").trim() : "";
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
      if (dto.description !== undefined) event.description = dto.description.trim();
      if (dto.category !== undefined) event.category = dto.category;
      if (dto.visibility !== undefined) event.visibility = dto.visibility;
      if (dto.timeZone !== undefined) event.timeZone = dto.timeZone;
      if (dto.capacity !== undefined) event.capacity = dto.capacity;

      event.startDate = startDate;
      event.endDate = endDate;
      event.isOnline = isOnline;
      event.onlineUrl = onlineUrl;
      event.locationName = locationName;
      event.address = address;
      event.set("latitude", latitude ?? undefined);
      event.set("longitude", longitude ?? undefined);

      await event.save();

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
     CANCEL (soft, keeps the document and RSVP history)
  ========================================================================== */

  async cancel(userId: string, eventId: string, reason?: string) {
    const event = await this.eventModel.findById(this.objectId(eventId)).exec();

    if (!event) {
      throw new NotFoundException("Event not found.");
    }

    if (!event.creatorId.equals(this.objectId(userId, "user"))) {
      throw new ForbiddenException("Only the event creator can cancel this event.");
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

    const [serialized] = await this.serializeMany([event.toObject() as unknown as EventLean], userId);

    return { success: true, cancelled: true, message: "Event cancelled successfully.", event: serialized };
  }

  /* ==========================================================================
     DELETE (permanent, creator only)
  ========================================================================== */

  async remove(userId: string, eventId: string) {
    const event = await this.eventModel.findById(this.objectId(eventId)).exec();

    if (!event) {
      throw new NotFoundException("Event not found.");
    }

    if (!event.creatorId.equals(this.objectId(userId, "user"))) {
      throw new ForbiddenException("Only the event creator can delete this event.");
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
