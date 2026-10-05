import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";

import {
  InjectModel,
} from "@nestjs/mongoose";

import {
  Model,
  Types,
} from "mongoose";

import {
  User,
  UserDocument,
} from "../../../users/user.schema";

import {
  AuditService,
} from "../../audit/audit.service";

import {
  setIfPresent,
} from "../user-admin-utils";

@Injectable()
export class UserBulkService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel:
      Model<UserDocument>,

    private readonly audit:
      AuditService,
  ) {}

  async execute(
    body: any,
    actor: any,
    req: any,
  ) {
    // ========================================================================
    // AUTHENTICATION
    // ========================================================================

    if (!actor) {
      throw new UnauthorizedException(
        "Authentication required.",
      );
    }

    const actorId = String(
      actor?._id ??
      actor?.id ??
      actor?.userId ??
      actor?.sub ??
      "",
    ).trim();

    if (!actorId) {
      throw new UnauthorizedException(
        "Authenticated user ID is missing.",
      );
    }

    // ========================================================================
    // ACTOR ROLE
    // ========================================================================

    const actorRole =
      this.normalizeRole(
        actor?.role,
      );

    const actorIsSuperAdmin =
      actor?.isSuperAdmin === true ||
      actorRole === "super_admin";

    const actorIsAdmin =
      actorIsSuperAdmin ||
      actorRole === "admin";

    if (!actorIsAdmin) {
      throw new ForbiddenException(
        "Administrator privileges are required for bulk user actions.",
      );
    }

    // ========================================================================
    // USER IDS
    // ========================================================================

    const rawIds =
      Array.isArray(body?.userIds)
        ? body.userIds
        : [];

    if (!rawIds.length) {
      return {
        success: false,
        affected: 0,
        failed: 0,
        message:
          "No users selected",
      };
    }

    /*
     * Explicitly type the Set and resulting array as string[].
     *
     * This prevents TypeScript from inferring unknown[] and causing
     * errors when filter() and map() receive string callbacks.
     */
    const uniqueIds: string[] =
      Array.from(
        new Set<string>(
          rawIds
            .map((value: unknown) =>
              String(value ?? "").trim(),
            )
            .filter(
              (value: string) =>
                value.length > 0,
            ),
        ),
      );

    const invalidIds =
      uniqueIds.filter(
        (id) =>
          !Types.ObjectId.isValid(id),
      );

    if (invalidIds.length > 0) {
      throw new BadRequestException({
        message:
          "One or more user IDs are invalid.",
        invalidIds,
      });
    }

    const ids: Types.ObjectId[] =
      uniqueIds.map(
        (id) =>
          new Types.ObjectId(id),
      );

    // ========================================================================
    // ACTION
    // ========================================================================

    const action =
      String(
        body?.action ?? "",
      )
        .trim()
        .toLowerCase();

    const allowedActions = new Set([
      "activate",
      "deactivate",
      "suspend",
      "unlock",
      "verify",
      "unverify",
      "delete",
    ]);

    if (!allowedActions.has(action)) {
      return {
        success: false,
        affected: 0,
        failed: ids.length,
        message:
          "Unsupported bulk action",
      };
    }

    // ========================================================================
    // LOAD TARGET USERS
    // ========================================================================

    const targetUsers =
      await this.userModel
        .find({
          _id: {
            $in: ids,
          },
        })
        .select(
          "_id role isSuperAdmin isActive",
        )
        .lean()
        .exec();

    if (!targetUsers.length) {
      return {
        success: false,
        affected: 0,
        failed: ids.length,
        message:
          "No matching users found.",
      };
    }

    // ========================================================================
    // PROTECT PRIVILEGED ACCOUNTS
    // ========================================================================

    const protectedUserIds =
      targetUsers
        .filter((user: any) => {
          const role =
            this.normalizeRole(
              user?.role,
            );

          const isSuperAdmin =
            user?.isSuperAdmin === true ||
            role === "super_admin";

          const isAdmin =
            role === "admin";

          /*
           * Non-Super-Admins cannot bulk modify
           * Admin or Super Admin accounts.
           */
          return (
            !actorIsSuperAdmin &&
            (isSuperAdmin || isAdmin)
          );
        })
        .map((user: any) =>
          String(user._id),
        );

    if (
      protectedUserIds.length > 0
    ) {
      throw new ForbiddenException({
        message:
          "You cannot perform bulk actions on Admin or Super Admin accounts.",
        protectedUserIds,
      });
    }

    // ========================================================================
    // DELETE
    // ========================================================================

    if (
      action === "delete" &&
      !actorIsSuperAdmin
    ) {
      throw new ForbiddenException(
        "Super admin privileges are required for bulk deletion.",
      );
    }

    /*
     * Even a Super Admin should not accidentally bulk-delete
     * their own account.
     */
    if (action === "delete") {
      const selfIncluded =
        ids.some(
          (id) =>
            String(id) === actorId,
        );

      if (selfIncluded) {
        throw new ForbiddenException(
          "You cannot bulk-delete your own account.",
        );
      }
    }

    // ========================================================================
    // BUILD UPDATE
    // ========================================================================

    const update: Record<
      string,
      unknown
    > = {};

    if (
      [
        "activate",
        "deactivate",
        "suspend",
        "unlock",
      ].includes(action)
    ) {
      const status =
        action === "activate" ||
        action === "unlock"
          ? "active"
          : action === "deactivate"
            ? "inactive"
            : "suspended";

      setIfPresent(
        this.userModel,
        update,
        "status",
        status,
      );

      setIfPresent(
        this.userModel,
        update,
        "isActive",
        status === "active",
      );

      if (action === "unlock") {
        setIfPresent(
          this.userModel,
          update,
          "lockedUntil",
          null,
        );

        setIfPresent(
          this.userModel,
          update,
          "failedLoginAttempts",
          0,
        );
      }
    }

    // ========================================================================
    // VERIFICATION
    // ========================================================================

    if (
      action === "verify" ||
      action === "unverify"
    ) {
      if (
        this.userModel.schema.path(
          "verified",
        )
      ) {
        update.verified =
          action === "verify";
      }

      if (
        this.userModel.schema.path(
          "isVerified",
        )
      ) {
        update.isVerified =
          action === "verify";
      }
    }

    // ========================================================================
    // SOFT DELETE
    // ========================================================================

    if (action === "delete") {
      setIfPresent(
        this.userModel,
        update,
        "status",
        "deleted",
      );

      setIfPresent(
        this.userModel,
        update,
        "isActive",
        false,
      );
    }

    if (
      !Object.keys(update).length
    ) {
      return {
        success: false,
        affected: 0,
        failed: ids.length,
        message:
          "Unsupported bulk action",
      };
    }

    // ========================================================================
    // DATABASE UPDATE
    // ========================================================================

    const result =
      await this.userModel
        .updateMany(
          {
            _id: {
              $in: ids,
            },
          },
          {
            $set: update,
          },
        )
        .exec();

    // ========================================================================
    // AUDIT
    // ========================================================================

    await this.audit.log({
      userId: actorId,
      action:
        "USER_BULK_ACTION",
      module: "users",
      metadata: {
        action,
        userIds:
          ids.map(String),
        affected:
          result.modifiedCount ?? 0,
        reason:
          body?.reason ?? null,
      },
      ip:
        req?.ip ??
        req?.headers?.[
          "x-forwarded-for"
        ] ??
        req?.headers?.[
          "x-real-ip"
        ] ??
        null,
      userAgent:
        req?.headers?.[
          "user-agent"
        ] ??
        null,
    });

    // ========================================================================
    // RESULT
    // ========================================================================

    const affected =
      result.modifiedCount ?? 0;

    const matched =
      result.matchedCount ??
      targetUsers.length;

    const failed =
      Math.max(
        0,
        ids.length - matched,
      );

    return {
      success: true,
      affected,
      failed,
      message:
        `Bulk action ${action} completed`,
    };
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private normalizeRole(
    role: unknown,
  ): string {
    return String(role ?? "")
      .trim()
      .toLowerCase()
      .replace(
        /[\s-]+/g,
        "_",
      );
  }
}