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
import { Roles } from "./rbac/roles.decorator";
import { Role } from "./rbac/roles.enum";

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
   */
  @Get("users")
  @UseGuards(RbacGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
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
   * IMPORTANT:
   * This route must be before /users/:id.
   */
  @Get("users/stats")
  @UseGuards(RbacGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
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
   */
  @Get("users/:id")
  @UseGuards(RbacGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
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

  @Get("marketplace/dashboard")
  @UseGuards(RbacGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
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

  @Get("administrators")
  @UseGuards(RbacGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
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
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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

  @Post("cleanup/media")
  @UseGuards(RbacGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  cleanupMedia(@Req() req: any) {
    return this.adminService.cleanupMedia(
      req.user,
      req,
    );
  }

  @Post("cleanup/db")
  @UseGuards(
    RbacGuard,
    DestructiveGuard,
  )
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  cleanupDb(@Req() req: any) {
    return this.adminService.cleanupDb(
      req.user,
      req,
    );
  }

  // ==========================================================================
  // LEGACY USER DELETE
  // ==========================================================================

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