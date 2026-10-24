import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
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

import { FileFieldsInterceptor } from "@nestjs/platform-express";
import type { MulterOptions } from "@nestjs/platform-express/multer/interfaces/multer-options.interface";

import { diskStorage } from "multer";
import { extname } from "path";
import { randomUUID } from "crypto";

import { EventsService } from "../services/events.service";

import { CreateEventDto } from "../dto/create-event.dto";
import { UpdateEventDto } from "../dto/update-event.dto";
import { RsvpEventDto } from "../dto/rsvp-event.dto";
import { CancelEventDto } from "../dto/cancel-event.dto";
import { InviteEventDto } from "../dto/invite-event.dto";
import {
  DiscoverEventsQueryDto,
  EventSectionsQueryDto,
  ListEventsQueryDto,
} from "../dto/discover-events.dto";

import { EventRsvpStatus } from "../schemas/event.schema";

import { JwtAuthGuard } from "../../auth/jwt-auth.guard";

/* ============================================================================
   AUTHENTICATED REQUEST
============================================================================ */

interface AuthenticatedRequest extends Request {
  user: {
    id?: string;
    _id?: string;
    userId?: string;
    sub?: string;
  };
}

interface EventUploadedFiles {
  coverImageFile?: Express.Multer.File[];
  eventVideoFile?: Express.Multer.File[];
  videoFile?: Express.Multer.File[];
}

/* ============================================================================
   UPLOADS
   Same convention as before: files are written by Multer to
   ./uploads/events and served by the static /uploads handler in main.ts.
============================================================================ */

const ALLOWED_IMAGES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_VIDEOS = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
];

const EVENT_UPLOAD_FIELDS = [
  { name: "coverImageFile", maxCount: 1 },
  { name: "eventVideoFile", maxCount: 1 },
  { name: "videoFile", maxCount: 1 },
];

const EVENT_UPLOAD_OPTIONS: MulterOptions = {
  storage: diskStorage({
    destination: "./uploads/events",
    filename: (_req, file, callback) => {
      callback(null, `${Date.now()}-${randomUUID()}${extname(file.originalname).toLowerCase()}`);
    },
  }),
  limits: {
    // Per-type limits (10 MB images, 100 MB videos) are enforced in the service.
    fileSize: 100 * 1024 * 1024,
    files: 2,
  },
  fileFilter: (_req, file, callback) => {
    if (file.fieldname === "coverImageFile") {
      return ALLOWED_IMAGES.includes(file.mimetype)
        ? callback(null, true)
        : callback(new BadRequestException("Cover image must be JPG, PNG, or WebP."), false);
    }

    if (file.fieldname === "eventVideoFile" || file.fieldname === "videoFile") {
      return ALLOWED_VIDEOS.includes(file.mimetype)
        ? callback(null, true)
        : callback(
            new BadRequestException("Event video must be MP4, WebM, MOV, AVI, or MKV."),
            false,
          );
    }

    return callback(
      new BadRequestException(`Unsupported event upload field: ${file.fieldname}`),
      false,
    );
  },
};

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);

  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/* ============================================================================
   EVENTS CONTROLLER

   Every response that reflects an event's lifecycle is sent with
   Cache-Control: no-store, so no browser or proxy cache can serve an
   event after it has ended or been cancelled.
============================================================================ */

@Controller("events")
@UseGuards(JwtAuthGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  private getUserId(req: AuthenticatedRequest): string {
    const userId = req.user?.id ?? req.user?._id ?? req.user?.userId ?? req.user?.sub;

    if (!userId) {
      throw new BadRequestException("Authenticated user ID was not found.");
    }

    return String(userId);
  }

  /* ---------------------------------------------------------------- create */

  @Post()
  @UseInterceptors(FileFieldsInterceptor(EVENT_UPLOAD_FIELDS, EVENT_UPLOAD_OPTIONS))
  create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateEventDto,
    @UploadedFiles() files: EventUploadedFiles,
  ) {
    return this.eventsService.create(
      this.getUserId(req),
      dto,
      files?.coverImageFile?.[0],
      files?.eventVideoFile?.[0] ?? files?.videoFile?.[0],
    );
  }

  /* ------------------------------------------------------------ discovery */

  @Get()
  @Header("Cache-Control", "no-store")
  findAll(@Req() req: AuthenticatedRequest, @Query() query: ListEventsQueryDto) {
    return this.eventsService.findAll(this.getUserId(req), Boolean(query.includeEnded));
  }

  @Get("upcoming")
  @Header("Cache-Control", "no-store")
  upcoming(@Req() req: AuthenticatedRequest) {
    return this.eventsService.findUpcoming(this.getUserId(req));
  }

  @Get("discover")
  @Header("Cache-Control", "no-store")
  discover(@Req() req: AuthenticatedRequest, @Query() query: DiscoverEventsQueryDto) {
    return this.eventsService.discover(this.getUserId(req), query);
  }

  @Get("sections")
  @Header("Cache-Control", "no-store")
  sections(@Req() req: AuthenticatedRequest, @Query() query: EventSectionsQueryDto) {
    return this.eventsService.sections(this.getUserId(req), query);
  }

  @Get("nearby")
  @Header("Cache-Control", "no-store")
  nearby(
    @Req() req: AuthenticatedRequest,
    @Query("latitude") latitude: string,
    @Query("longitude") longitude: string,
    @Query("radiusKm") radiusKm?: string,
  ) {
    const lat = Number(latitude);
    const lon = Number(longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
      throw new BadRequestException("Valid latitude and longitude are required.");
    }

    const radius = radiusKm ? Number(radiusKm) : 50;

    return this.eventsService.findNearby(
      lat,
      lon,
      Number.isFinite(radius) ? radius : 50,
      this.getUserId(req),
    );
  }

  /* -------------------------------------------------------------- my lists */

  @Get("my-events")
  @Header("Cache-Control", "no-store")
  myEvents(@Req() req: AuthenticatedRequest) {
    return this.eventsService.myEvents(this.getUserId(req));
  }

  @Get("my-rsvps")
  @Header("Cache-Control", "no-store")
  myRsvps(@Req() req: AuthenticatedRequest) {
    return this.eventsService.myRsvps(this.getUserId(req));
  }

  /* --------------------------------------------------------------- details */

  @Get(":id/attendees")
  @Header("Cache-Control", "no-store")
  attendees(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Query("status") status?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.eventsService.attendees(id, this.getUserId(req), {
      status,
      page: positiveInt(page, 1),
      limit: positiveInt(limit, 30),
    });
  }

  @Get(":id/related")
  @Header("Cache-Control", "no-store")
  related(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Query("limit") limit?: string,
  ) {
    return this.eventsService.related(id, this.getUserId(req), positiveInt(limit, 6));
  }

  @Get(":id")
  @Header("Cache-Control", "no-store")
  findOne(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.eventsService.findOne(id, this.getUserId(req));
  }

  /* ------------------------------------------------------- owner actions */

  @Patch(":id")
  @UseInterceptors(FileFieldsInterceptor(EVENT_UPLOAD_FIELDS, EVENT_UPLOAD_OPTIONS))
  update(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() dto: UpdateEventDto,
    @UploadedFiles() files: EventUploadedFiles,
  ) {
    return this.eventsService.update(
      this.getUserId(req),
      id,
      dto,
      files?.coverImageFile?.[0],
      files?.eventVideoFile?.[0] ?? files?.videoFile?.[0],
    );
  }

  @Patch(":id/cancel")
  cancel(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() dto: CancelEventDto,
  ) {
    return this.eventsService.cancel(this.getUserId(req), id, dto?.reason);
  }

  @Delete(":id")
  remove(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.eventsService.remove(this.getUserId(req), id);
  }

  @Post(":id/invite")
  invite(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() dto: InviteEventDto,
  ) {
    return this.eventsService.invite(this.getUserId(req), id, dto.userIds);
  }

  /* ------------------------------------------------------------------ RSVP */

  @Post(":id/rsvp")
  rsvp(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() dto: RsvpEventDto,
  ) {
    const status =
      dto?.status ?? (dto?.interested ? EventRsvpStatus.INTERESTED : EventRsvpStatus.GOING);

    return this.eventsService.rsvp(this.getUserId(req), id, status);
  }

  @Delete(":id/rsvp")
  cancelRsvp(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.eventsService.cancelRsvp(this.getUserId(req), id);
  }
}
