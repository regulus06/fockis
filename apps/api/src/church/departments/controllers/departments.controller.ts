/**
 * departments.controller.ts
 * -----------------------------------------------------------------------------
 * REST surface for Church Departments.
 *
 * Mounted under:
 *
 * /organizations/:organizationId/departments
 *
 * Security:
 * - Every endpoint requires JWT authentication.
 * - Department visibility is additionally enforced by DepartmentsService.
 * - Normal department viewing requires ACTIVE organization membership.
 * - Archived departments require administrator access.
 * - Management operations require administrator/owner access.
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
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";

import { AuthGuard } from "@nestjs/passport";

import type { Request } from "express";

import { IsString } from "class-validator";

import {
  DepartmentsService,
  type ListDepartmentsQuery,
} from "../services/departments.service";

import { CreateDepartmentDto } from "../dto/create-department.dto";

import { UpdateDepartmentDto } from "../dto/update-department.dto";

class AddDepartmentMemberDto {
  @IsString()
  memberId!: string;
}

/**
 * Obtain the authenticated user's ID from the JWT payload.
 *
 * Authentication is enforced at the controller level with AuthGuard("jwt"),
 * but we still validate that the strategy actually populated req.user.
 */
function getAuthenticatedUserId(
  req: Request,
): string {
  const user = req.user as
    | {
        id?: string;
        _id?: string;
        userId?: string;
      }
    | undefined;

  const userId =
    user?.id ??
    user?.userId ??
    user?._id;

  if (
    !userId ||
    String(userId).trim() === ""
  ) {
    throw new UnauthorizedException(
      "Authenticated user ID is required.",
    );
  }

  return String(userId);
}

@Controller(
  "organizations/:organizationId/departments",
)
@UseGuards(AuthGuard("jwt"))
export class DepartmentsController {
  constructor(
    private readonly departmentsService: DepartmentsService,
  ) {}

  /* =========================================================================
     LIST
     ========================================================================= */

  @Get()
  list(
    @Param("organizationId")
    organizationId: string,

    @Query()
    query: ListDepartmentsQuery,

    @Req()
    req: Request,
  ) {
    const userId =
      getAuthenticatedUserId(req);

    return this.departmentsService.listByOrganization(
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

        branchId:
          query.branchId,

        includeArchived:
          query.includeArchived ===
            true ||
          String(
            query.includeArchived ?? "",
          ).toLowerCase() ===
            "true",
      },
      userId,
    );
  }

  /* =========================================================================
     GET ONE
     ========================================================================= */

  @Get(":departmentId")
  getOne(
    @Param("organizationId")
    organizationId: string,

    @Param("departmentId")
    departmentId: string,

    @Req()
    req: Request,
  ) {
    const userId =
      getAuthenticatedUserId(req);

    return this.departmentsService.getById(
      organizationId,
      departmentId,
      userId,
    );
  }

  /* =========================================================================
     CREATE
     ========================================================================= */

  @Post()
  create(
    @Param("organizationId")
    organizationId: string,

    @Body()
    dto: CreateDepartmentDto,

    @Req()
    req: Request,
  ) {
    const userId =
      getAuthenticatedUserId(req);

    return this.departmentsService.create(
      organizationId,
      dto,
      userId,
    );
  }

  /* =========================================================================
     UPDATE
     ========================================================================= */

  @Patch(":departmentId")
  update(
    @Param("organizationId")
    organizationId: string,

    @Param("departmentId")
    departmentId: string,

    @Body()
    dto: UpdateDepartmentDto,

    @Req()
    req: Request,
  ) {
    const userId =
      getAuthenticatedUserId(req);

    return this.departmentsService.update(
      organizationId,
      departmentId,
      dto,
      userId,
    );
  }

  /* =========================================================================
     ARCHIVE
     ========================================================================= */

  /**
   * DELETE is retained for frontend compatibility.
   *
   * This is NOT a physical delete.
   *
   * The department remains in MongoDB with:
   * - same ID
   * - same creator
   * - same members
   * - same leaders
   * - same createdAt
   * - archivedAt populated
   * - archivedByUserId populated
   */
  @Delete(":departmentId")
  remove(
    @Param("organizationId")
    organizationId: string,

    @Param("departmentId")
    departmentId: string,

    @Req()
    req: Request,
  ) {
    const userId =
      getAuthenticatedUserId(req);

    return this.departmentsService.remove(
      organizationId,
      departmentId,
      userId,
    );
  }

  /* =========================================================================
     RESTORE
     ========================================================================= */

  @Post(":departmentId/restore")
  restore(
    @Param("organizationId")
    organizationId: string,

    @Param("departmentId")
    departmentId: string,

    @Req()
    req: Request,
  ) {
    const userId =
      getAuthenticatedUserId(req);

    return this.departmentsService.restore(
      organizationId,
      departmentId,
      userId,
    );
  }

  /* =========================================================================
     JOIN
     ========================================================================= */

  @Post(":departmentId/join")
  join(
    @Param("organizationId")
    organizationId: string,

    @Param("departmentId")
    departmentId: string,

    @Req()
    req: Request,
  ) {
    const userId =
      getAuthenticatedUserId(req);

    return this.departmentsService.join(
      organizationId,
      departmentId,
      userId,
    );
  }

  /* =========================================================================
     LEAVE
     ========================================================================= */

  @Post(":departmentId/leave")
  leave(
    @Param("organizationId")
    organizationId: string,

    @Param("departmentId")
    departmentId: string,

    @Req()
    req: Request,
  ) {
    const userId =
      getAuthenticatedUserId(req);

    return this.departmentsService.leave(
      organizationId,
      departmentId,
      userId,
    );
  }

  /* =========================================================================
     ADD MEMBER
     ========================================================================= */

  @Post(":departmentId/members")
  addMember(
    @Param("organizationId")
    organizationId: string,

    @Param("departmentId")
    departmentId: string,

    @Body()
    dto: AddDepartmentMemberDto,

    @Req()
    req: Request,
  ) {
    const userId =
      getAuthenticatedUserId(req);

    return this.departmentsService.addMember(
      organizationId,
      departmentId,
      dto.memberId,
      userId,
    );
  }

  /* =========================================================================
     REMOVE MEMBER
     ========================================================================= */

  @Delete(
    ":departmentId/members/:memberId",
  )
  removeMember(
    @Param("organizationId")
    organizationId: string,

    @Param("departmentId")
    departmentId: string,

    @Param("memberId")
    memberId: string,

    @Req()
    req: Request,
  ) {
    const userId =
      getAuthenticatedUserId(req);

    return this.departmentsService.removeMember(
      organizationId,
      departmentId,
      memberId,
      userId,
    );
  }
}