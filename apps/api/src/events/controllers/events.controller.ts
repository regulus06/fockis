import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";

import type { Request } from "express";

import {
  FileFieldsInterceptor,
} from "@nestjs/platform-express";

import {
  diskStorage,
} from "multer";

import {
  extname,
} from "path";

import { randomUUID } from "crypto";

import { EventsService } from "../services/events.service";

import { CreateEventDto } from "../dto/create-event.dto";
import { UpdateEventDto } from "../dto/update-event.dto";

import { JwtAuthGuard } from "../../auth/jwt-auth.guard";


/* ============================================================================
   AUTHENTICATED REQUEST
============================================================================ */

interface AuthenticatedRequest extends Request {
  user: {
    id?: string;
    _id?: string;
    userId?: string;
  };
}


/* ============================================================================
   UPLOADED EVENT FILES
============================================================================ */

interface EventUploadedFiles {
  coverImageFile?: Express.Multer.File[];

  eventVideoFile?: Express.Multer.File[];

  videoFile?: Express.Multer.File[];
}


/* ============================================================================
   EVENTS CONTROLLER
============================================================================ */

@Controller("events")
@UseGuards(JwtAuthGuard)
export class EventsController {

  constructor(
    private readonly eventsService: EventsService,
  ) {}


  /* ==========================================================================
     AUTHENTICATED USER
  ========================================================================== */

  private getUserId(
    req: AuthenticatedRequest,
  ): string {

    const userId =
      req.user?.id ??
      req.user?._id ??
      req.user?.userId;

    if (!userId) {
      throw new BadRequestException(
        "Authenticated user ID was not found.",
      );
    }

    return String(userId);
  }


  /* ==========================================================================
     CREATE EVENT
  ========================================================================== */

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        {
          name: "coverImageFile",
          maxCount: 1,
        },
        {
          name: "eventVideoFile",
          maxCount: 1,
        },
        {
          name: "videoFile",
          maxCount: 1,
        },
      ],
      {
        storage: diskStorage({
          destination: "./uploads/events",

          filename: (
            _req,
            file,
            callback,
          ) => {

            const extension =
              extname(
                file.originalname,
              ).toLowerCase();

            const filename =
              `${Date.now()}-${randomUUID()}${extension}`;

            callback(
              null,
              filename,
            );
          },
        }),

        limits: {
          fileSize:
            500 * 1024 * 1024,
        },

        fileFilter: (
          _req,
          file,
          callback,
        ) => {

          if (
            file.fieldname ===
            "coverImageFile"
          ) {

            const allowedImages = [
              "image/jpeg",
              "image/png",
              "image/webp",
            ];

            if (
              !allowedImages.includes(
                file.mimetype,
              )
            ) {
              return callback(
                new BadRequestException(
                  "Cover image must be JPG, PNG, or WebP.",
                ),
                false,
              );
            }

            return callback(
              null,
              true,
            );
          }


          if (
            file.fieldname ===
              "eventVideoFile" ||
            file.fieldname ===
              "videoFile"
          ) {

            const allowedVideos = [
              "video/mp4",
              "video/webm",
              "video/quicktime",
              "video/x-msvideo",
              "video/x-matroska",
            ];

            if (
              !allowedVideos.includes(
                file.mimetype,
              )
            ) {
              return callback(
                new BadRequestException(
                  "Event video must be MP4, WebM, MOV, AVI, or MKV.",
                ),
                false,
              );
            }

            return callback(
              null,
              true,
            );
          }


          return callback(
            new BadRequestException(
              `Unsupported event upload field: ${file.fieldname}`,
            ),
            false,
          );
        },
      },
    ),
  )
  async create(
    @Req()
    req: AuthenticatedRequest,

    @Body()
    dto: CreateEventDto,

    @UploadedFiles()
    files: EventUploadedFiles,
  ) {

    const userId =
      this.getUserId(req);

    const coverImageFile =
      files?.coverImageFile?.[0];

    const videoFile =
      files?.eventVideoFile?.[0] ??
      files?.videoFile?.[0];

    return this.eventsService.create(
      userId,
      dto,
      coverImageFile,
      videoFile,
    );
  }


  /* ==========================================================================
     ALL EVENTS
  ========================================================================== */

  @Get()
  findAll() {
    return this.eventsService.findAll();
  }


  /* ==========================================================================
     UPCOMING EVENTS
  ========================================================================== */

  @Get("upcoming")
  upcoming() {
    return this.eventsService.findUpcoming();
  }


  /* ==========================================================================
     NEARBY EVENTS
  ========================================================================== */

  @Get("nearby")
  nearby(
    @Query("latitude")
    latitude: string,

    @Query("longitude")
    longitude: string,

    @Query("radiusKm")
    radiusKm?: string,
  ) {

    const lat =
      Number(latitude);

    const lon =
      Number(longitude);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lon)
    ) {
      throw new BadRequestException(
        "latitude and longitude are required.",
      );
    }

    const radius =
      radiusKm
        ? Number(radiusKm)
        : 50;

    return this.eventsService.findNearby(
      lat,
      lon,
      Number.isFinite(radius)
        ? radius
        : 50,
    );
  }


  /* ==========================================================================
     MY EVENTS
  ========================================================================== */

  @Get("my-events")
  myEvents(
    @Req()
    req: AuthenticatedRequest,
  ) {

    return this.eventsService.myEvents(
      this.getUserId(req),
    );
  }


  /* ==========================================================================
     MY RSVPS
  ========================================================================== */

  @Get("my-rsvps")
  myRsvps(
    @Req()
    req: AuthenticatedRequest,
  ) {

    return this.eventsService.myRsvps(
      this.getUserId(req),
    );
  }


  /* ==========================================================================
     EVENT ATTENDEES
  ========================================================================== */

  @Get(":id/attendees")
  attendees(
    @Param("id")
    id: string,
  ) {

    return this.eventsService.attendees(
      id,
    );
  }


  /* ==========================================================================
     EVENT DETAILS
  ========================================================================== */

  @Get(":id")
  findOne(
    @Param("id")
    id: string,
  ) {

    return this.eventsService.findOne(
      id,
    );
  }


  /* ==========================================================================
     UPDATE EVENT
  ========================================================================== */

  @Patch(":id")
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        {
          name: "coverImageFile",
          maxCount: 1,
        },
        {
          name: "eventVideoFile",
          maxCount: 1,
        },
        {
          name: "videoFile",
          maxCount: 1,
        },
      ],
      {
        storage: diskStorage({
          destination: "./uploads/events",

          filename: (
            _req,
            file,
            callback,
          ) => {

            const extension =
              extname(
                file.originalname,
              ).toLowerCase();

            const filename =
              `${Date.now()}-${randomUUID()}${extension}`;

            callback(
              null,
              filename,
            );
          },
        }),

        limits: {
          fileSize:
            500 * 1024 * 1024,
        },

        fileFilter: (
          _req,
          file,
          callback,
        ) => {

          if (
            file.fieldname ===
            "coverImageFile"
          ) {

            const allowedImages = [
              "image/jpeg",
              "image/png",
              "image/webp",
            ];

            if (
              !allowedImages.includes(
                file.mimetype,
              )
            ) {
              return callback(
                new BadRequestException(
                  "Cover image must be JPG, PNG, or WebP.",
                ),
                false,
              );
            }

            return callback(
              null,
              true,
            );
          }


          if (
            file.fieldname ===
              "eventVideoFile" ||
            file.fieldname ===
              "videoFile"
          ) {

            const allowedVideos = [
              "video/mp4",
              "video/webm",
              "video/quicktime",
              "video/x-msvideo",
              "video/x-matroska",
            ];

            if (
              !allowedVideos.includes(
                file.mimetype,
              )
            ) {
              return callback(
                new BadRequestException(
                  "Event video must be MP4, WebM, MOV, AVI, or MKV.",
                ),
                false,
              );
            }

            return callback(
              null,
              true,
            );
          }


          return callback(
            new BadRequestException(
              `Unsupported event upload field: ${file.fieldname}`,
            ),
            false,
          );
        },
      },
    ),
  )
  async update(
    @Req()
    req: AuthenticatedRequest,

    @Param("id")
    id: string,

    @Body()
    dto: UpdateEventDto,

    @UploadedFiles()
    files: EventUploadedFiles,
  ) {

    const authenticatedUserId =
      this.getUserId(req);

    const coverImageFile =
      files?.coverImageFile?.[0];

    const videoFile =
      files?.eventVideoFile?.[0] ??
      files?.videoFile?.[0];

    console.log(
      "[EVENT UPDATE]",
      {
        authenticatedUserId,
        eventId: id,
      },
    );

    return this.eventsService.update(
      authenticatedUserId,
      id,
      dto,
      coverImageFile,
      videoFile,
    );
  }


  /* ==========================================================================
     CANCEL EVENT

     THIS FIXES:

       PATCH /events/:id/cancel

     The authenticated user is taken from the JWT.
     The service verifies that the authenticated user owns the event.
  ========================================================================== */

  @Patch(":id/cancel")
  async cancel(
    @Req()
    req: AuthenticatedRequest,

    @Param("id")
    id: string,
  ) {

    const authenticatedUserId =
      this.getUserId(req);

    console.log(
      "[EVENT CANCEL]",
      {
        authenticatedUserId,
        eventId: id,
      },
    );

    return this.eventsService.cancel(
      authenticatedUserId,
      id,
    );
  }


  /* ==========================================================================
     DELETE EVENT
  ========================================================================== */

  @Delete(":id")
  remove(
    @Req()
    req: AuthenticatedRequest,

    @Param("id")
    id: string,
  ) {

    const authenticatedUserId =
      this.getUserId(req);

    return this.eventsService.remove(
      authenticatedUserId,
      id,
    );
  }


  /* ==========================================================================
     RSVP
  ========================================================================== */

  @Post(":id/rsvp")
  rsvp(
    @Req()
    req: AuthenticatedRequest,

    @Param("id")
    id: string,
  ) {

    return this.eventsService.rsvp(
      this.getUserId(req),
      id,
    );
  }


  /* ==========================================================================
     CANCEL RSVP
  ========================================================================== */

  @Delete(":id/rsvp")
  cancelRsvp(
    @Req()
    req: AuthenticatedRequest,

    @Param("id")
    id: string,
  ) {

    return this.eventsService.cancelRsvp(
      this.getUserId(req),
      id,
    );
  }

}