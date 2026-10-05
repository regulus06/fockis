import {
  Controller,
  Delete,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Req,
} from "@nestjs/common";

import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { AdminService } from "./admin.service";

import { RbacGuard } from "./rbac/rbac.guard";
import { RequirePermissions } from "./rbac/permissions.decorator";
import { Permission } from "./rbac/permissions.enum";

import { SuperAdminGuard } from "./safety/super-admin.guard";
import { DestructiveGuard } from "./safety/destructive.guard";

import { User, UserDocument } from "../users/user.schema";

@Controller("admin")
export class AdminController {
  constructor(
    private readonly adminService: AdminService,

    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  // ==========================================================================
  // USER ADMINISTRATION
  // ==========================================================================

  /**
   * GET /admin/users
   *
   * Main Users Admin dashboard list.
   *
   * Requires:
   * - users.view
   *
   * Super Admin automatically passes RbacGuard.
   */
  @Get("users")
  @UseGuards(RbacGuard)
  @RequirePermissions(Permission.USERS_VIEW)
  getUsers(
    @Query() query: any,
    @Req() req: any,
  ) {
    return this.adminService.getUsers(
      query,
      req.user,
      req,
    );
  }

  /**
   * GET /admin/users/stats
   *
   * User Admin dashboard statistics.
   *
   * Requires:
   * - users.view
   */
  @Get("users/stats")
  @UseGuards(RbacGuard)
  @RequirePermissions(Permission.USERS_VIEW)
  getUserStats(@Req() req: any) {
    return this.adminService.getUserStats(
      req.user,
      req,
    );
  }

  /**
   * GET /admin/users/:id
   *
   * Individual User Administration overview.
   *
   * Requires:
   * - users.details.view
   */
  @Get("users/:id")
  @UseGuards(RbacGuard)
  @RequirePermissions(
    Permission.USERS_DETAILS_VIEW,
  )
  getUser(
    @Param("id") id: string,
    @Req() req: any,
  ) {
    return this.adminService.getUser(
      id,
      req.user,
      req,
    );
  }

  // ==========================================================================
  // MARKETPLACE DASHBOARD
  // ==========================================================================

  /**
   * GET /admin/marketplace/dashboard
   *
   * Requires:
   * - marketplace.view
   */
  @Get("marketplace/dashboard")
  @UseGuards(RbacGuard)
  @RequirePermissions(
    Permission.MARKETPLACE_VIEW,
  )
  marketplaceDashboard(
    @Req() req: any,
  ) {
    return this.adminService.marketplaceDashboard(
      req.user,
      req,
    );
  }

  // ==========================================================================
  // ADMINISTRATORS
  // ==========================================================================

  /**
   * GET /admin/administrators
   *
   * View administrators.
   *
   * This does NOT grant permission to create, modify,
   * delete, or change administrator roles.
   *
   * Those actions should use their own permissions.
   */
  @Get("administrators")
  @UseGuards(RbacGuard)
  @RequirePermissions(
    Permission.ADMINISTRATORS_VIEW,
  )
  async getAdministrators(
    @Query("search") search?: string,
  ) {
    const query: any = {
      $or: [
        { role: "admin" },
        { role: "administrator" },
        { role: "super_admin" },
        { role: "superadmin" },
      ],
    };

    if (search?.trim()) {
      const escaped = search
        .trim()
        .replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&",
        );

      const regex = new RegExp(
        escaped,
        "i",
      );

      query.$and = [
        {
          $or: [
            { name: regex },
            { username: regex },
            { email: regex },
          ],
        },
      ];
    }

    const administrators =
      await this.userModel
        .find(query)
        .select(
          "_id name username email role permissions online lastSeen createdAt updatedAt adminRoleId",
        )
        .sort({
          createdAt: -1,
        })
        .lean()
        .exec();

    return administrators.map(
      (admin: any) => ({
        id: String(admin._id),

        _id: String(admin._id),

        name:
          admin.name ||
          admin.username ||
          admin.email ||
          "Administrator",

        username:
          admin.username ?? null,

        email:
          admin.email ?? null,

        role:
          admin.role ?? "admin",

        permissions:
          Array.isArray(admin.permissions)
            ? admin.permissions
            : [],

        adminRoleId:
          admin.adminRoleId
            ? String(admin.adminRoleId)
            : null,

        online:
          Boolean(admin.online),

        lastSeen:
          admin.lastSeen ?? null,

        createdAt:
          admin.createdAt ?? null,

        updatedAt:
          admin.updatedAt ?? null,

        status:
          admin.online
            ? "active"
            : "offline",
      }),
    );
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  /**
   * POST /admin/cleanup/media
   *
   * Requires:
   * - delete:media
   */
  @Post("cleanup/media")
  @UseGuards(RbacGuard)
  @RequirePermissions(
    Permission.DELETE_MEDIA,
  )
  cleanupMedia(@Req() req: any) {
    return this.adminService.cleanupMedia(
      req.user,
      req,
    );
  }

  /**
   * POST /admin/cleanup/db
   *
   * Extremely destructive operation.
   *
   * Requires:
   * - system:cleanup
   *
   * Plus:
   * - DestructiveGuard
   *
   * Super Admin bypasses the permission check through RbacGuard,
   * but DestructiveGuard still remains active.
   */
  @Post("cleanup/db")
  @UseGuards(
    RbacGuard,
    DestructiveGuard,
  )
  @RequirePermissions(
    Permission.SYSTEM_CLEANUP,
  )
  cleanupDb(@Req() req: any) {
    return this.adminService.cleanupDb(
      req.user,
      req,
    );
  }

  // ==========================================================================
  // LEGACY USER DELETE
  // ==========================================================================

  /**
   * DELETE /admin/user/:id
   *
   * Super Admin ONLY.
   *
   * This remains intentionally protected by SuperAdminGuard
   * because it is a legacy destructive user-deletion endpoint.
   */
  @Delete("user/:id")
  @UseGuards(SuperAdminGuard)
  deleteLegacyUser(
    @Param("id") id: string,
    @Req() req: any,
  ) {
    return this.adminService.deleteUser(
      id,
      req.user,
      req,
    );
  }
}