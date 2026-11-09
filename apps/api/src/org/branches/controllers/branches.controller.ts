/**
 * branches.controller.ts
 * -----------------------------------------------------------------------------
 * REST surface for Branches / Locations, mounted under
 * /organizations/:organizationId/branches.
 *
 * These routes are used by the Church admin console for branch management.
 * -----------------------------------------------------------------------------
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from "@nestjs/common";

import { BranchesService } from "../services/branches.service";
import { CreateBranchDto } from "../dto/create-branch.dto";
import { UpdateBranchDto } from "../dto/update-branch.dto";
import type { AuthUser } from "../../members/services/members.service";

/**
 * Local request shape.
 *
 * Do NOT extend Express Request with AuthUser.
 * The application's Express Request.user declaration has a different shape,
 * which causes TS2430 when AuthUser is used directly.
 */
type AuthenticatedRequest = {
  user?: AuthUser;
};

/**
 * Safely get the authenticated user's ID.
 */
function getAuthenticatedUserId(
  req: AuthenticatedRequest,
): string {
  const userId = req.user?.id;

  if (!userId) {
    throw new Error(
      "Authenticated user ID is required.",
    );
  }

  return userId;
}

@Controller("organizations/:organizationId/branches")
export class BranchesController {
  constructor(
    private readonly branchesService: BranchesService,
  ) {}

  /* ==========================================================================
     LIST
  ========================================================================== */

  @Get()
  list(
    @Param("organizationId")
    organizationId: string,
  ) {
    return this.branchesService.listByOrganization(
      organizationId,
    );
  }

  /* ==========================================================================
     GET ONE
  ========================================================================== */

  @Get(":branchId")
  getOne(
    @Param("organizationId")
    organizationId: string,

    @Param("branchId")
    branchId: string,
  ) {
    return this.branchesService.getById(
      organizationId,
      branchId,
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
    dto: CreateBranchDto,

    @Req()
    req: AuthenticatedRequest,
  ) {
    return this.branchesService.create(
      organizationId,
      dto,
      getAuthenticatedUserId(req),
    );
  }

  /* ==========================================================================
     UPDATE
  ========================================================================== */

  @Patch(":branchId")
  update(
    @Param("organizationId")
    organizationId: string,

    @Param("branchId")
    branchId: string,

    @Body()
    dto: UpdateBranchDto,

    @Req()
    req: AuthenticatedRequest,
  ) {
    return this.branchesService.update(
      organizationId,
      branchId,
      dto,
      getAuthenticatedUserId(req),
    );
  }

  /* ==========================================================================
     DELETE
  ========================================================================== */

  @Delete(":branchId")
  remove(
    @Param("organizationId")
    organizationId: string,

    @Param("branchId")
    branchId: string,

    @Req()
    req: AuthenticatedRequest,
  ) {
    return this.branchesService.remove(
      organizationId,
      branchId,
      getAuthenticatedUserId(req),
    );
  }
}