/**
 * members.controller.ts
 * -----------------------------------------------------------------------------
 * REST surface for Member management, mounted under:
 *
 *   /organizations/:organizationId/members
 *
 * IMPORTANT
 * -----------------------------------------------------------------------------
 *
 * Authentication:
 *   The authenticated application user comes from req.user.
 *
 * Authorization:
 *   MembersService is the source of truth.
 *
 * The controller does NOT decide:
 *
 *   - who owns the organization
 *   - who is an administrator
 *   - who has a ChurchPermission
 *   - who can modify members
 *   - who can manage administrators
 *   - who can manage permissions
 *
 * Those decisions belong to MembersService.
 *
 * OWNER
 * -----------------------------------------------------------------------------
 *
 * Organization ownership is determined ONLY from:
 *
 *   Organization.createdByUserId
 *
 * The organization owner:
 *
 *   - always has organization authority
 *   - is automatically treated as Administrator
 *   - bypasses ChurchPermission checks
 *   - cannot be removed
 *   - cannot be demoted
 *   - cannot be deactivated
 *
 * OWNER RECOVERY
 * -----------------------------------------------------------------------------
 *
 * POST /organizations/:organizationId/members/recover-owner
 *
 * Restores the original organization creator's membership as an active
 * Administrator.
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
  UnauthorizedException,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";

import type { Request } from "express";

import { IsEnum } from "class-validator";

import {
  MembersService,
  type ListMembersQuery,
} from "../services/members.service";

import { AddMemberDto } from "../dto/add-member.dto";
import { UpdateMemberDto } from "../dto/update-member.dto";
import { UpdateMemberRoleDto } from "../dto/update-member-role.dto";

import { MembershipStatus } from "../../enums/membership-status.enum";

/* ============================================================================
   STATUS DTO
============================================================================ */

class UpdateMembershipStatusDto {
  @IsEnum(MembershipStatus)
  status!: MembershipStatus;
}

/* ============================================================================
   AUTHENTICATION
============================================================================ */

/**
 * Gets the authenticated application user ID.
 *
 * The JWT authentication layer should already have populated req.user.
 *
 * This helper intentionally does NOT determine:
 *
 *   - organization ownership
 *   - organization role
 *   - Church permissions
 *
 * Those decisions belong to MembersService.
 */
function getAuthenticatedUserId(req: Request): string {
  const user = req.user;

  if (!user?.id) {
    throw new UnauthorizedException(
      "Authenticated user ID is required.",
    );
  }

  return String(user.id);
}

/**
 * Gets an optional authenticated application user ID.
 *
 * Used by endpoints where MembersService supports both:
 *
 *   - authenticated users
 *   - unauthenticated/public reads
 *
 * Authorization decisions remain inside MembersService.
 */
function getOptionalAuthenticatedUserId(
  req: Request,
): string | undefined {
  if (!req.user?.id) {
    return undefined;
  }

  return String(req.user.id);
}

/* ============================================================================
   CONTROLLER
============================================================================ */

@Controller("organizations/:organizationId/members")
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
  }),
)
export class MembersController {
  constructor(
    private readonly membersService: MembersService,
  ) {}

  /* ==========================================================================
     LIST MEMBERS
  ========================================================================== */

  /**
   * GET:
   *
   * /organizations/:organizationId/members
   *
   * MembersService performs the authorization check.
   */
  @Get()
  async list(
    @Param("organizationId")
    organizationId: string,

    @Query()
    query: ListMembersQuery,

    @Req()
    req: Request,
  ) {
    return this.membersService.list(
      organizationId,
      {
        ...query,

        page:
          query.page !== undefined
            ? Number(query.page)
            : undefined,

        pageSize:
          query.pageSize !== undefined
            ? Number(query.pageSize)
            : undefined,
      },

      getOptionalAuthenticatedUserId(req),
    );
  }

  /* ==========================================================================
     MY MEMBERSHIP
  ========================================================================== */

  /**
   * GET:
   *
   * /organizations/:organizationId/members/me
   *
   * Returns the authenticated user's organization membership and the
   * authorization summary calculated by MembersService.
   */
  @Get("me")
  async getMine(
    @Param("organizationId")
    organizationId: string,

    @Req()
    req: Request,
  ) {
    const userId = getAuthenticatedUserId(req);

    const membership =
      await this.membersService.getMyMembership(
        organizationId,
        userId,
      );

    return {
      membership,

      isAdmin:
        Boolean(membership?.isAdmin),

      canApproveMembers:
        Boolean(
          membership?.canApproveMembers,
        ),
    };
  }

  /* ==========================================================================
     ADMIN DASHBOARD ACCESS
  ========================================================================== */

  /**
   * GET:
   *
   * /organizations/:organizationId/members/me/admin-access
   *
   * Backend authorization check for entering the Church Administration
   * Dashboard.
   *
   * IMPORTANT:
   *
   * The frontend must NOT determine administrator access from the JWT.
   *
   * MembersService determines:
   *
   *   1. Whether the authenticated user belongs to the organization.
   *   2. Whether the membership is Active.
   *   3. Whether the user is the organization owner.
   *   4. Whether the user has Administrator-level organization authority.
   *
   * If access is denied, MembersService throws ForbiddenException.
   *
   * If access is granted, the frontend receives the authorization summary.
   *
   * Individual administration operations remain protected by their
   * corresponding service-layer authorization checks.
   */
  @Get("me/admin-access")
  async getMyAdminAccess(
    @Param("organizationId")
    organizationId: string,

    @Req()
    req: Request,
  ) {
    const userId = getAuthenticatedUserId(req);

    return this.membersService.requireAdminDashboardAccess(
      organizationId,
      userId,
    );
  }

  /* ==========================================================================
     RECOVER ORGANIZATION OWNER
  ========================================================================== */

  /**
   * POST:
   *
   * /organizations/:organizationId/members/recover-owner
   *
   * Recovers ONLY the organization creator.
   *
   * ensureOwnerMembership() determines the actual owner using:
   *
   *   Organization.createdByUserId
   *
   * The controller performs an additional defense-in-depth identity check.
   *
   * This does NOT allow an arbitrary administrator to recover another user.
   */
  @Post("recover-owner")
  async recoverOwner(
    @Param("organizationId")
    organizationId: string,

    @Req()
    req: Request,
  ) {
    const userId = getAuthenticatedUserId(req);

    const membership =
      await this.membersService.ensureOwnerMembership(
        organizationId,
      );

    /**
     * Defense-in-depth identity check.
     *
     * Only the original organization creator may use this recovery endpoint.
     */
    if (
      String(membership.userId) !==
      String(userId)
    ) {
      throw new UnauthorizedException(
        "You are not the creator of this organization.",
      );
    }

    return {
      success: true,

      message:
        "Organization administrator access restored.",

      membership,

      isAdmin: true,

      canApproveMembers: true,
    };
  }

  /* ==========================================================================
     GET ONE MEMBER
  ========================================================================== */

  /**
   * GET:
   *
   * /organizations/:organizationId/members/:memberId
   */
  @Get(":memberId")
  async getOne(
    @Param("organizationId")
    organizationId: string,

    @Param("memberId")
    memberId: string,

    @Req()
    req: Request,
  ) {
    return this.membersService.getById(
      organizationId,
      memberId,
      getOptionalAuthenticatedUserId(req),
    );
  }

  /* ==========================================================================
     ADD MEMBER
  ========================================================================== */

  /**
   * POST:
   *
   * /organizations/:organizationId/members
   *
   * MembersService determines whether the authenticated user is allowed
   * to add the requested member.
   */
  @Post()
  async add(
    @Param("organizationId")
    organizationId: string,

    @Body()
    dto: AddMemberDto,

    @Req()
    req: Request,
  ) {
    const userId = getAuthenticatedUserId(req);

    return this.membersService.add(
      organizationId,
      dto,
      userId,
    );
  }

  /* ==========================================================================
     UPDATE MEMBER
  ========================================================================== */

  /**
   * PATCH:
   *
   * /organizations/:organizationId/members/:memberId
   *
   * MembersService determines whether the authenticated user can update
   * this membership.
   */
  @Patch(":memberId")
  async update(
    @Param("organizationId")
    organizationId: string,

    @Param("memberId")
    memberId: string,

    @Body()
    dto: UpdateMemberDto,

    @Req()
    req: Request,
  ) {
    const userId = getAuthenticatedUserId(req);

    return this.membersService.update(
      organizationId,
      memberId,
      dto,
      userId,
    );
  }

  /* ==========================================================================
     ACCEPT MEMBERSHIP REQUEST
  ========================================================================== */

  /**
   * POST:
   *
   * /organizations/:organizationId/members/:memberId/accept
   */
  @Post(":memberId/accept")
  async accept(
    @Param("organizationId")
    organizationId: string,

    @Param("memberId")
    memberId: string,

    @Req()
    req: Request,
  ) {
    const userId = getAuthenticatedUserId(req);

    const membership =
      await this.membersService.acceptMembership(
        organizationId,
        memberId,
        userId,
      );

    return {
      success: true,

      message:
        "Membership request accepted.",

      membership,
    };
  }

  /* ==========================================================================
     REJECT MEMBERSHIP REQUEST
  ========================================================================== */

  /**
   * POST:
   *
   * /organizations/:organizationId/members/:memberId/reject
   */
  @Post(":memberId/reject")
  async reject(
    @Param("organizationId")
    organizationId: string,

    @Param("memberId")
    memberId: string,

    @Req()
    req: Request,
  ) {
    const userId = getAuthenticatedUserId(req);

    const membership =
      await this.membersService.rejectMembership(
        organizationId,
        memberId,
        userId,
      );

    return {
      success: true,

      message:
        "Membership request rejected.",

      membership,
    };
  }

  /* ==========================================================================
     UPDATE MEMBERSHIP STATUS
  ========================================================================== */

  /**
   * PATCH:
   *
   * /organizations/:organizationId/members/:memberId/status
   */
  @Patch(":memberId/status")
  async updateStatus(
    @Param("organizationId")
    organizationId: string,

    @Param("memberId")
    memberId: string,

    @Body()
    dto: UpdateMembershipStatusDto,

    @Req()
    req: Request,
  ) {
    const userId = getAuthenticatedUserId(req);

    if (!dto.status) {
      throw new BadRequestException(
        "Membership status is required.",
      );
    }

    return this.membersService.updateStatus(
      organizationId,
      memberId,
      dto.status,
      userId,
    );
  }

  /* ==========================================================================
     UPDATE ROLE
  ========================================================================== */

  /**
   * PATCH:
   *
   * /organizations/:organizationId/members/:memberId/role
   *
   * MembersService is responsible for preventing:
   *
   *   - owner demotion
   *   - unauthorized administrator changes
   *   - unauthorized role changes
   */
  @Patch(":memberId/role")
  async updateRole(
    @Param("organizationId")
    organizationId: string,

    @Param("memberId")
    memberId: string,

    @Body()
    dto: UpdateMemberRoleDto,

    @Req()
    req: Request,
  ) {
    const userId = getAuthenticatedUserId(req);

    if (!dto.role) {
      throw new BadRequestException(
        "Member role is required.",
      );
    }

    return this.membersService.updateRole(
      organizationId,
      memberId,
      dto.role,
      userId,
    );
  }

  /* ==========================================================================
     REMOVE MEMBER
  ========================================================================== */

  /**
   * DELETE:
   *
   * /organizations/:organizationId/members/:memberId
   *
   * MembersService is responsible for preventing removal of the
   * organization owner.
   */
  @Delete(":memberId")
  async remove(
    @Param("organizationId")
    organizationId: string,

    @Param("memberId")
    memberId: string,

    @Req()
    req: Request,
  ) {
    const userId = getAuthenticatedUserId(req);

    await this.membersService.remove(
      organizationId,
      memberId,
      userId,
    );

    return {
      success: true,

      message:
        "Member removed successfully.",
    };
  }
}