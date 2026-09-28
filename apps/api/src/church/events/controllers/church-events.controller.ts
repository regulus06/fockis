/**
 * church-events.controller.ts
 * ---------------------------------------------------------------------------
 * REST surface for Events, mounted under:
 *
 * /organizations/:organizationId/events
 *
 * Matches the Fockis Church frontend events API contract.
 * ---------------------------------------------------------------------------
 */

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
} from "@nestjs/common";

import type { Request } from "express";

import { IsEnum } from "class-validator";

import {
  ChurchEventsService,
  type ListEventsQuery,
} from "../services/church-events.service";

import { CreateEventDto } from "../dto/create-event.dto";
import { UpdateEventDto } from "../dto/update-event.dto";

import {
  RsvpStatus,
} from "../schemas/church-event.schema";

import type {
  AuthUser,
} from "../../members/services/members.service";

import { Types } from "mongoose";

/* ============================================================================
   INLINE RSVP DTO
   ========================================================================== */

class RsvpDto {
  @IsEnum(RsvpStatus)
  status!: RsvpStatus;
}

/* ============================================================================
   QUERY TYPE
   ========================================================================== */

/**
 * HTTP query parameters arrive as strings.
 *
 * NestJS/Express can also expose boolean values depending on
 * transformation/configuration, so mineOnly supports both.
 */
type ChurchEventsHttpQuery =
  Omit<ListEventsQuery, "mineOnly"> & {
    mineOnly?: string | boolean;
  };

/* ============================================================================
   AUTHENTICATION / VALIDATION HELPERS
   ========================================================================== */

/**
 * Validates an organization MongoDB ObjectId.
 */
function getOrganizationId(
  value: string,
): string {
  const organizationId =
    value?.trim();

  if (
    !organizationId ||
    !Types.ObjectId.isValid(
      organizationId,
    )
  ) {
    throw new BadRequestException(
      "organizationId must be a valid identifier.",
    );
  }

  return organizationId;
}

/**
 * Validates an event MongoDB ObjectId.
 */
function getEventId(
  value: string,
): string {
  const eventId =
    value?.trim();

  if (
    !eventId ||
    !Types.ObjectId.isValid(
      eventId,
    )
  ) {
    throw new BadRequestException(
      "eventId must be a valid identifier.",
    );
  }

  return eventId;
}

/**
 * Reads the authenticated user's MongoDB ID.
 */
function getAuthenticatedUserId(
  req: Request,
): string {
  const user =
    req.user as AuthUser | undefined;

  const userId =
    user?.id?.trim();

  if (!userId) {
    throw new BadRequestException(
      "Authenticated user ID is required.",
    );
  }

  if (
    !Types.ObjectId.isValid(userId)
  ) {
    throw new BadRequestException(
      "Authenticated user ID must be a valid identifier.",
    );
  }

  return userId;
}

/**
 * Converts an HTTP query value into a boolean.
 *
 * Supports:
 *
 *   true
 *   "true"
 *   false
 *   "false"
 *
 * Undefined stays undefined.
 */
function parseBoolean(
  value: unknown,
): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === true) {
    return true;
  }

  if (value === false) {
    return false;
  }

  if (typeof value === "string") {
    const normalized =
      value.trim().toLowerCase();

    if (normalized === "true") {
      return true;
    }

    if (normalized === "false") {
      return false;
    }
  }

  throw new BadRequestException(
    "mineOnly must be true or false.",
  );
}

/* ============================================================================
   CONTROLLER
   ========================================================================== */

@Controller(
  "organizations/:organizationId/events",
)
export class ChurchEventsController {
  constructor(
    private readonly eventsService: ChurchEventsService,
  ) {}

  /* ==========================================================================
     LIST EVENTS
     ========================================================================== */

  @Get()
  list(
    @Param("organizationId")
    rawOrganizationId: string,

    @Query()
    query: ChurchEventsHttpQuery,

    @Req()
    req: Request,
  ) {
    const organizationId =
      getOrganizationId(
        rawOrganizationId,
      );

    const mineOnly =
      parseBoolean(
        query.mineOnly,
      );

    return this.eventsService.listByOrganization(
      organizationId,
      {
        page:
          query.page !== undefined
            ? Number(query.page)
            : undefined,

        pageSize:
          query.pageSize !== undefined
            ? Number(query.pageSize)
            : undefined,

        search:
          query.search,

        eventType:
          query.eventType,

        departmentId:
          query.departmentId,

        groupId:
          query.groupId,

        branchId:
          query.branchId,

        from:
          query.from,

        to:
          query.to,

        mineOnly,
      },

      getAuthenticatedUserId(req),
    );
  }

  /* ==========================================================================
     GET ONE
     ========================================================================== */

  @Get(":eventId")
  getOne(
    @Param("organizationId")
    rawOrganizationId: string,

    @Param("eventId")
    rawEventId: string,

    @Req()
    req: Request,
  ) {
    const organizationId =
      getOrganizationId(
        rawOrganizationId,
      );

    const eventId =
      getEventId(
        rawEventId,
      );

    return this.eventsService.getById(
      organizationId,
      eventId,
      getAuthenticatedUserId(req),
    );
  }

  /* ==========================================================================
     CREATE
     ========================================================================== */

  @Post()
  create(
    @Param("organizationId")
    rawOrganizationId: string,

    @Body()
    dto: CreateEventDto,

    @Req()
    req: Request,
  ) {
    const organizationId =
      getOrganizationId(
        rawOrganizationId,
      );

    return this.eventsService.create(
      organizationId,
      dto,
      getAuthenticatedUserId(req),
    );
  }

  /* ==========================================================================
     UPDATE
     ========================================================================== */

  @Patch(":eventId")
  update(
    @Param("organizationId")
    rawOrganizationId: string,

    @Param("eventId")
    rawEventId: string,

    @Body()
    dto: UpdateEventDto,

    @Req()
    req: Request,
  ) {
    const organizationId =
      getOrganizationId(
        rawOrganizationId,
      );

    const eventId =
      getEventId(
        rawEventId,
      );

    return this.eventsService.update(
      organizationId,
      eventId,
      dto,
      getAuthenticatedUserId(req),
    );
  }

  /* ==========================================================================
     DELETE
     ========================================================================== */

  @Delete(":eventId")
  remove(
    @Param("organizationId")
    rawOrganizationId: string,

    @Param("eventId")
    rawEventId: string,

    @Req()
    req: Request,
  ) {
    const organizationId =
      getOrganizationId(
        rawOrganizationId,
      );

    const eventId =
      getEventId(
        rawEventId,
      );

    return this.eventsService.remove(
      organizationId,
      eventId,
      getAuthenticatedUserId(req),
    );
  }

  /* ==========================================================================
     RSVP
     ========================================================================== */

  @Post(":eventId/rsvp")
  rsvp(
    @Param("organizationId")
    rawOrganizationId: string,

    @Param("eventId")
    rawEventId: string,

    @Body()
    dto: RsvpDto,

    @Req()
    req: Request,
  ) {
    const organizationId =
      getOrganizationId(
        rawOrganizationId,
      );

    const eventId =
      getEventId(
        rawEventId,
      );

    return this.eventsService.rsvp(
      organizationId,
      eventId,
      getAuthenticatedUserId(req),
      dto.status,
    );
  }

  /* ==========================================================================
     CANCEL RSVP
     ========================================================================== */

  @Delete(":eventId/rsvp")
  cancelRsvp(
    @Param("organizationId")
    rawOrganizationId: string,

    @Param("eventId")
    rawEventId: string,

    @Req()
    req: Request,
  ) {
    const organizationId =
      getOrganizationId(
        rawOrganizationId,
      );

    const eventId =
      getEventId(
        rawEventId,
      );

    return this.eventsService.cancelRsvp(
      organizationId,
      eventId,
      getAuthenticatedUserId(req),
    );
  }
}