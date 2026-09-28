/**
 * church-groups.controller.ts
 * -----------------------------------------------------------------------------
 * FOCKIS CHURCH — GROUPS CONTROLLER
 *
 * Mounted under:
 *
 *   /organizations/:organizationId/groups
 *
 * Supported routes:
 *
 *   GET    /organizations/:organizationId/groups
 *   GET    /organizations/:organizationId/groups/:groupId
 *   POST   /organizations/:organizationId/groups
 *   PATCH  /organizations/:organizationId/groups/:groupId
 *   DELETE /organizations/:organizationId/groups/:groupId
 *
 *   POST   /organizations/:organizationId/groups/:groupId/join
 *   POST   /organizations/:organizationId/groups/:groupId/leave
 *
 *   GET    /organizations/:organizationId/groups/:groupId/members
 *   POST   /organizations/:organizationId/groups/:groupId/members
 *   DELETE /organizations/:organizationId/groups/:groupId/members/:memberId
 *
 * IMPORTANT:
 * - organizationId always comes from @Param().
 * - It must not be supplied as a query/body property.
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
  Query,
  Req,
} from '@nestjs/common';

import {
  ChurchGroupsService,
  type ListGroupsQuery,
} from '../services/church-groups.service';

import { CreateChurchGroupDto } from '../dto/create-church-group.dto';
import { UpdateChurchGroupDto } from '../dto/update-church-group.dto';

import type { AuthUser } from '../../members/services/members.service';

/* ============================================================================
   REQUEST TYPE
============================================================================ */

type AuthenticatedRequest = {
  user?: AuthUser;
};

/* ============================================================================
   GROUP MEMBER QUERY
============================================================================ */

export interface ListGroupMembersQuery {
  page?: string | number;
  pageSize?: string | number;
  search?: string;
}

/* ============================================================================
   ADD GROUP MEMBER INPUT
============================================================================ */

export interface AddGroupMemberInput {
  userId?: string;
  email?: string;
}

/* ============================================================================
   CONTROLLER
============================================================================ */

@Controller('organizations/:organizationId/groups')
export class ChurchGroupsController {
  constructor(
    private readonly groupsService: ChurchGroupsService,
  ) {}

  /* ==========================================================================
     LIST GROUPS
  ========================================================================== */

  @Get()
  list(
    @Param('organizationId') organizationId: string,
    @Query() query: ListGroupsQuery,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.groupsService.listByOrganization(
      organizationId,
      {
        page: query.page
          ? Number(query.page)
          : undefined,

        pageSize: query.pageSize
          ? Number(query.pageSize)
          : undefined,

        search: query.search,

        departmentId:
          query.departmentId,
      },
      req.user?.id,
    );
  }

  /* ==========================================================================
     GET ONE GROUP
  ========================================================================== */

  @Get(':groupId')
  getOne(
    @Param('organizationId') organizationId: string,
    @Param('groupId') groupId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.groupsService.getById(
      organizationId,
      groupId,
      req.user?.id,
    );
  }

  /* ==========================================================================
     CREATE GROUP
  ========================================================================== */

  @Post()
  create(
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateChurchGroupDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.groupsService.create(
      organizationId,
      dto,
      req.user!.id,
    );
  }

  /* ==========================================================================
     UPDATE GROUP
  ========================================================================== */

  @Patch(':groupId')
  update(
    @Param('organizationId') organizationId: string,
    @Param('groupId') groupId: string,
    @Body() dto: UpdateChurchGroupDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.groupsService.update(
      organizationId,
      groupId,
      dto,
      req.user!.id,
    );
  }

  /* ==========================================================================
     DELETE / ARCHIVE GROUP
  ========================================================================== */

  @Delete(':groupId')
  remove(
    @Param('organizationId') organizationId: string,
    @Param('groupId') groupId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.groupsService.remove(
      organizationId,
      groupId,
      req.user!.id,
    );
  }

  /* ==========================================================================
     JOIN GROUP
  ========================================================================== */

  @Post(':groupId/join')
  join(
    @Param('organizationId') organizationId: string,
    @Param('groupId') groupId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.groupsService.join(
      organizationId,
      groupId,
      req.user!.id,
    );
  }

  /* ==========================================================================
     LEAVE GROUP
  ========================================================================== */

  @Post(':groupId/leave')
  leave(
    @Param('organizationId') organizationId: string,
    @Param('groupId') groupId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.groupsService.leave(
      organizationId,
      groupId,
      req.user!.id,
    );
  }

  /* ==========================================================================
     LIST GROUP MEMBERS
  ========================================================================== */

  /**
   * GET
   * /organizations/:organizationId/groups/:groupId/members
   *
   * Example:
   *
   * GET /organizations/123/groups/456/members?pageSize=100
   *
   * organizationId and groupId come from the URL.
   */
  @Get(':groupId/members')
  listMembers(
    @Param('organizationId') organizationId: string,
    @Param('groupId') groupId: string,
    @Query() query: ListGroupMembersQuery,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.groupsService.listMembers(
      organizationId,
      groupId,
      {
        page: query.page
          ? Number(query.page)
          : undefined,

        pageSize: query.pageSize
          ? Number(query.pageSize)
          : undefined,

        search: query.search,
      },
      req.user?.id,
    );
  }

  /* ==========================================================================
     ADD GROUP MEMBER
  ========================================================================== */

  /**
   * POST
   * /organizations/:organizationId/groups/:groupId/members
   *
   * Body:
   *
   * {
   *   "userId": "..."
   * }
   *
   * OR:
   *
   * {
   *   "email": "..."
   * }
   *
   * organizationId and groupId are URL parameters.
   */
  @Post(':groupId/members')
  addMember(
    @Param('organizationId') organizationId: string,
    @Param('groupId') groupId: string,
    @Body() input: AddGroupMemberInput,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.groupsService.addMember(
      organizationId,
      groupId,
      input,
      req.user!.id,
    );
  }

  /* ==========================================================================
     REMOVE GROUP MEMBER
  ========================================================================== */

  /**
   * DELETE
   * /organizations/:organizationId/groups/:groupId/members/:memberId
   *
   * memberId is the Church membership ID.
   */
  @Delete(':groupId/members/:memberId')
  removeMember(
    @Param('organizationId') organizationId: string,
    @Param('groupId') groupId: string,
    @Param('memberId') memberId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.groupsService.removeMember(
      organizationId,
      groupId,
      memberId,
      req.user!.id,
    );
  }
}