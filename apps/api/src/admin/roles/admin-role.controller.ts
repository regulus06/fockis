import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";

import { AdminRoleService } from "./admin-role.service";
import { SuperAdminGuard } from "../safety/super-admin.guard";

import { RbacGuard } from "../rbac/rbac.guard";
import { RequirePermissions } from "../rbac/permissions.decorator";
import { Permission } from "../rbac/permissions.enum";

import { CreateAdminRoleDto } from "./dto/create-admin-role.dto";
import { UpdateAdminRoleDto } from "./dto/update-admin-role.dto";

@Controller("admin/roles")
@UseGuards(
  SuperAdminGuard,
  RbacGuard,
)
export class AdminRoleController {
  constructor(
    private readonly roleService: AdminRoleService,
  ) {}

  /**
   * Only SUPER_ADMIN can view administrator roles.
   *
   * Defense in depth:
   * - SuperAdminGuard
   * - administrators.roles.manage permission
   */
  @Get()
  @RequirePermissions(
    Permission.ADMINISTRATORS_ROLES_MANAGE,
  )
  list() {
    return this.roleService.list();
  }

  /**
   * Returns the permissions that can be used
   * when creating/editing a custom administrator role.
   *
   * SUPER_ADMIN ONLY.
   */
  @Get("permissions")
  @RequirePermissions(
    Permission.ADMINISTRATORS_ROLES_MANAGE,
  )
  permissions() {
    return this.roleService.getPermissions();
  }

  /**
   * Get one administrator role.
   *
   * SUPER_ADMIN ONLY.
   */
  @Get(":id")
  @RequirePermissions(
    Permission.ADMINISTRATORS_ROLES_MANAGE,
  )
  get(
    @Param("id") id: string,
  ) {
    return this.roleService.getById(id);
  }

  /**
   * Create a CUSTOM administrator role.
   *
   * SUPER_ADMIN ONLY.
   */
  @Post()
  @RequirePermissions(
    Permission.ADMINISTRATORS_ROLES_MANAGE,
  )
  create(
    @Body() dto: CreateAdminRoleDto,
    @Req() req: any,
  ) {
    return this.roleService.create(
      dto,
      req.user,
      req,
    );
  }

  /**
   * Update a CUSTOM administrator role.
   *
   * System roles cannot be modified.
   *
   * SUPER_ADMIN ONLY.
   */
  @Patch(":id")
  @RequirePermissions(
    Permission.ADMINISTRATORS_ROLES_MANAGE,
  )
  update(
    @Param("id") id: string,
    @Body() dto: UpdateAdminRoleDto,
    @Req() req: any,
  ) {
    return this.roleService.update(
      id,
      dto,
      req.user,
      req,
    );
  }

  /**
   * Delete a CUSTOM administrator role.
   *
   * System roles cannot be deleted.
   *
   * SUPER_ADMIN ONLY.
   */
  @Delete(":id")
  @RequirePermissions(
    Permission.ADMINISTRATORS_ROLES_MANAGE,
  )
  remove(
    @Param("id") id: string,
    @Req() req: any,
  ) {
    return this.roleService.remove(
      id,
      req.user,
      req,
    );
  }
}