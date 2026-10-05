import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import {
  User,
  UserDocument,
} from "../users/user.schema";

import { MediaCleanupService } from "./tools/media.cleanup.service";
import { DbAdminService } from "./tools/db-admin.service";
import { AuditService } from "./audit/audit.service";

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    private readonly mediaAdmin: MediaCleanupService,

    private readonly dbAdmin: DbAdminService,

    private readonly audit: AuditService,
  ) {}

  // ==========================================================================
  // SECURITY HELPERS
  // ==========================================================================

  private normalizeRole(value: unknown): string {
    return String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");
  }

  private isSuperAdmin(actor: any): boolean {
    if (!actor) {
      return false;
    }

    if (actor.isSuperAdmin === true) {
      return true;
    }

    if (
      this.normalizeRole(actor.role) ===
      "super_admin"
    ) {
      return true;
    }

    return (
      Array.isArray(actor.roles) &&
      actor.roles.some(
        (role: unknown) =>
          this.normalizeRole(role) ===
          "super_admin",
      )
    );
  }

  private isAdminOrHigher(actor: any): boolean {
    if (!actor) {
      return false;
    }

    return (
      this.isSuperAdmin(actor) ||
      this.normalizeRole(actor.role) ===
        "admin"
    );
  }

  private getActorId(actor: any): string {
    return String(
      actor?.id ??
        actor?._id ??
        actor?.userId ??
        actor?.sub ??
        "",
    ).trim();
  }

  private requireActor(actor: any): string {
    const actorId =
      this.getActorId(actor);

    if (!actorId) {
      throw new UnauthorizedException(
        "Authentication required.",
      );
    }

    return actorId;
  }

  private requireAdmin(actor: any): string {
    const actorId =
      this.requireActor(actor);

    if (!this.isAdminOrHigher(actor)) {
      throw new ForbiddenException(
        "Administrator privileges required.",
      );
    }

    return actorId;
  }

  private requireSuperAdmin(actor: any): string {
    const actorId =
      this.requireActor(actor);

    if (!this.isSuperAdmin(actor)) {
      throw new ForbiddenException(
        "Super Admin privileges required.",
      );
    }

    return actorId;
  }

  // ==========================================================================
  // USERS - DASHBOARD
  // ==========================================================================

  async getUsers(
    query: any,
    actor: any,
    req: any,
  ) {
    const actorId =
      this.requireAdmin(actor);

    const {
      search,
      status,
      role,
      accountType,
      verified,
      locked,
      premium,
      fockisIdAccessPaid,
      page = 1,
      limit = 50,
    } = query || {};

    const currentPage = Math.max(
      Number(page) || 1,
      1,
    );

    const pageSize = Math.min(
      Math.max(
        Number(limit) || 50,
        1,
      ),
      100,
    );

    const filters: any[] = [];

    // ------------------------------------------------------------------------
    // Search
    // ------------------------------------------------------------------------

    if (
      typeof search === "string" &&
      search.trim()
    ) {
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

      filters.push({
        $or: [
          { name: regex },
          { firstName: regex },
          { lastName: regex },
          { username: regex },
          { email: regex },
          { fockisId: regex },
        ],
      });
    }

    // ------------------------------------------------------------------------
    // Role
    // ------------------------------------------------------------------------

    if (
      typeof role === "string" &&
      role.trim()
    ) {
      filters.push({
        role: role.trim(),
      });
    }

    // ------------------------------------------------------------------------
    // Account Type
    // ------------------------------------------------------------------------

    if (
      typeof accountType === "string" &&
      accountType.trim()
    ) {
      filters.push({
        accountType:
          accountType.trim(),
      });
    }

    // ------------------------------------------------------------------------
    // Verification
    // ------------------------------------------------------------------------

    if (
      verified !== undefined &&
      verified !== ""
    ) {
      filters.push({
        verified:
          String(verified) ===
          "true",
      });
    }

    // ------------------------------------------------------------------------
    // Premium
    // ------------------------------------------------------------------------

    if (
      premium !== undefined &&
      premium !== ""
    ) {
      filters.push({
        premium:
          String(premium) ===
          "true",
      });
    }

    // ------------------------------------------------------------------------
    // Fockis ID paid
    // ------------------------------------------------------------------------

    if (
      fockisIdAccessPaid !==
        undefined &&
      fockisIdAccessPaid !== ""
    ) {
      filters.push({
        fockisIdAccessPaid:
          String(
            fockisIdAccessPaid,
          ) === "true",
      });
    }

    // ------------------------------------------------------------------------
    // Locked
    // ------------------------------------------------------------------------

    if (
      locked !== undefined &&
      locked !== ""
    ) {
      const wantsLocked =
        String(locked) ===
        "true";

      if (wantsLocked) {
        filters.push({
          lockedUntil: {
            $gt: new Date(),
          },
        });
      } else {
        filters.push({
          $or: [
            {
              lockedUntil: {
                $exists: false,
              },
            },
            {
              lockedUntil: null,
            },
            {
              lockedUntil: {
                $lte: new Date(),
              },
            },
          ],
        });
      }
    }

    // ------------------------------------------------------------------------
    // Status
    // ------------------------------------------------------------------------

    if (
      typeof status === "string" &&
      status.trim()
    ) {
      const normalizedStatus =
        status
          .trim()
          .toLowerCase();

      switch (
        normalizedStatus
      ) {
        case "active":
          filters.push({
            $and: [
              {
                $or: [
                  {
                    status:
                      "active",
                  },
                  {
                    status: {
                      $exists: false,
                    },
                  },
                  {
                    status: null,
                  },
                ],
              },
              {
                isActive: {
                  $ne: false,
                },
              },
            ],
          });
          break;

        case "suspended":
          filters.push({
            status:
              "suspended",
          });
          break;

        case "deactivated":
          filters.push({
            $or: [
              {
                status:
                  "deactivated",
              },
              {
                isActive: false,
              },
            ],
          });
          break;

        case "locked":
          filters.push({
            lockedUntil: {
              $gt: new Date(),
            },
          });
          break;

        case "online":
          filters.push({
            online: true,
          });
          break;

        default:
          filters.push({
            status:
              normalizedStatus,
          });
          break;
      }
    }

    const mongoQuery =
      filters.length > 0
        ? { $and: filters }
        : {};

    // ------------------------------------------------------------------------
    // Count
    // ------------------------------------------------------------------------

    const total =
      await this.userModel.countDocuments(
        mongoQuery,
      );

    // ------------------------------------------------------------------------
    // Users
    // ------------------------------------------------------------------------

    const users =
      await this.userModel
        .find(mongoQuery)
        .sort({
          createdAt: -1,
        })
        .skip(
          (currentPage - 1) *
            pageSize,
        )
        .limit(pageSize)
        .select(
          "-password -passwordHash",
        )
        .lean()
        .exec();

    const mappedUsers =
      users.map((user: any) =>
        this.buildAdminUser(user),
      );

    await this.audit.log({
      userId: actorId,
      action:
        "VIEW_ADMIN_USERS",
      module: "users",
      targetId: "users",
      ip: req?.ip,
      userAgent:
        req?.headers?.[
          "user-agent"
        ],
    });

    return {
      users: mappedUsers,
      data: mappedUsers,
      total,
      page: currentPage,
      limit: pageSize,
      totalPages:
        Math.max(
          Math.ceil(
            total / pageSize,
          ),
          1,
        ),
    };
  }

  // ==========================================================================
  // USERS - STATS
  // ==========================================================================

  async getUserStats(
    actor: any,
    req: any,
  ) {
    const actorId =
      this.requireAdmin(actor);

    const [
      totalUsers,
      activeUsers,
      onlineUsers,
      verifiedUsers,
      premiumUsers,
      lockedUsers,
      suspendedUsers,
      deactivatedUsers,
      fockisIdPaid,
      newThisMonth,
    ] = await Promise.all([
      this.userModel.countDocuments({}),

      this.userModel.countDocuments({
        $or: [
          {
            status: "active",
          },
          {
            status: {
              $exists: false,
            },
          },
          {
            status: null,
          },
        ],
        isActive: {
          $ne: false,
        },
      }),

      this.userModel.countDocuments({
        online: true,
      }),

      this.userModel.countDocuments({
        verified: true,
      }),

      this.userModel.countDocuments({
        premium: true,
      }),

      this.userModel.countDocuments({
        lockedUntil: {
          $gt: new Date(),
        },
      }),

      this.userModel.countDocuments({
        status:
          "suspended",
      }),

      this.userModel.countDocuments({
        $or: [
          {
            status:
              "deactivated",
          },
          {
            isActive: false,
          },
        ],
      }),

      this.userModel.countDocuments({
        fockisIdAccessPaid:
          true,
      }),

      this.userModel.countDocuments({
        createdAt: {
          $gte:
            this.startOfCurrentMonth(),
        },
      }),
    ]);

    await this.audit.log({
      userId: actorId,
      action:
        "VIEW_ADMIN_USER_STATS",
      module: "users",
      targetId: "stats",
      ip: req?.ip,
      userAgent:
        req?.headers?.[
          "user-agent"
        ],
    });

    return {
      totalUsers,
      activeUsers,
      onlineUsers,
      verifiedUsers,
      premiumUsers,
      lockedUsers,
      suspendedUsers,
      deactivatedUsers,
      fockisIdPaid,
      newUsers:
        newThisMonth,
      newThisMonth,
    };
  }

  // ==========================================================================
  // USERS - INDIVIDUAL USER
  // ==========================================================================

  async getUser(
    userId: string,
    actor: any,
    req: any,
  ) {
    const actorId =
      this.requireAdmin(actor);

    if (!userId?.trim()) {
      throw new NotFoundException(
        "User ID is required",
      );
    }

    const user =
      await this.userModel
        .findById(userId)
        .select(
          "-password -passwordHash",
        )
        .lean()
        .exec();

    if (!user) {
      throw new NotFoundException(
        "User not found",
      );
    }

    const adminUser =
      this.buildAdminUser(user);

    await this.audit.log({
      userId: actorId,
      action:
        "VIEW_ADMIN_USER",
      module: "users",
      targetId: userId,
      ip: req?.ip,
      userAgent:
        req?.headers?.[
          "user-agent"
        ],
    });

    return adminUser;
  }

  // ==========================================================================
  // ADMIN USER RESPONSE
  // ==========================================================================

  private buildAdminUser(
    user: any,
  ) {
    const id =
      user?._id
        ? String(user._id)
        : String(
            user?.id ?? "",
          );

    const lockedUntil =
      user?.lockedUntil
        ? new Date(
            user.lockedUntil,
          )
        : null;

    const isLocked =
      lockedUntil !== null &&
      !Number.isNaN(
        lockedUntil.getTime(),
      ) &&
      lockedUntil.getTime() >
        Date.now();

    let status =
      user?.status;

    if (!status) {
      if (isLocked) {
        status = "locked";
      } else if (
        user?.isActive === false
      ) {
        status =
          "deactivated";
      } else if (
        user?.online
      ) {
        status = "online";
      } else {
        status = "active";
      }
    }

    return {
      id,

      _id: id,

      name:
        user?.name ??
        (
          [
            user?.firstName,
            user?.lastName,
          ]
            .filter(Boolean)
            .join(" ") ||
          user?.username ||
          user?.email ||
          "Unnamed User"
        ),

      firstName:
        user?.firstName ?? "",

      lastName:
        user?.lastName ?? "",

      username:
        user?.username ?? "",

      email:
        user?.email ?? "",

      phone:
        user?.phone ?? null,

      profilePicture:
        user?.profilePicture ??
        user?.avatar ??
        null,

      avatar:
        user?.avatar ??
        user?.profilePicture ??
        null,

      coverPhoto:
        user?.coverPhoto ??
        null,

      bio:
        user?.bio ?? "",

      website:
        user?.website ?? "",

      location:
        user?.location ?? "",

      countryCode:
        user?.countryCode ??
        user?.country ??
        null,

      fockisId:
        user?.fockisId ??
        user?.publicFockisId ??
        null,

      publicFockisId:
        user?.publicFockisId ??
        user?.fockisId ??
        null,

      role:
        user?.role ?? "user",

      permissions:
        Array.isArray(
          user?.permissions,
        )
          ? user.permissions
          : [],

      accountType:
        user?.accountType ??
        "user",

      status,

      isActive:
        user?.isActive !== false,

      online: Boolean(
        user?.online,
      ),

      lastSeen:
        user?.lastSeen ??
        null,

      lastActiveAt:
        user?.lastActiveAt ??
        user?.lastSeen ??
        null,

      lastLoginAt:
        user?.lastLoginAt ??
        null,

      createdAt:
        user?.createdAt ??
        null,

      updatedAt:
        user?.updatedAt ??
        null,

      verified: Boolean(
        user?.verified,
      ),

      premium: Boolean(
        user?.premium,
      ),

      subscriptionExpiresAt:
        user?.subscriptionExpiresAt ??
        null,

      lockedUntil:
        user?.lockedUntil ??
        null,

      isLocked,

      failedLoginAttempts:
        user?.failedLoginAttempts ??
        0,

      mustChangePassword:
        Boolean(
          user?.mustChangePassword,
        ),

      passwordChangedAt:
        user?.passwordChangedAt ??
        null,

      adminRoleId:
        user?.adminRoleId
          ? String(
              user.adminRoleId,
            )
          : null,

      fockisIdAccessPaid:
        Boolean(
          user?.fockisIdAccessPaid,
        ),

      followersCount:
        Array.isArray(
          user?.followers,
        )
          ? user.followers.length
          : user?.followersCount ??
            0,

      followingCount:
        Array.isArray(
          user?.following,
        )
          ? user.following.length
          : user?.followingCount ??
            0,

      friendsCount:
        user?.friendsCount ?? 0,

      postsCount:
        user?.postsCount ?? 0,

      likesReceived:
        user?.likesReceived ?? 0,

      sellerApproved:
        Boolean(
          user?.sellerApproved,
        ),

      storeName:
        user?.storeName ?? null,

      storeDescription:
        user?.storeDescription ??
        null,
    };
  }

  // ==========================================================================
  // DATE HELPERS
  // ==========================================================================

  private startOfCurrentMonth() {
    const now = new Date();

    return new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
      0,
      0,
      0,
      0,
    );
  }

  // ==========================================================================
  // MARKETPLACE
  // ==========================================================================

  async marketplaceDashboard(
    actor: any,
    req: any,
  ) {
    const actorId =
      this.requireAdmin(actor);

    await this.audit.log({
      userId: actorId,
      action:
        "VIEW_MARKETPLACE_DASHBOARD",
      module: "marketplace",
      targetId: "dashboard",
      ip: req?.ip,
      userAgent:
        req?.headers?.[
          "user-agent"
        ],
    });

    return {
      totalProducts: 0,
      totalOrders: 0,
      totalSales: 0,
      totalSellers: 0,
      message:
        "Marketplace dashboard loaded",
    };
  }

  // ==========================================================================
  // LEGACY USER DELETE
  // ==========================================================================

  async deleteUser(
    userId: string,
    actor: any,
    req: any,
  ) {
    const actorId =
      this.requireSuperAdmin(actor);

    const user =
      await this.userModel
        .findById(userId)
        .select("_id role isActive")
        .exec();

    if (!user) {
      throw new NotFoundException(
        "User not found",
      );
    }

    const targetRole =
      this.normalizeRole(
        (user as any).role,
      );

    if (
      targetRole === "super_admin"
    ) {
      throw new ForbiddenException(
        "A Super Admin account cannot be deleted through this endpoint.",
      );
    }

    if (
      String(user._id) ===
      actorId
    ) {
      throw new ForbiddenException(
        "You cannot delete your own account.",
      );
    }

    const update: any = {};

    if (
      this.userModel.schema.path(
        "status",
      )
    ) {
      update.status = "deleted";
    }

    if (
      this.userModel.schema.path(
        "isActive",
      )
    ) {
      update.isActive = false;
    }

    if (
      Object.keys(update).length
    ) {
      await this.userModel
        .updateOne(
          {
            _id: userId,
          },
          {
            $set: update,
          },
        )
        .exec();
    }

    const result = {
      message:
        `User ${userId} soft-deleted`,
      userId,
    };

    await this.audit.log({
      userId: actorId,
      action:
        "DELETE_USER_LEGACY",
      module: "admin",
      targetId: userId,
      ip: req?.ip,
      userAgent:
        req?.headers?.[
          "user-agent"
        ],
    });

    return result;
  }

  // ==========================================================================
  // MEDIA CLEANUP
  // ==========================================================================

  async cleanupMedia(
    actor: any,
    req: any,
  ) {
    const actorId =
      this.requireSuperAdmin(actor);

    const result =
      await this.mediaAdmin
        .deleteOrphanMedia();

    await this.audit.log({
      userId: actorId,
      action: "CLEAN_MEDIA",
      module: "admin",
      targetId: "media",
      ip: req?.ip,
      userAgent:
        req?.headers?.[
          "user-agent"
        ],
    });

    return result;
  }

  // ==========================================================================
  // DATABASE CLEANUP
  // ==========================================================================

  async cleanupDb(
    actor: any,
    req: any,
  ) {
    const actorId =
      this.requireSuperAdmin(actor);

    const result =
      await this.dbAdmin
        .cleanupDatabase();

    await this.audit.log({
      userId: actorId,
      action: "CLEAN_DB",
      module: "admin",
      targetId: "database",
      ip: req?.ip,
      userAgent:
        req?.headers?.[
          "user-agent"
        ],
    });

    return result;
  }
}