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
import {
  normalizeUser,
  setIfPresent,
} from "../user-admin-utils";

@Injectable()
export class FockisIdAccessService {
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

    const targetUser =
      await this.userModel
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

    const targetRole =
      this.normalizeRole(
        targetUser.role,
      );

    const targetIsSuperAdmin =
      targetRole === "super_admin";

    const targetIsAdmin =
      targetRole === "admin";

    /*
     * Only Super Admin may modify Fockis ID
     * access on another administrator account.
     */
    if (
      !actorIsSuperAdmin &&
      (targetIsSuperAdmin ||
        targetIsAdmin)
    ) {
      throw new ForbiddenException(
        "Only a Super Admin can modify Fockis ID access for an administrator account.",
      );
    }

    /*
     * Prevent ordinary Admins from changing
     * their own administrative access.
     */
    if (
      !actorIsSuperAdmin &&
      String(targetUser._id) === actorId
    ) {
      throw new ForbiddenException(
        "Administrators cannot modify their own Fockis ID access.",
      );
    }

    // -------------------------------------------------------------------------
    // ACCESS VALUE
    // -------------------------------------------------------------------------

    const paid = Boolean(
      body?.fockisIdAccessPaid,
    );

    const update: Record<
      string,
      unknown
    > = {};

    setIfPresent(
      this.userModel,
      update,
      "fockisIdAccessPaid",
      paid,
    );

    if (paid) {
      setIfPresent(
        this.userModel,
        update,
        "fockisIdAccessPaidAt",
        new Date(),
      );
    } else {
      setIfPresent(
        this.userModel,
        update,
        "fockisIdAccessPaidAt",
        null,
      );
    }

    if (
      Object.keys(update).length === 0
    ) {
      throw new ForbiddenException(
        "This User schema does not support Fockis ID access updates.",
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
      action: paid
        ? "FOCKIS_ID_ACCESS_GRANTED"
        : "FOCKIS_ID_ACCESS_REVOKED",
      module: "users",
      targetId: id,
      metadata: {
        fockisIdAccessPaid: paid,
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