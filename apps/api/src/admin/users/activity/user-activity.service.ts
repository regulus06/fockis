import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import {
  User,
  UserDocument,
} from "../../../users/user.schema";

import {
  AuditLog,
  AuditLogDocument,
} from "../../audit/audit-log.schema";

import {
  limitValue,
  pageValue,
} from "../user-admin-utils";

@Injectable()
export class UserActivityService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    @InjectModel(AuditLog.name)
    private readonly auditModel: Model<AuditLogDocument>,
  ) {}

  async list(
    id: string,
    q: any,
    actor?: any,
  ) {
    // -------------------------------------------------------------------------
    // ACTOR AUTHENTICATION
    // -------------------------------------------------------------------------

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

    if (
      !actorId ||
      !Types.ObjectId.isValid(actorId)
    ) {
      throw new UnauthorizedException(
        "Invalid authenticated user ID.",
      );
    }

    const actorRole =
      this.normalizeRole(actor?.role);

    const actorIsSuperAdmin =
      actor?.isSuperAdmin === true ||
      actorRole === "super_admin";

    const actorIsAdmin =
      actorIsSuperAdmin ||
      actorRole === "admin";

    if (!actorIsAdmin) {
      throw new ForbiddenException(
        "Administrator privileges are required.",
      );
    }

    // -------------------------------------------------------------------------
    // TARGET VALIDATION
    // -------------------------------------------------------------------------

    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(
        "User not found.",
      );
    }

    const targetUser =
      await this.userModel
        .findById(id)
        .select("_id role")
        .lean()
        .exec();

    if (!targetUser) {
      throw new NotFoundException(
        "User not found.",
      );
    }

    // -------------------------------------------------------------------------
    // ADMIN ACCOUNT PROTECTION
    // -------------------------------------------------------------------------

    const targetRole =
      this.normalizeRole(
        targetUser.role,
      );

    const targetIsAdmin =
      targetRole === "admin";

    const targetIsSuperAdmin =
      targetRole === "super_admin";

    /*
     * Activity information can contain sensitive
     * security information. A normal Admin may view
     * ordinary user activity, but only Super Admin
     * may inspect another administrator's activity.
     */
    if (
      !actorIsSuperAdmin &&
      (targetIsAdmin ||
        targetIsSuperAdmin)
    ) {
      throw new ForbiddenException(
        "Only a Super Admin can view activity for an administrator account.",
      );
    }

    // -------------------------------------------------------------------------
    // PAGINATION
    // -------------------------------------------------------------------------

    const limit =
      limitValue(q?.limit);

    const requestedSkip =
      Number(q?.skip ?? 0);

    const safeSkip =
      Number.isFinite(requestedSkip) &&
      requestedSkip >= 0
        ? requestedSkip
        : 0;

    const page = pageValue(
      q?.page,
      Math.floor(
        safeSkip / limit,
      ) + 1,
    );

    // -------------------------------------------------------------------------
    // AUDIT FILTER
    // -------------------------------------------------------------------------

    const filter: Record<
      string,
      any
    > = {
      $or: [
        { userId: id },
        { targetId: id },
      ],
    };

    /*
     * Escape the search string before creating
     * the regular expression. This prevents the
     * supplied activity type from becoming an
     * arbitrary regex pattern.
     */
    if (
      q?.type !== undefined &&
      q?.type !== null &&
      String(q.type).trim()
        .length > 0
    ) {
      const escapedType =
        String(q.type)
          .trim()
          .replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&",
          );

      filter.action =
        new RegExp(
          escapedType,
          "i",
        );
    }

    // -------------------------------------------------------------------------
    // QUERY
    // -------------------------------------------------------------------------

    const [logs, total] =
      await Promise.all([
        this.auditModel
          .find(filter)
          .sort({
            createdAt: -1,
          })
          .skip(
            (page - 1) *
              limit,
          )
          .limit(limit)
          .lean()
          .exec(),

        this.auditModel
          .countDocuments(filter),
      ]);

    // -------------------------------------------------------------------------
    // RESPONSE
    // -------------------------------------------------------------------------

    const items = logs.map(
      (log: any) => ({
        id: String(
          log._id,
        ),

        userId: id,

        type: this.mapType(
          log.action,
        ),

        description:
          log.action,

        ip: log.ip,

        userAgent:
          log.userAgent,

        metadata:
          log.metadata ?? {},

        createdAt:
          log.createdAt,
      }),
    );

    return {
      items,
      activities: items,
      total,
      page,
      limit,
      pages:
        Math.ceil(
          total / limit,
        ),
    };
  }

  // ---------------------------------------------------------------------------
  // ROLE NORMALIZATION
  // ---------------------------------------------------------------------------

  private normalizeRole(
    role: unknown,
  ): string {
    return String(
      role ?? "",
    )
      .trim()
      .toLowerCase()
      .replace(
        /[\s-]+/g,
        "_",
      );
  }

  // ---------------------------------------------------------------------------
  // ACTIVITY TYPE
  // ---------------------------------------------------------------------------

  private mapType(
    action: string,
  ): string {
    const a =
      String(
        action ?? "",
      ).toLowerCase();

    if (
      a.includes("login")
    ) {
      return "login";
    }

    if (
      a.includes("logout")
    ) {
      return "logout";
    }

    if (
      a.includes("profile")
    ) {
      return "profile_update";
    }

    if (
      a.includes("password")
    ) {
      return "password_reset";
    }

    if (
      a.includes("suspend")
    ) {
      return "account_suspended";
    }

    if (
      a.includes("lock")
    ) {
      return "account_locked";
    }

    if (
      a.includes("unlock")
    ) {
      return "account_unlocked";
    }

    if (
      a.includes("created")
    ) {
      return "account_created";
    }

    return "admin_action";
  }
}