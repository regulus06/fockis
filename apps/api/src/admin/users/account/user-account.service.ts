import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";

import { InjectModel } from "@nestjs/mongoose";

import {
  Model,
  Types,
} from "mongoose";

import {
  User,
  UserDocument,
} from "../../../users/user.schema";

import { AuditService } from "../../audit/audit.service";

import {
  normalizeUser,
  setIfPresent,
} from "../user-admin-utils";

@Injectable()
export class UserAccountService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel:
      Model<UserDocument>,

    private readonly audit:
      AuditService,
  ) {}

  // ==========================================================================
  // UPDATE ACCOUNT STATUS
  // ==========================================================================

  async updateStatus(
    id: string,
    body: any,
    actor: any,
    req: any,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(
        "Invalid user ID.",
      );
    }

    if (!actor) {
      throw new UnauthorizedException(
        "Authentication required.",
      );
    }

    const actorId =
      this.getActorId(actor);

    if (!actorId) {
      throw new UnauthorizedException(
        "Authenticated user ID is missing.",
      );
    }

    const actorIsSuperAdmin =
      this.isSuperAdmin(actor);

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

    const targetRole =
      this.normalizeRole(
        targetUser.role,
      );

    const targetIsSuperAdmin =
      targetRole === "super_admin";

    const targetIsAdmin =
      targetRole === "admin";

    /*
     * Only Super Admin may modify another
     * Super Admin account.
     */
    if (
      targetIsSuperAdmin &&
      !actorIsSuperAdmin
    ) {
      throw new ForbiddenException(
        "Only a Super Admin can change the status of a Super Admin.",
      );
    }

    /*
     * Only Super Admin may modify an Admin account.
     */
    if (
      targetIsAdmin &&
      !actorIsSuperAdmin
    ) {
      throw new ForbiddenException(
        "Only a Super Admin can change the status of an Admin.",
      );
    }

    /*
     * Prevent non-Super-Admins from changing
     * their own account status.
     */
    if (
      String(targetUser._id) === actorId &&
      !actorIsSuperAdmin
    ) {
      throw new ForbiddenException(
        "You cannot change your own account status.",
      );
    }

    const status =
      String(
        body?.status ?? "",
      )
        .trim()
        .toLowerCase();

    const allowedStatuses = [
      "active",
      "inactive",
      "suspended",
      "locked",
      "deleted",
    ];

    if (
      !allowedStatuses.includes(
        status,
      )
    ) {
      throw new BadRequestException(
        "Invalid user status.",
      );
    }

    /*
     * Only Super Admin may delete an account
     * through the status endpoint.
     */
    if (
      status === "deleted" &&
      !actorIsSuperAdmin
    ) {
      throw new ForbiddenException(
        "Super admin privileges are required to delete a user account.",
      );
    }

    const update: Record<
      string,
      unknown
    > = {};

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

    if (status === "locked") {
      setIfPresent(
        this.userModel,
        update,
        "lockedUntil",
        new Date(
          Date.now() +
            60 * 60_000,
        ),
      );
    } else {
      setIfPresent(
        this.userModel,
        update,
        "lockedUntil",
        null,
      );
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
        .select(
          "-password -passwordHash",
        )
        .lean()
        .exec();

    if (!user) {
      throw new NotFoundException(
        "User not found.",
      );
    }

    await this.audit.log({
      userId: actorId,
      action:
        `USER_STATUS_${status.toUpperCase()}`,
      module: "users",
      targetId: id,
      metadata: {
        status,
        targetWasAdmin:
          targetIsAdmin,
        targetWasSuperAdmin:
          targetIsSuperAdmin,
        actorWasSuperAdmin:
          actorIsSuperAdmin,
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

    return normalizeUser(user);
  }

  // ==========================================================================
  // DELETE USER
  // ==========================================================================

  async delete(
    id: string,
    actor: any,
    req: any,
    permanent = false,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(
        "Invalid user ID.",
      );
    }

    if (!actor) {
      throw new UnauthorizedException(
        "Authentication required.",
      );
    }

    const actorId =
      this.getActorId(actor);

    if (!actorId) {
      throw new UnauthorizedException(
        "Authenticated user ID is missing.",
      );
    }

    const actorIsSuperAdmin =
      this.isSuperAdmin(actor);

    /*
     * Account deletion is a destructive
     * administrative operation.
     */
    if (!actorIsSuperAdmin) {
      throw new ForbiddenException(
        "Super admin privileges are required to delete a user.",
      );
    }

    /*
     * Prevent deleting your own account.
     */
    if (actorId === id) {
      throw new ForbiddenException(
        "You cannot delete your own account.",
      );
    }

    const user =
      await this.userModel
        .findById(id)
        .select("_id role")
        .lean()
        .exec();

    if (!user) {
      throw new NotFoundException(
        "User not found.",
      );
    }

    const targetRole =
      this.normalizeRole(
        user.role,
      );

    const targetIsSuperAdmin =
      targetRole === "super_admin";

    /*
     * Do not allow this service to delete
     * another Super Admin.
     */
    if (targetIsSuperAdmin) {
      throw new ForbiddenException(
        "Super Admin accounts cannot be deleted through user administration.",
      );
    }

    if (permanent) {
      await this.userModel
        .deleteOne({
          _id: id,
        })
        .exec();
    } else {
      const update: Record<
        string,
        unknown
      > = {};

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

      await this.userModel
        .updateOne(
          {
            _id: id,
          },
          {
            $set: update,
          },
        )
        .exec();
    }

    await this.audit.log({
      userId: actorId,
      action: permanent
        ? "USER_PERMANENTLY_DELETED"
        : "USER_DELETED",
      module: "users",
      targetId: id,
      metadata: {
        permanent,
        previousRole:
          user.role,
        targetWasSuperAdmin:
          targetIsSuperAdmin,
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

    return {
      success: true,
      message: permanent
        ? "User permanently deleted"
        : "User deleted",
      userId: id,
    };
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
      .replace(
        /[\s-]+/g,
        "_",
      );
  }

  private isSuperAdmin(
    actor: any,
  ): boolean {
    return (
      actor?.isSuperAdmin === true ||
      this.normalizeRole(
        actor?.role,
      ) === "super_admin"
    );
  }
}