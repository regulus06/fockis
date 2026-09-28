import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";

import { AuthGuard } from "@nestjs/passport";

import type { Request } from "express";

import { OrganizationIdentityService } from "./services/organization-identity.service";

import { CreateManagedUserDto } from "./dto/create-managed-user.dto";
import { UpdateManagedUserDto } from "./dto/update-managed-user.dto";
import { UpdateSecurityPolicyDto } from "./dto/update-security-policy.dto";
import { CreateDomainDto } from "./dto/create-domain.dto";

// ============================================================================
// AUTHENTICATED REQUEST
// ============================================================================

interface AuthenticatedRequest extends Request {
  user?: {
    id?: string;
    _id?: string;
    userId?: string;
    sub?: string;
  };
}

// ============================================================================
// CONTROLLER
// ============================================================================

@Controller("organizations/:organizationId/identity")
@UseGuards(AuthGuard("jwt"))
export class OrganizationIdentityController {
  constructor(
    private readonly organizationIdentityService: OrganizationIdentityService,
  ) {}

  // ==========================================================================
  // STATS
  // ==========================================================================

  @Get("stats")
  async getStats(
    @Param("organizationId") organizationId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const actorUserId = this.getActorUserId(req);

    return this.organizationIdentityService.getStats(
      organizationId,
      actorUserId,
    );
  }

  // ==========================================================================
  // USERS
  // ==========================================================================

  @Get("users")
  async getUsers(
    @Param("organizationId") organizationId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const actorUserId = this.getActorUserId(req);

    return this.organizationIdentityService.getUsers(
      organizationId,
      actorUserId,
    );
  }

  // --------------------------------------------------------------------------
  // GET SINGLE USER
  // --------------------------------------------------------------------------

  @Get("users/:userId")
  async getUser(
    @Param("organizationId") organizationId: string,
    @Param("userId") userId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const actorUserId = this.getActorUserId(req);

    return this.organizationIdentityService.getUser(
      organizationId,
      userId,
      actorUserId,
    );
  }

  // --------------------------------------------------------------------------
  // CREATE USER
  // --------------------------------------------------------------------------

  @Post("users")
  async createUser(
    @Param("organizationId") organizationId: string,
    @Body() dto: CreateManagedUserDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const actorUserId = this.getActorUserId(req);

    return this.organizationIdentityService.createUser(
      organizationId,
      dto,
      actorUserId,
    );
  }

  // --------------------------------------------------------------------------
  // UPDATE USER
  // --------------------------------------------------------------------------

  @Patch("users/:userId")
  async updateUser(
    @Param("organizationId") organizationId: string,
    @Param("userId") userId: string,
    @Body() dto: UpdateManagedUserDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const actorUserId = this.getActorUserId(req);

    return this.organizationIdentityService.updateUser(
      organizationId,
      userId,
      dto,
      actorUserId,
    );
  }

  // --------------------------------------------------------------------------
  // SUSPEND USER
  // --------------------------------------------------------------------------

  @Post("users/:userId/suspend")
  async suspendUser(
    @Param("organizationId") organizationId: string,
    @Param("userId") userId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const actorUserId = this.getActorUserId(req);

    return this.organizationIdentityService.suspendUser(
      organizationId,
      userId,
      actorUserId,
    );
  }

  // --------------------------------------------------------------------------
  // RESTORE USER
  // --------------------------------------------------------------------------

  @Post("users/:userId/restore")
  async restoreUser(
    @Param("organizationId") organizationId: string,
    @Param("userId") userId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const actorUserId = this.getActorUserId(req);

    return this.organizationIdentityService.restoreUser(
      organizationId,
      userId,
      actorUserId,
    );
  }

  // --------------------------------------------------------------------------
  // RESET PASSWORD
  // --------------------------------------------------------------------------

  @Post("users/:userId/reset-password")
  async resetPassword(
    @Param("organizationId") organizationId: string,
    @Param("userId") userId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const actorUserId = this.getActorUserId(req);

    return this.organizationIdentityService.resetPassword(
      organizationId,
      userId,
      actorUserId,
    );
  }

  // --------------------------------------------------------------------------
  // RESEND ACTIVATION
  // --------------------------------------------------------------------------

  @Post("users/:userId/resend-activation")
  async resendActivation(
    @Param("organizationId") organizationId: string,
    @Param("userId") userId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const actorUserId = this.getActorUserId(req);

    return this.organizationIdentityService.resendActivation(
      organizationId,
      userId,
      actorUserId,
    );
  }

  // --------------------------------------------------------------------------
  // REMOVE USER
  // --------------------------------------------------------------------------

  @Delete("users/:userId")
  async removeUser(
    @Param("organizationId") organizationId: string,
    @Param("userId") userId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const actorUserId = this.getActorUserId(req);

    return this.organizationIdentityService.removeUser(
      organizationId,
      userId,
      actorUserId,
    );
  }

  // ==========================================================================
  // DOMAINS
  // ==========================================================================

  // --------------------------------------------------------------------------
  // LIST DOMAINS
  // --------------------------------------------------------------------------

  /**
   * List all domains belonging to this organization.
   *
   * Optional filters:
   *
   * ?domainType=organization
   *
   * ?domainType=member
   *
   * ?parentDomainId=...
   *
   * Examples:
   *
   * springfieldchurch.fockis.com
   *
   * john.springfieldchurch.fockis.com
   *
   * mary.springfieldchurch.fockis.com
   */

  @Get("domains")
  async getDomains(
    @Param("organizationId") organizationId: string,

    @Query("domainType")
    domainType: "organization" | "member" | undefined,

    @Query("parentDomainId")
    parentDomainId: string | undefined,

    @Req() req: AuthenticatedRequest,
  ) {
    const actorUserId = this.getActorUserId(req);

    const domains = await this.organizationIdentityService.getDomains(
      organizationId,
      actorUserId,
    );

    // Preserve compatibility with existing service responses.
    if (!domainType && !parentDomainId) {
      return domains;
    }

    return (domains as any[]).filter((domain) => {
      if (
        domainType &&
        domain.domainType !== domainType
      ) {
        return false;
      }

      if (
        parentDomainId &&
        String(domain.parentDomainId ?? "") !==
          String(parentDomainId)
      ) {
        return false;
      }

      return true;
    });
  }

  // --------------------------------------------------------------------------
  // CHECK DOMAIN AVAILABILITY
  // --------------------------------------------------------------------------

  @Get("domains/check-availability")
  async checkDomainAvailability(
    @Param("organizationId") organizationId: string,

    @Query("domain")
    domain: string,

    @Query("domainType")
    domainType: "organization" | "member" | undefined,

    @Query("parentDomainId")
    parentDomainId: string | undefined,

    @Req() req: AuthenticatedRequest,
  ) {
    const actorUserId = this.getActorUserId(req);

    const result =
      await this.organizationIdentityService.checkDomainAvailability(
        organizationId,
        domain,
        actorUserId,
      );

    return {
      ...result,
      domainType: domainType ?? null,
      parentDomainId: parentDomainId ?? null,
    };
  }

  // --------------------------------------------------------------------------
  // ADD DOMAIN
  // --------------------------------------------------------------------------

  /**
   * Create an organization base domain:
   *
   * {
   *   "domain": "springfieldchurch.fockis.com",
   *   "domainType": "organization"
   * }
   *
   * Create a member domain:
   *
   * {
   *   "domain": "john.springfieldchurch.fockis.com",
   *   "domainType": "member",
   *   "parentDomainId": "BASE_DOMAIN_ID",
   *   "assignedUserId": "USER_ID",
   *   "assignedMembershipId": "MEMBERSHIP_ID"
   * }
   */

  @Post("domains")
  async addDomain(
    @Param("organizationId") organizationId: string,

    @Body()
    dto: CreateDomainDto,

    @Req() req: AuthenticatedRequest,
  ) {
    const actorUserId = this.getActorUserId(req);

    return this.organizationIdentityService.addDomain(
      organizationId,
      dto,
      actorUserId,
    );
  }

  // --------------------------------------------------------------------------
  // VERIFY DOMAIN
  // --------------------------------------------------------------------------

  @Post("domains/:domainId/verify")
  async verifyDomain(
    @Param("organizationId") organizationId: string,

    @Param("domainId") domainId: string,

    @Req() req: AuthenticatedRequest,
  ) {
    const actorUserId = this.getActorUserId(req);

    return this.organizationIdentityService.verifyDomain(
      organizationId,
      domainId,
      actorUserId,
    );
  }

  // --------------------------------------------------------------------------
  // REMOVE DOMAIN
  // --------------------------------------------------------------------------

  @Delete("domains/:domainId")
  async removeDomain(
    @Param("organizationId") organizationId: string,

    @Param("domainId") domainId: string,

    @Req() req: AuthenticatedRequest,
  ) {
    const actorUserId = this.getActorUserId(req);

    return this.organizationIdentityService.removeDomain(
      organizationId,
      domainId,
      actorUserId,
    );
  }

  // ==========================================================================
  // SECURITY
  // ==========================================================================

  // --------------------------------------------------------------------------
  // GET SECURITY POLICY
  // --------------------------------------------------------------------------

  @Get("security")
  async getSecurityPolicy(
    @Param("organizationId") organizationId: string,

    @Req() req: AuthenticatedRequest,
  ) {
    const actorUserId = this.getActorUserId(req);

    return this.organizationIdentityService.getSecurityPolicy(
      organizationId,
      actorUserId,
    );
  }

  // --------------------------------------------------------------------------
  // UPDATE SECURITY POLICY
  // --------------------------------------------------------------------------

  @Patch("security")
  async updateSecurityPolicy(
    @Param("organizationId") organizationId: string,

    @Body()
    dto: UpdateSecurityPolicyDto,

    @Req() req: AuthenticatedRequest,
  ) {
    const actorUserId = this.getActorUserId(req);

    return this.organizationIdentityService.updateSecurityPolicy(
      organizationId,
      dto,
      actorUserId,
    );
  }

  // ==========================================================================
  // AUTH USER
  // ==========================================================================

  private getActorUserId(
    req: AuthenticatedRequest,
  ): string {
    const user = req.user;

    const userId =
      user?.id ??
      user?._id ??
      user?.userId ??
      user?.sub;

    if (!userId) {
      throw new ForbiddenException(
        "Authenticated request does not contain a user ID.",
      );
    }

    return String(userId);
  }
}