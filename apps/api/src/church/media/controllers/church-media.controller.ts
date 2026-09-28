/**
 * church-media.controller.ts
 * REST surface for the Documents & Media library, mounted under
 * /organizations/:organizationId/media.
 *
 * Matches:
 * web/src/features/church/pages/ChurchMediaPage.tsx
 * web/src/features/church/admin/ChurchSettings.tsx
 *
 * IMPORTANT:
 * Do not extend Express Request with AuthUser here.
 * The application's Express Request.user type is already declared globally.
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
} from "@nestjs/common";

import type { Request } from "express";

import {
  ChurchMediaService,
  type ListMediaQuery,
} from "../services/church-media.service";

import { CreateMediaDto } from "../dto/create-media.dto";

import type {
  AuthUser,
} from "../../members/services/members.service";

/* ============================================================================
   AUTHENTICATION HELPER
   ========================================================================== */

/**
 * Extract the authenticated user's ID from the application's
 * existing Express Request.user declaration.
 *
 * We intentionally do NOT create:
 *
 * interface AuthenticatedRequest extends Request {
 *   user?: AuthUser;
 * }
 *
 * because the existing Express Request.user type has a different shape,
 * which causes TS2430.
 */
function getAuthenticatedUserId(
  req: Request,
): string {
  const user =
    req.user as AuthUser | undefined;

  if (!user?.id) {
    throw new Error(
      "Authenticated user ID is required.",
    );
  }

  return user.id;
}

/* ============================================================================
   CONTROLLER
   ========================================================================== */

@Controller(
  "organizations/:organizationId/media",
)
export class ChurchMediaController {
  constructor(
    private readonly mediaService: ChurchMediaService,
  ) {}

  /* ==========================================================================
     LIST MEDIA
     ========================================================================== */

  @Get()
  list(
    @Param("organizationId")
    organizationId: string,

    @Query()
    query: ListMediaQuery,
  ) {
    return this.mediaService.listByOrganization(
      organizationId,
      {
        page: query.page
          ? Number(query.page)
          : undefined,

        pageSize: query.pageSize
          ? Number(query.pageSize)
          : undefined,

        search: query.search,

        mediaType: query.mediaType,
      },
    );
  }

  /* ==========================================================================
     GET ONE
     ========================================================================== */

  @Get(":mediaId")
  getOne(
    @Param("organizationId")
    organizationId: string,

    @Param("mediaId")
    mediaId: string,
  ) {
    return this.mediaService.getById(
      organizationId,
      mediaId,
    );
  }

  /* ==========================================================================
     CREATE
     ========================================================================== */

  @Post()
  create(
    @Param("organizationId")
    organizationId: string,

    @Body()
    dto: CreateMediaDto,

    @Req()
    req: Request,
  ) {
    const userId =
      getAuthenticatedUserId(req);

    return this.mediaService.create(
      organizationId,
      dto,
      userId,
    );
  }

  /* ==========================================================================
     DELETE
     ========================================================================== */

  @Delete(":mediaId")
  remove(
    @Param("organizationId")
    organizationId: string,

    @Param("mediaId")
    mediaId: string,

    @Req()
    req: Request,
  ) {
    const userId =
      getAuthenticatedUserId(req);

    return this.mediaService.remove(
      organizationId,
      mediaId,
      userId,
    );
  }
}