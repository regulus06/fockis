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

import { AuditService } from "../../audit/audit.service";
import { Permission } from "../../rbac/permissions.enum";
import { Role } from "../../rbac/roles.enum";
import { RolePermissions } from "../../rbac/role-permissions";

import {
  normalizeUser,
  setIfPresent,
} from "../user-admin-utils";

const SUPER_ADMIN_ONLY_PERMISSIONS =
  new Set<string>([
    Permission.USERS_ROLES_MANAGE,
    Permission.USERS_PERMISSIONS_MANAGE,

    Permission.ADMINISTRATORS_VIEW,
    Permission.ADMINISTRATORS_CREATE,
    Permission.ADMINISTRATORS_UPDATE,
    Permission.ADMINISTRATORS_DELETE,
    Permission.ADMINISTRATORS_ROLES_MANAGE,

    Permission.SECURITY_MANAGE,
    Permission.SYSTEM_SETTINGS_MANAGE,

    Permission.DELETE_DB,
    Permission.SYSTEM_CLEANUP,
  ]);

type SecurityUserRecord = {
  _id: Types.ObjectId;
  role?: unknown;
  isSuperAdmin?: unknown;
  isActive?: unknown;
  permissions?: unknown;
};

@Injectable()
export class UserPermissionService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    private readonly audit: AuditService,
  ) {}

  async update(
    id: string,
    body: any,
    actor: any,
    req: any,
  ) {
    // ========================================================================
    // TARGET ID
    // ========================================================================

    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(
        "Invalid user ID.",
      );
    }

    // ========================================================================
    // ACTOR
    // ========================================================================

    if (!actor) {
      throw new UnauthorizedException(
        "Authentication required.",
      );
    }

    const actorId = this.getActorId(actor);

    if (!actorId) {
      throw new UnauthorizedException(
        "Authenticated user ID is missing.",
      );
    }

    if (!Types.ObjectId.isValid(actorId)) {
      throw new UnauthorizedException(
        "Invalid authenticated user ID.",
      );
    }

    // ========================================================================
    // PERMISSION INPUT
    // ========================================================================

    if (!Array.isArray(body?.permissions)) {
      throw new BadRequestException(
        "Permissions must be provided as an array.",
      );
    }

    const requestedPermissions =
      Array.from(
        new Set<string>(
          body.permissions
            .map((permission: unknown) =>
              String(permission ?? "")
                .trim()
                .toLowerCase(),
            )
            .filter(
              (permission: string) =>
                permission.length > 0,
            ),
        ),
      );

    // ========================================================================
    // VALID PERMISSION CATALOG
    // ========================================================================

    const validPermissions =
      new Set<string>(
        (
          Object.values(Permission) as string[]
        ).map((permission: string) =>
          String(permission)
            .trim()
            .toLowerCase(),
        ),
      );

    const invalidPermissions =
      requestedPermissions.filter(
        (permission: string) =>
          !validPermissions.has(permission),
      );

    if (invalidPermissions.length > 0) {
      throw new BadRequestException({
        message:
          "One or more permissions are invalid.",
        invalidPermissions,
      });
    }

    // ========================================================================
    // LOAD ACTOR FROM DATABASE
    // ========================================================================

    const databaseActor =
      (await this.userModel
        .findById(actorId)
        .select(
          "_id role isSuperAdmin isActive permissions",
        )
        .lean()
        .exec()) as SecurityUserRecord | null;

    if (!databaseActor) {
      throw new UnauthorizedException(
        "Authenticated user was not found.",
      );
    }

    if (!Boolean(databaseActor.isActive)) {
      throw new ForbiddenException(
        "Your account is disabled.",
      );
    }

    // ========================================================================
    // ACTOR SECURITY LEVEL
    // ========================================================================

    const actorRole =
      this.normalizeRole(
        databaseActor.role,
      );

    const actorIsSuperAdmin =
      Boolean(databaseActor.isSuperAdmin) ||
      actorRole === "super_admin";

    // ========================================================================
    // LOAD TARGET USER
    // ========================================================================

    const targetUser =
      (await this.userModel
        .findById(id)
        .select(
          "_id role isSuperAdmin isActive permissions",
        )
        .lean()
        .exec()) as SecurityUserRecord | null;

    if (!targetUser) {
      throw new NotFoundException(
        "User not found.",
      );
    }

    if (!Boolean(targetUser.isActive)) {
      throw new ForbiddenException(
        "Permissions cannot be changed for a disabled account.",
      );
    }

    // ========================================================================
    // TARGET SECURITY LEVEL
    // ========================================================================

    const targetRole =
      this.normalizeRole(
        targetUser.role,
      );

    const targetIsSuperAdmin =
      Boolean(targetUser.isSuperAdmin) ||
      targetRole === "super_admin";

    // ========================================================================
    // PROTECT ADMINISTRATIVE ACCOUNTS
    // ========================================================================

    /*
     * Only Super Admin may modify another Super Admin.
     */
    if (
      targetIsSuperAdmin &&
      !actorIsSuperAdmin
    ) {
      throw new ForbiddenException(
        "Only a Super Admin can modify another Super Admin's permissions.",
      );
    }

    /*
     * Only Super Admin may modify another Admin's
     * direct permissions.
     *
     * This prevents Admin A from changing Admin B's
     * privileges.
     */
    if (
      targetRole === "admin" &&
      !actorIsSuperAdmin
    ) {
      throw new ForbiddenException(
        "Only a Super Admin can modify an Admin's permissions.",
      );
    }

    // ========================================================================
    // PREVIOUS PERMISSIONS
    // ========================================================================

    const previousPermissions =
      this.normalizePermissions(
        targetUser.permissions,
      );

    // ========================================================================
    // SELF-PERMISSION ESCALATION
    // ========================================================================

    const isSelfUpdate =
      String(targetUser._id) === actorId;

    if (
      isSelfUpdate &&
      !actorIsSuperAdmin
    ) {
      const actorEffectivePermissions =
        this.getEffectiveActorPermissions(
          databaseActor,
        );

      const addedPermissions =
        requestedPermissions.filter(
          (permission: string) =>
            !actorEffectivePermissions.has(
              permission,
            ),
        );

      if (addedPermissions.length > 0) {
        throw new ForbiddenException(
          "You cannot grant additional permissions to your own account.",
        );
      }
    }

    // ========================================================================
    // SUPER-ADMIN-ONLY PERMISSIONS
    // ========================================================================

    const requestedSuperAdminPermissions =
      requestedPermissions.filter(
        (permission: string) =>
          SUPER_ADMIN_ONLY_PERMISSIONS.has(
            permission,
          ),
      );

    if (
      requestedSuperAdminPermissions.length > 0 &&
      !actorIsSuperAdmin
    ) {
      throw new ForbiddenException(
        "Super admin privileges are required to grant one or more of the requested permissions.",
      );
    }

    // ========================================================================
    // NON-SUPER-ADMIN PERMISSION BOUNDARY
    // ========================================================================

    /*
     * A non-Super-Admin may never grant a permission
     * that they themselves do not effectively possess.
     *
     * This protects against privilege escalation through
     * permission assignment.
     */
    if (!actorIsSuperAdmin) {
      const actorEffectivePermissions =
        this.getEffectiveActorPermissions(
          databaseActor,
        );

      const unauthorizedPermissions =
        requestedPermissions.filter(
          (permission: string) =>
            !actorEffectivePermissions.has(
              permission,
            ),
        );

      if (
        unauthorizedPermissions.length > 0
      ) {
        throw new ForbiddenException({
          message:
            "You cannot grant permissions that you do not possess.",
          unauthorizedPermissions,
        });
      }
    }

    // ========================================================================
    // CALCULATE CHANGES
    // ========================================================================

    const addedPermissions =
      requestedPermissions.filter(
        (permission: string) =>
          !previousPermissions.includes(
            permission,
          ),
      );

    const removedPermissions =
      previousPermissions.filter(
        (permission: string) =>
          !requestedPermissions.includes(
            permission,
          ),
      );

    // ========================================================================
    // DATABASE UPDATE
    // ========================================================================

    const update: Record<string, unknown> = {};

    setIfPresent(
      this.userModel,
      update,
      "permissions",
      requestedPermissions,
    );

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

    // ========================================================================
    // AUDIT
    // ========================================================================

    await this.audit.log({
      userId: actorId,
      action: "USER_PERMISSIONS_UPDATED",
      module: "users",
      targetId: id,
      metadata: {
        previousPermissions,
        permissions: requestedPermissions,
        addedPermissions,
        removedPermissions,
        targetWasSuperAdmin:
          targetIsSuperAdmin,
        actorWasSuperAdmin:
          actorIsSuperAdmin,
        reason: body?.reason ?? null,
      },
      ip:
        req?.ip ??
        req?.headers?.["x-forwarded-for"] ??
        req?.headers?.["x-real-ip"] ??
        null,
      userAgent:
        req?.headers?.["user-agent"] ??
        null,
    });

    // ========================================================================
    // RESPONSE
    // ========================================================================

    return normalizeUser(user);
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private getActorId(
    actor: any,
  ): string | null {
    const value =
      actor?._id ??
      actor?.id ??
      actor?.userId ??
      actor?.sub;

    if (
      value === undefined ||
      value === null
    ) {
      return null;
    }

    const normalized =
      String(value).trim();

    return normalized || null;
  }

  private normalizeRole(
    role: unknown,
  ): string {
    return String(role ?? "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");
  }

  private normalizePermissions(
    permissions: unknown,
  ): string[] {
    if (!Array.isArray(permissions)) {
      return [];
    }

    return Array.from(
      new Set<string>(
        permissions
          .map((permission: unknown) =>
            String(permission ?? "")
              .trim()
              .toLowerCase(),
          )
          .filter(
            (permission: string) =>
              permission.length > 0,
          ),
      ),
    );
  }

  /**
   * Build the actor's effective permission set.
   *
   * This includes:
   * - system role permissions
   * - direct database permissions
   *
   * Super Admin is handled separately because it
   * already has unrestricted access.
   */
  private getEffectiveActorPermissions(
    actor: SecurityUserRecord,
  ): Set<string> {
    const permissions =
      new Set<string>();

    const role =
      this.normalizeRole(actor.role);

    let systemRole:
      | Role
      | undefined;

    switch (role) {
      case "user":
        systemRole = Role.USER;
        break;

      case "moderator":
        systemRole = Role.MODERATOR;
        break;

      case "admin":
        systemRole = Role.ADMIN;
        break;

      case "super_admin":
        systemRole = Role.SUPER_ADMIN;
        break;
    }

    if (systemRole) {
      const rolePermissions =
        RolePermissions[systemRole] ?? [];

      for (
        const permission
        of rolePermissions
      ) {
        permissions.add(
          String(permission)
            .trim()
            .toLowerCase(),
        );
      }
    }

    for (
      const permission
      of this.normalizePermissions(
        actor.permissions,
      )
    ) {
      permissions.add(permission);
    }

    return permissions;
  }
}