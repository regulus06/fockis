import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import { User, UserDocument } from "../../../users/user.schema";
import {
  AdminRole,
  AdminRoleDocument,
} from "../../roles/admin-role.schema";

import { AuditService } from "../../audit/audit.service";
import { normalizeUser, setIfPresent } from "../user-admin-utils";

const SYSTEM_ROLES = new Set([
  "user",
  "moderator",
  "admin",
  "super_admin",
]);

@Injectable()
export class UserRoleService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    @InjectModel(AdminRole.name)
    private readonly adminRoleModel: Model<AdminRoleDocument>,

    private readonly audit: AuditService,
  ) {}

  /**
   * Update a user's system role or custom admin role.
   *
   * Security hierarchy:
   *
   *   Super Admin
   *      ↓
   *   Admin
   *      ↓
   *   Moderator
   *      ↓
   *   User
   *
   * Super Admin is the only role allowed to:
   * - assign super_admin
   * - assign admin
   * - assign custom administrative roles
   * - modify another Super Admin
   *
   * Admin may:
   * - assign moderator
   * - manage lower-level users
   *
   * An administrator may never promote themselves or another user
   * to a privilege level higher than their own.
   */
  async update(
    id: string,
    body: any,
    actor: any,
    req: any,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("Invalid user ID.");
    }

    if (!actor) {
      throw new UnauthorizedException(
        "Authentication required.",
      );
    }

    const targetUser = await this.userModel
      .findById(id)
      .select("_id role adminRoleId")
      .exec();

    if (!targetUser) {
      throw new NotFoundException("User not found.");
    }

    const actorIsSuperAdmin =
      this.isSuperAdmin(actor);

    const actorIsAdmin =
      this.isAdminOrSuperAdmin(actor);

    const targetRole = this.normalizeRole(
      targetUser.role,
    );

    const requestedRole = this.normalizeRole(
      body?.role,
    );

    const customRoleId = String(
      body?.adminRoleId ?? "",
    ).trim();

    /*
     * ------------------------------------------------------------
     * PROTECT SUPER ADMINS
     * ------------------------------------------------------------
     *
     * Only another Super Admin may modify a Super Admin.
     */
    if (
      targetRole === "super_admin" &&
      !actorIsSuperAdmin
    ) {
      throw new ForbiddenException(
        "Only a Super Admin can modify a Super Admin.",
      );
    }

    /*
     * ------------------------------------------------------------
     * PREVENT SELF-ESCALATION
     * ------------------------------------------------------------
     *
     * A non-Super-Admin may never promote themselves.
     */
    const actorId = String(
      actor?._id ?? actor?.id ?? "",
    );

    if (
      actorId &&
      actorId === String(targetUser._id)
    ) {
      if (
        requestedRole === "admin" ||
        requestedRole === "super_admin" ||
        customRoleId
      ) {
        if (!actorIsSuperAdmin) {
          throw new ForbiddenException(
            "You cannot elevate your own privileges.",
          );
        }
      }
    }

    /*
     * ------------------------------------------------------------
     * CUSTOM ROLE
     * ------------------------------------------------------------
     *
     * Custom administrative roles are controlled by Super Admin.
     */
    if (customRoleId) {
      if (!Types.ObjectId.isValid(customRoleId)) {
        throw new BadRequestException(
          "Invalid custom role ID.",
        );
      }

      const adminRole =
        await this.adminRoleModel
          .findById(customRoleId)
          .lean()
          .exec();

      if (!adminRole) {
        throw new NotFoundException(
          "Custom role not found.",
        );
      }

      if (adminRole.isSystemRole) {
        throw new ForbiddenException(
          "System roles cannot be assigned as custom roles.",
        );
      }

      if (!adminRole.isActive) {
        throw new ForbiddenException(
          "This custom role is inactive and cannot be assigned.",
        );
      }

      /*
       * Only Super Admin can assign custom administrative roles.
       */
      if (!actorIsSuperAdmin) {
        throw new ForbiddenException(
          "Only a Super Admin can assign custom administrative roles.",
        );
      }

      const update: Record<string, unknown> = {};

      setIfPresent(
        this.userModel,
        update,
        "adminRoleId",
        new Types.ObjectId(customRoleId),
      );

      /*
       * A custom role does not replace an existing permanent
       * system role.
       *
       * Regular users receiving a custom role remain users.
       */
      if (!SYSTEM_ROLES.has(targetRole)) {
        update.role = "user";
      }

      const user =
        await this.userModel
          .findByIdAndUpdate(
            id,
            {
              $set: update,
            },
            {
              new: true,
              runValidators: true,
            },
          )
          .select("-password -passwordHash")
          .lean()
          .exec();

      if (!user) {
        throw new NotFoundException(
          "User not found.",
        );
      }

      await this.audit.log({
        userId: actorId,
        action: "USER_CUSTOM_ROLE_ASSIGNED",
        module: "users",
        targetId: id,
        metadata: {
          roleId: String(adminRole._id),
          roleName: adminRole.name,
          roleSlug: adminRole.slug,
          previousRoleId:
            targetUser.adminRoleId
              ? String(targetUser.adminRoleId)
              : null,
          reason: body?.reason ?? null,
        },
        ip: req?.ip,
        userAgent:
          req?.headers?.["user-agent"],
      });

      return normalizeUser(user);
    }

    /*
     * ------------------------------------------------------------
     * SYSTEM ROLE VALIDATION
     * ------------------------------------------------------------
     */
    if (!SYSTEM_ROLES.has(requestedRole)) {
      throw new ForbiddenException(
        "Invalid system role. Use a valid custom role ID for custom roles.",
      );
    }

    /*
     * ------------------------------------------------------------
     * SUPER ADMIN
     * ------------------------------------------------------------
     */
    if (requestedRole === "super_admin") {
      if (!actorIsSuperAdmin) {
        throw new ForbiddenException(
          "Only a Super Admin can assign the Super Admin role.",
        );
      }
    }

    /*
     * ------------------------------------------------------------
     * ADMIN
     * ------------------------------------------------------------
     */
    if (requestedRole === "admin") {
      if (!actorIsSuperAdmin) {
        throw new ForbiddenException(
          "Only a Super Admin can assign the Admin role.",
        );
      }
    }

    /*
     * ------------------------------------------------------------
     * MODERATOR
     * ------------------------------------------------------------
     */
    if (requestedRole === "moderator") {
      if (!actorIsAdmin) {
        throw new ForbiddenException(
          "Administrator privileges are required to assign the Moderator role.",
        );
      }
    }

    /*
     * ------------------------------------------------------------
     * USER
     * ------------------------------------------------------------
     *
     * Demoting an existing Admin or Super Admin requires
     * Super Admin authority.
     */
    if (requestedRole === "user") {
      if (
        (targetRole === "admin" ||
          targetRole === "super_admin") &&
        !actorIsSuperAdmin
      ) {
        throw new ForbiddenException(
          "Only a Super Admin can demote an administrator.",
        );
      }
    }

    /*
     * ------------------------------------------------------------
     * ADDITIONAL PRIVILEGE CHECK
     * ------------------------------------------------------------
     *
     * Non-Super-Admins cannot modify a target whose role is equal
     * to or higher than their own privilege level.
     */
    if (!actorIsSuperAdmin) {
      if (
        targetRole === "admin" ||
        targetRole === "super_admin"
      ) {
        throw new ForbiddenException(
          "You cannot modify an administrator with equal or higher privileges.",
        );
      }
    }

    /*
     * ------------------------------------------------------------
     * APPLY SYSTEM ROLE
     * ------------------------------------------------------------
     */
    const update: Record<string, unknown> = {};

    setIfPresent(
      this.userModel,
      update,
      "role",
      requestedRole,
    );

    /*
     * A system role assignment removes the custom role.
     */
    update.adminRoleId = null;

    const user =
      await this.userModel
        .findByIdAndUpdate(
          id,
          {
            $set: update,
          },
          {
            new: true,
            runValidators: true,
          },
        )
        .select("-password -passwordHash")
        .lean()
        .exec();

    if (!user) {
      throw new NotFoundException(
        "User not found.",
      );
    }

    await this.audit.log({
      userId: actorId,
      action: "USER_ROLE_UPDATED",
      module: "users",
      targetId: id,
      metadata: {
        role: requestedRole,
        previousRole: targetUser.role,
        previousCustomRoleId:
          targetUser.adminRoleId
            ? String(targetUser.adminRoleId)
            : null,
        reason: body?.reason ?? null,
      },
      ip: req?.ip,
      userAgent:
        req?.headers?.["user-agent"],
    });

    return normalizeUser(user);
  }

  /**
   * Normalize a role into the canonical system role format.
   */
  private normalizeRole(
    value: unknown,
  ): string {
    return String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");
  }

  /**
   * Determine whether the actor is Super Admin.
   *
   * Database-derived JWT data should populate these values.
   */
  private isSuperAdmin(
    actor: any,
  ): boolean {
    if (actor?.isSuperAdmin === true) {
      return true;
    }

    return (
      this.normalizeRole(actor?.role) ===
      "super_admin"
    );
  }

  /**
   * Determine whether the actor has administrator
   * or Super Admin authority.
   */
  private isAdminOrSuperAdmin(
    actor: any,
  ): boolean {
    const role =
      this.normalizeRole(actor?.role);

    return (
      role === "admin" ||
      role === "super_admin" ||
      actor?.isSuperAdmin === true
    );
  }
}