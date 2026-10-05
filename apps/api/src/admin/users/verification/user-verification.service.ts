import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import { User, UserDocument } from "../../../users/user.schema";
import { AuditService } from "../../audit/audit.service";
import { normalizeUser } from "../user-admin-utils";

@Injectable()
export class UserVerificationService {
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

    const actorRole = this.normalizeRole(
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

    const targetUser = await this.userModel
      .findById(id)
      .select("_id role isActive")
      .lean()
      .exec();

    if (!targetUser) {
      throw new NotFoundException(
        "User not found.",
      );
    }

    // -------------------------------------------------------------------------
    // PROTECT ADMINISTRATIVE ACCOUNTS
    // -------------------------------------------------------------------------

    const targetRole = this.normalizeRole(
      targetUser.role,
    );

    const targetIsSuperAdmin =
      targetRole === "super_admin";

    const targetIsAdmin =
      targetRole === "admin";

    // Only Super Admin can modify verification
    // status of Admin or Super Admin accounts.
    if (
      !actorIsSuperAdmin &&
      (targetIsSuperAdmin || targetIsAdmin)
    ) {
      throw new ForbiddenException(
        "Only a Super Admin can modify verification status for an administrator account.",
      );
    }

    // Prevent ordinary Admins from changing
    // their own verification status.
    if (
      !actorIsSuperAdmin &&
      String(targetUser._id) === actorId
    ) {
      throw new ForbiddenException(
        "Administrators cannot change their own verification status.",
      );
    }

    // -------------------------------------------------------------------------
    // VERIFICATION VALUE
    // -------------------------------------------------------------------------

    const verified = Boolean(
      body?.verified,
    );

    const update: Record<
      string,
      unknown
    > = {};

    if (
      this.userModel.schema.path(
        "verified",
      )
    ) {
      update.verified = verified;
    }

    if (
      this.userModel.schema.path(
        "isVerified",
      )
    ) {
      update.isVerified = verified;
    }

    if (
      this.userModel.schema.path(
        "verifiedAt",
      )
    ) {
      update.verifiedAt = verified
        ? new Date()
        : null;
    }

    // Do not silently report success if
    // the schema has no verification fields.
    if (
      Object.keys(update).length === 0
    ) {
      throw new ForbiddenException(
        "This User schema does not support verification updates.",
      );
    }

    // -------------------------------------------------------------------------
    // UPDATE
    // -------------------------------------------------------------------------

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

    // -------------------------------------------------------------------------
    // AUDIT
    // -------------------------------------------------------------------------

    await this.audit.log({
      userId: actorId,
      action: verified
        ? "USER_VERIFIED"
        : "USER_UNVERIFIED",
      module: "users",
      targetId: id,
      metadata: {
        verified,
        reason:
          body?.reason ?? null,
        targetWasAdmin:
          targetIsAdmin,
        targetWasSuperAdmin:
          targetIsSuperAdmin,
        actorWasSuperAdmin:
          actorIsSuperAdmin,
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
        ] ?? null,
    });

    return normalizeUser(user);
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
}