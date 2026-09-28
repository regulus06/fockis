import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { InjectModel } from "@nestjs/mongoose";

import {
  Model,
  Types,
} from "mongoose";

import {
  Event,
  EventCategory,
  EventCoverMediaType,
  EventDocument,
  EventStatus,
  EventVisibility,
} from "../schemas/event.schema";

import { CreateEventDto } from "../dto/create-event.dto";
import { UpdateEventDto } from "../dto/update-event.dto";

import { extname } from "path";


@Injectable()
export class EventsService {

  constructor(
    @InjectModel(Event.name)
    private readonly eventModel: Model<EventDocument>,
  ) {}


  /* ==========================================================================
     OBJECT ID
  ========================================================================== */

  private objectId(
    id: string,
  ): Types.ObjectId {

    if (
      !id ||
      !Types.ObjectId.isValid(id)
    ) {
      throw new BadRequestException(
        "Invalid user or event ID.",
      );
    }

    return new Types.ObjectId(id);
  }


  /* ==========================================================================
     EVENT STATUS
  ========================================================================== */

  private getStatus(
    event: EventDocument,
  ): EventStatus {

    if (event.isCancelled) {
      return EventStatus.CANCELLED;
    }

    const now =
      new Date();

    if (
      now < event.startDate
    ) {
      return EventStatus.UPCOMING;
    }

    if (
      now >= event.startDate &&
      now < event.endDate
    ) {
      return EventStatus.LIVE;
    }

    return EventStatus.ENDED;
  }


  /* ==========================================================================
     SERIALIZE EVENT
  ========================================================================== */

  private serialize(
    event: EventDocument,
  ) {

    return {
      id:
        event._id.toString(),

      creatorId:
        event.creatorId.toString(),

      title:
        event.title,

      description:
        event.description ?? "",

      category:
        event.category,

      visibility:
        event.visibility,

      startDate:
        event.startDate.toISOString(),

      endDate:
        event.endDate.toISOString(),

      locationName:
        event.locationName ?? "",

      address:
        event.address ?? "",

      latitude:
        event.latitude ?? null,

      longitude:
        event.longitude ?? null,

      isOnline:
        event.isOnline,

      onlineUrl:
        event.onlineUrl ?? "",

      /* ----------------------------------------------------------------------
         MEDIA
      ---------------------------------------------------------------------- */

      coverImageUrl:
        event.coverImageUrl ?? "",

      coverVideoUrl:
        event.coverVideoUrl ?? "",

      coverMediaType:
        event.coverMediaType ??
        EventCoverMediaType.IMAGE,

      /* ----------------------------------------------------------------------
         ATTENDEES
      ---------------------------------------------------------------------- */

      attendeeCount:
        event.attendeeIds.length,

      /* ----------------------------------------------------------------------
         STATUS
      ---------------------------------------------------------------------- */

      status:
        this.getStatus(event),

      isCancelled:
        event.isCancelled,

      /* ----------------------------------------------------------------------
         TIMESTAMPS
      ---------------------------------------------------------------------- */

      createdAt:
        event.createdAt,

      updatedAt:
        event.updatedAt,
    };
  }


  /* ==========================================================================
     DATE VALIDATION
  ========================================================================== */

  private validateDateRange(
    startDate: Date,
    endDate: Date,
  ) {

    if (
      Number.isNaN(
        startDate.getTime(),
      )
    ) {
      throw new BadRequestException(
        "Invalid start date.",
      );
    }

    if (
      Number.isNaN(
        endDate.getTime(),
      )
    ) {
      throw new BadRequestException(
        "Invalid end date.",
      );
    }

    if (
      endDate <= startDate
    ) {
      throw new BadRequestException(
        "The end date/time must be after the begin date/time.",
      );
    }
  }


  /* ==========================================================================
     MEDIA TYPE
  ========================================================================== */

  private getMediaType(
    file?: Express.Multer.File,
  ):
    | EventCoverMediaType
    | undefined {

    if (!file) {
      return undefined;
    }

    if (
      file.mimetype.startsWith(
        "video/",
      )
    ) {
      return EventCoverMediaType.VIDEO;
    }

    if (
      file.mimetype.startsWith(
        "image/",
      )
    ) {
      return EventCoverMediaType.IMAGE;
    }

    return undefined;
  }


  /* ==========================================================================
     VALIDATE MEDIA FILE
  ========================================================================== */

  private validateMediaFile(
    file?: Express.Multer.File,
  ) {

    if (!file) {
      return;
    }

    const isImage =
      file.mimetype.startsWith(
        "image/",
      );

    const isVideo =
      file.mimetype.startsWith(
        "video/",
      );

    if (
      !isImage &&
      !isVideo
    ) {
      throw new BadRequestException(
        "Event media must be an image or video.",
      );
    }

    /* ------------------------------------------------------------------------
       IMAGE
    ------------------------------------------------------------------------ */

    if (isImage) {

      const maxImageSize =
        10 * 1024 * 1024;

      if (
        file.size >
        maxImageSize
      ) {
        throw new BadRequestException(
          "Event images must be 10 MB or smaller.",
        );
      }
    }

    /* ------------------------------------------------------------------------
       VIDEO
    ------------------------------------------------------------------------ */

    if (isVideo) {

      const maxVideoSize =
        100 * 1024 * 1024;

      if (
        file.size >
        maxVideoSize
      ) {
        throw new BadRequestException(
          "Event videos must be 100 MB or smaller.",
        );
      }
    }
  }


  /* ==========================================================================
     GET MEDIA URL
  ========================================================================== */

  private getMediaUrl(
    file?: Express.Multer.File,
  ): string | undefined {

    if (!file) {
      return undefined;
    }

    this.validateMediaFile(file);

    /* ------------------------------------------------------------------------
       MULTER DISK STORAGE
    ------------------------------------------------------------------------ */

    if (file.filename) {
      return `/uploads/events/${file.filename}`;
    }

    /* ------------------------------------------------------------------------
       MEMORY STORAGE FALLBACK
    ------------------------------------------------------------------------ */

    if (file.originalname) {

      const extension =
        extname(
          file.originalname,
        ).toLowerCase();

      const filename =
        `${Date.now()}-${Math.round(
          Math.random() * 1e9,
        )}${extension}`;

      return `/uploads/events/${filename}`;
    }

    return undefined;
  }


  /* ==========================================================================
     CREATE EVENT
  ========================================================================== */

  async create(
    userId: string,
    dto: CreateEventDto,
    coverImageFile?: Express.Multer.File,
    coverVideoFile?: Express.Multer.File,
  ) {

    const creatorId =
      this.objectId(userId);

    /* ------------------------------------------------------------------------
       DATE
    ------------------------------------------------------------------------ */

    const startDate =
      new Date(dto.startDate);

    const endDate =
      new Date(dto.endDate);

    this.validateDateRange(
      startDate,
      endDate,
    );

    /* ------------------------------------------------------------------------
       MEDIA
    ------------------------------------------------------------------------ */

    if (
      coverImageFile &&
      coverVideoFile
    ) {
      throw new BadRequestException(
        "Choose either an image or a video, not both.",
      );
    }

    const uploadedFile =
      coverImageFile ??
      coverVideoFile;

    const uploadedMediaUrl =
      this.getMediaUrl(
        uploadedFile,
      );

    const uploadedMediaType =
      this.getMediaType(
        uploadedFile,
      );

    /* ------------------------------------------------------------------------
       IMAGE URL
    ------------------------------------------------------------------------ */

    const coverImageUrl =
      uploadedMediaType ===
      EventCoverMediaType.IMAGE
        ? uploadedMediaUrl
        : dto.coverImageUrl?.trim();

    /* ------------------------------------------------------------------------
       VIDEO URL
    ------------------------------------------------------------------------ */

    const createDtoWithVideo =
      dto as CreateEventDto & {
        coverVideoUrl?: string;
      };

    const coverVideoUrl =
      uploadedMediaType ===
      EventCoverMediaType.VIDEO
        ? uploadedMediaUrl
        : createDtoWithVideo.coverVideoUrl?.trim();

    /* ------------------------------------------------------------------------
       MEDIA TYPE
    ------------------------------------------------------------------------ */

    let coverMediaType:
      | EventCoverMediaType
      | undefined;

    if (uploadedMediaType) {

      coverMediaType =
        uploadedMediaType;

    } else if (coverVideoUrl) {

      coverMediaType =
        EventCoverMediaType.VIDEO;

    } else if (coverImageUrl) {

      coverMediaType =
        EventCoverMediaType.IMAGE;
    }

    /* ------------------------------------------------------------------------
       CREATE
    ------------------------------------------------------------------------ */

    const event =
      await this.eventModel.create({

        creatorId,

        title:
          dto.title.trim(),

        description:
          dto.description?.trim(),

        category:
          dto.category ??
          EventCategory.GENERAL,

        visibility:
          dto.visibility ??
          EventVisibility.PUBLIC,

        startDate,

        endDate,

        locationName:
          dto.locationName?.trim(),

        address:
          dto.address?.trim(),

        latitude:
          dto.latitude,

        longitude:
          dto.longitude,

        isOnline:
          dto.isOnline ?? false,

        onlineUrl:
          dto.onlineUrl?.trim(),

        coverImageUrl,

        coverVideoUrl,

        coverMediaType,

        attendeeIds: [
          creatorId,
        ],

        isCancelled: false,
      });

    return this.serialize(
      event,
    );
  }


  /* ==========================================================================
     ALL EVENTS
  ========================================================================== */

  async findAll() {

    const events =
      await this.eventModel
        .find({
          isCancelled: false,
        })
        .sort({
          startDate: 1,
        })
        .exec();

    return events.map(
      (event) =>
        this.serialize(event),
    );
  }


  /* ==========================================================================
     UPCOMING EVENTS
  ========================================================================== */

  async findUpcoming() {

    const now =
      new Date();

    const events =
      await this.eventModel
        .find({
          isCancelled: false,

          endDate: {
            $gt: now,
          },
        })
        .sort({
          startDate: 1,
        })
        .exec();

    return events.map(
      (event) =>
        this.serialize(event),
    );
  }


  /* ==========================================================================
     NEARBY EVENTS
  ========================================================================== */

  async findNearby(
    latitude: number,
    longitude: number,
    radiusKm = 50,
  ) {

    const events =
      await this.eventModel
        .find({
          isCancelled: false,

          latitude: {
            $exists: true,
          },

          longitude: {
            $exists: true,
          },

          startDate: {
            $gte: new Date(),
          },
        })
        .exec();

    const earthRadiusKm =
      6371;

    const nearby =
      events.filter(
        (event) => {

          if (
            event.latitude === undefined ||
            event.longitude === undefined
          ) {
            return false;
          }

          const lat1 =
            (latitude * Math.PI) /
            180;

          const lat2 =
            (event.latitude * Math.PI) /
            180;

          const deltaLat =
            (
              (
                event.latitude -
                latitude
              ) *
              Math.PI
            ) / 180;

          const deltaLon =
            (
              (
                event.longitude -
                longitude
              ) *
              Math.PI
            ) / 180;

          const a =
            Math.sin(
              deltaLat / 2,
            ) ** 2 +

            Math.cos(lat1) *
              Math.cos(lat2) *
              Math.sin(
                deltaLon / 2,
              ) ** 2;

          const distance =
            earthRadiusKm *
            2 *
            Math.atan2(
              Math.sqrt(a),
              Math.sqrt(1 - a),
            );

          return (
            distance <= radiusKm
          );
        },
      );

    return nearby.map(
      (event) =>
        this.serialize(event),
    );
  }


  /* ==========================================================================
     EVENT DETAILS
  ========================================================================== */

  async findOne(
    id: string,
  ) {

    const event =
      await this.eventModel
        .findById(
          this.objectId(id),
        )
        .exec();

    if (!event) {
      throw new NotFoundException(
        "Event not found.",
      );
    }

    return this.serialize(
      event,
    );
  }


  /* ==========================================================================
     UPDATE EVENT
  ========================================================================== */

  async update(
    userId: string,
    eventId: string,
    dto: UpdateEventDto,
    coverImageFile?: Express.Multer.File,
    coverVideoFile?: Express.Multer.File,
  ) {

    const event =
      await this.eventModel
        .findById(
          this.objectId(eventId),
        )
        .exec();

    if (!event) {
      throw new NotFoundException(
        "Event not found.",
      );
    }

    const currentUserId =
      this.objectId(userId);

    /* ------------------------------------------------------------------------
       OWNERSHIP CHECK
    ------------------------------------------------------------------------ */

    if (
      !event.creatorId.equals(
        currentUserId,
      )
    ) {
      throw new ForbiddenException(
        "Only the event creator can update this event.",
      );
    }

    /* ------------------------------------------------------------------------
       DATES
    ------------------------------------------------------------------------ */

    const startDate =
      dto.startDate
        ? new Date(dto.startDate)
        : event.startDate;

    const endDate =
      dto.endDate
        ? new Date(dto.endDate)
        : event.endDate;

    this.validateDateRange(
      startDate,
      endDate,
    );

    /* ------------------------------------------------------------------------
       MEDIA
    ------------------------------------------------------------------------ */

    if (
      coverImageFile &&
      coverVideoFile
    ) {
      throw new BadRequestException(
        "Choose either an image or a video, not both.",
      );
    }

    const uploadedFile =
      coverImageFile ??
      coverVideoFile;

    if (uploadedFile) {

      const mediaUrl =
        this.getMediaUrl(
          uploadedFile,
        );

      const mediaType =
        this.getMediaType(
          uploadedFile,
        );

      if (
        mediaType ===
        EventCoverMediaType.IMAGE
      ) {

        event.coverImageUrl =
          mediaUrl;

        event.coverVideoUrl =
          undefined;

        event.coverMediaType =
          EventCoverMediaType.IMAGE;
      }

      if (
        mediaType ===
        EventCoverMediaType.VIDEO
      ) {

        event.coverVideoUrl =
          mediaUrl;

        event.coverImageUrl =
          undefined;

        event.coverMediaType =
          EventCoverMediaType.VIDEO;
      }
    }

    /* ------------------------------------------------------------------------
       NORMAL FIELDS
    ------------------------------------------------------------------------ */

    Object.assign(
      event,
      {

        ...(dto.title !== undefined && {
          title:
            dto.title.trim(),
        }),

        ...(dto.description !== undefined && {
          description:
            dto.description.trim(),
        }),

        ...(dto.category !== undefined && {
          category:
            dto.category,
        }),

        ...(dto.visibility !== undefined && {
          visibility:
            dto.visibility,
        }),

        startDate,

        endDate,

        ...(dto.locationName !== undefined && {
          locationName:
            dto.locationName.trim(),
        }),

        ...(dto.address !== undefined && {
          address:
            dto.address.trim(),
        }),

        ...(dto.latitude !== undefined && {
          latitude:
            dto.latitude,
        }),

        ...(dto.longitude !== undefined && {
          longitude:
            dto.longitude,
        }),

        ...(dto.isOnline !== undefined && {
          isOnline:
            dto.isOnline,
        }),

        ...(dto.onlineUrl !== undefined && {
          onlineUrl:
            dto.onlineUrl.trim(),
        }),
      },
    );

    /* ------------------------------------------------------------------------
       EXTERNAL MEDIA URLS
    ------------------------------------------------------------------------ */

    const updateDtoWithVideo =
      dto as UpdateEventDto & {
        coverVideoUrl?: string;
      };

    if (
      dto.coverImageUrl !== undefined &&
      !coverImageFile &&
      !coverVideoFile
    ) {

      event.coverImageUrl =
        dto.coverImageUrl.trim();

      event.coverVideoUrl =
        undefined;

      event.coverMediaType =
        EventCoverMediaType.IMAGE;
    }

    if (
      updateDtoWithVideo.coverVideoUrl !==
        undefined &&
      !coverImageFile &&
      !coverVideoFile
    ) {

      event.coverVideoUrl =
        updateDtoWithVideo.coverVideoUrl.trim();

      event.coverImageUrl =
        undefined;

      event.coverMediaType =
        EventCoverMediaType.VIDEO;
    }

    await event.save();

    return this.serialize(
      event,
    );
  }


  /* ==========================================================================
     CANCEL EVENT
     
     PATCH /events/:id/cancel
     
     IMPORTANT:
     
     The user ID comes from the authenticated JWT.
     
     The frontend cannot choose another user ID.
     
     The event creator is the ONLY user allowed to cancel.
     
     Cancellation is a soft cancellation:
     
       isCancelled = true
     
     The event remains in MongoDB so existing references/RSVP history
     are not destroyed.
  ========================================================================== */

  async cancel(
    userId: string,
    eventId: string,
  ) {

    const event =
      await this.eventModel
        .findById(
          this.objectId(eventId),
        )
        .exec();

    if (!event) {
      throw new NotFoundException(
        "Event not found.",
      );
    }

    const currentUserId =
      this.objectId(userId);

    /* ------------------------------------------------------------------------
       OWNERSHIP CHECK
    ------------------------------------------------------------------------ */

    if (
      !event.creatorId.equals(
        currentUserId,
      )
    ) {
      throw new ForbiddenException(
        "Only the event creator can cancel this event.",
      );
    }

    /* ------------------------------------------------------------------------
       ALREADY CANCELLED
    ------------------------------------------------------------------------ */

    if (event.isCancelled) {
      return {
        success: true,

        cancelled: true,

        message:
          "Event is already cancelled.",

        event:
          this.serialize(event),
      };
    }

    /* ------------------------------------------------------------------------
       CANCEL
    ------------------------------------------------------------------------ */

    event.isCancelled = true;

    await event.save();

    console.log(
      "[EVENT CANCELLED]",
      {
        eventId:
          event._id.toString(),

        creatorId:
          event.creatorId.toString(),
      },
    );

    return {
      success: true,

      cancelled: true,

      message:
        "Event cancelled successfully.",

      event:
        this.serialize(event),
    };
  }


  /* ==========================================================================
     DELETE EVENT
     
     DELETE /events/:id
     
     Only the creator can permanently delete the event.
  ========================================================================== */

  async remove(
    userId: string,
    eventId: string,
  ) {

    const event =
      await this.eventModel
        .findById(
          this.objectId(eventId),
        )
        .exec();

    if (!event) {
      throw new NotFoundException(
        "Event not found.",
      );
    }

    const currentUserId =
      this.objectId(userId);

    if (
      !event.creatorId.equals(
        currentUserId,
      )
    ) {
      throw new ForbiddenException(
        "Only the event creator can delete this event.",
      );
    }

    await event.deleteOne();

    return {
      success: true,

      message:
        "Event deleted successfully.",
    };
  }


  /* ==========================================================================
     RSVP
  ========================================================================== */

  async rsvp(
    userId: string,
    eventId: string,
  ) {

    const event =
      await this.eventModel
        .findById(
          this.objectId(eventId),
        )
        .exec();

    if (!event) {
      throw new NotFoundException(
        "Event not found.",
      );
    }

    if (event.isCancelled) {
      throw new BadRequestException(
        "This event has been cancelled.",
      );
    }

    const now =
      new Date();

    if (
      now >= event.endDate
    ) {
      throw new BadRequestException(
        "This event has already ended.",
      );
    }

    const currentUserId =
      this.objectId(userId);

    const alreadyGoing =
      event.attendeeIds.some(
        (id) =>
          id.equals(
            currentUserId,
          ),
      );

    if (!alreadyGoing) {

      event.attendeeIds.push(
        currentUserId,
      );

      await event.save();
    }

    return {
      success: true,

      going: true,

      attendeeCount:
        event.attendeeIds.length,
    };
  }


  /* ==========================================================================
     CANCEL RSVP
  ========================================================================== */

  async cancelRsvp(
    userId: string,
    eventId: string,
  ) {

    const event =
      await this.eventModel
        .findById(
          this.objectId(eventId),
        )
        .exec();

    if (!event) {
      throw new NotFoundException(
        "Event not found.",
      );
    }

    const currentUserId =
      this.objectId(userId);

    /* ------------------------------------------------------------------------
       EVENT CREATOR CANNOT CANCEL THEIR OWN RSVP
       
       They remain automatically registered as the creator.
    ------------------------------------------------------------------------ */

    if (
      event.creatorId.equals(
        currentUserId,
      )
    ) {
      return {
        success: true,

        going: true,

        attendeeCount:
          event.attendeeIds.length,
      };
    }

    event.attendeeIds =
      event.attendeeIds.filter(
        (id) =>
          !id.equals(
            currentUserId,
          ),
      );

    await event.save();

    return {
      success: true,

      going: false,

      attendeeCount:
        event.attendeeIds.length,
    };
  }


  /* ==========================================================================
     ATTENDEES
  ========================================================================== */

  async attendees(
    eventId: string,
  ) {

    const event =
      await this.eventModel
        .findById(
          this.objectId(eventId),
        )
        .select(
          "attendeeIds",
        )
        .exec();

    if (!event) {
      throw new NotFoundException(
        "Event not found.",
      );
    }

    return {
      eventId,

      attendeeIds:
        event.attendeeIds.map(
          (id) =>
            id.toString(),
        ),

      attendeeCount:
        event.attendeeIds.length,
    };
  }


  /* ==========================================================================
     MY EVENTS
  ========================================================================== */

  async myEvents(
    userId: string,
  ) {

    const creatorId =
      this.objectId(userId);

    const events =
      await this.eventModel
        .find({
          creatorId,
        })
        .sort({
          startDate: -1,
        })
        .exec();

    return events.map(
      (event) =>
        this.serialize(event),
    );
  }


  /* ==========================================================================
     MY RSVPS
  ========================================================================== */

  async myRsvps(
    userId: string,
  ) {

    const currentUserId =
      this.objectId(userId);

    const events =
      await this.eventModel
        .find({
          attendeeIds:
            currentUserId,

          isCancelled: false,
        })
        .sort({
          startDate: 1,
        })
        .exec();

    return events.map(
      (event) =>
        this.serialize(event),
    );
  }
}