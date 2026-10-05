import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { randomBytes } from "crypto";

import { User, UserDocument } from "../../../users/user.schema";
import { AuditService } from "../../audit/audit.service";
import { normalizeUser, setIfPresent } from "../user-admin-utils";

@Injectable()
export class UserSecurityService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly audit: AuditService,
  ) {}

  // ---------------------------------------------------------------------------
  // ROLE HELPERS
  // ---------------------------------------------------------------------------

  private normalizeRole(value: unknown): string {
    return String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");
  }

  private isSuperAdmin(actor: any): boolean {
    if (!actor) return false;

    if (actor.isSuperAdmin === true) {
      return true;
    }

    return this.normalizeRole(actor.role) === "super_admin";
  }

  private isAdminOrHigher(actor: any): boolean {
    if (!actor) return false;

    const role = this.normalizeRole(actor.role);

    return (
      role === "admin" ||
      role === "super_admin" ||
      actor.isSuperAdmin === true
    );
  }

  private actorId(actor: any): string {
    return String(actor?._id ?? actor?.id ?? "");
  }

  // ---------------------------------------------------------------------------
  // ACTOR AUTHORIZATION
  // ---------------------------------------------------------------------------

  private requireActor(actor: any): void {
    if (!actor || !this.actorId(actor)) {
      throw new UnauthorizedException("Authentication required.");
    }

    if (!this.isAdminOrHigher(actor)) {
      throw new ForbiddenException(
        "Administrator privileges are required.",
      );
    }
  }

  // ---------------------------------------------------------------------------
  // TARGET SECURITY
  // ---------------------------------------------------------------------------

  private async getTarget(id: string): Promise<any> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException("User not found");
    }

    const target = await this.userModel
      .findById(id)
      .select("_id role")
      .lean()
      .exec();

    if (!target) {
      throw new NotFoundException("User not found");
    }

    return target;
  }

  private async protectTarget(actor: any, id: string): Promise<any> {
    this.requireActor(actor);

    const target = await this.getTarget(id);

    const actorId = this.actorId(actor);
    const targetId = String(target._id);

    const actorIsSuperAdmin = this.isSuperAdmin(actor);
    const targetRole = this.normalizeRole(target.role);

    // Prevent an administrator from modifying their own security state
    // through these administrative security actions.
    if (!actorIsSuperAdmin && actorId === targetId) {
      throw new ForbiddenException(
        "Administrators cannot change their own security state.",
      );
    }

    // Only Super Admin can operate on Admin or Super Admin accounts.
    if (
      !actorIsSuperAdmin &&
      (targetRole === "admin" || targetRole === "super_admin")
    ) {
      throw new ForbiddenException(
        "Only a Super Admin can modify an administrator account.",
      );
    }

    return target;
  }

  // ---------------------------------------------------------------------------
  // LOCK USER
  // ---------------------------------------------------------------------------

  async lock(id: string, body: any, actor: any, req: any) {
    await this.protectTarget(actor, id);

    const minutes = Math.min(
      60 * 24 * 30,
      Math.max(1, Number(body?.minutes ?? 60)),
    );

    const until = new Date(Date.now() + minutes * 60_000);

    const update: any = {};

    setIfPresent(
      this.userModel,
      update,
      "lockedUntil",
      until,
    );

    setIfPresent(
      this.userModel,
      update,
      "status",
      "locked",
    );

    setIfPresent(
      this.userModel,
      update,
      "isActive",
      false,
    );

    const user = await this.userModel
      .findByIdAndUpdate(
        id,
        { $set: update },
        { new: true },
      )
      .select("-password -passwordHash")
      .lean()
      .exec();

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Increment lockout counter only when the schema supports it.
    if (this.userModel.schema.path("lockoutCount")) {
      await this.userModel
        .updateOne(
          { _id: id },
          { $inc: { lockoutCount: 1 } },
        )
        .exec();
    }

    await this.audit.log({
      userId: this.actorId(actor),
      action: "USER_LOCKED",
      module: "users",
      targetId: id,
      metadata: {
        reason: body?.reason ?? null,
        minutes,
      },
      ip: req?.ip,
      userAgent: req?.headers?.["user-agent"],
    });

    return normalizeUser(user);
  }

  // ---------------------------------------------------------------------------
  // UNLOCK USER
  // ---------------------------------------------------------------------------

  async unlock(
    id: string,
    actor: any,
    req: any,
  ) {
    await this.protectTarget(actor, id);

    const update: any = {};

    setIfPresent(
      this.userModel,
      update,
      "lockedUntil",
      null,
    );

    setIfPresent(
      this.userModel,
      update,
      "status",
      "active",
    );

    setIfPresent(
      this.userModel,
      update,
      "isActive",
      true,
    );

    setIfPresent(
      this.userModel,
      update,
      "failedLoginAttempts",
      0,
    );

    const user = await this.userModel
      .findByIdAndUpdate(
        id,
        { $set: update },
        { new: true },
      )
      .select("-password -passwordHash")
      .lean()
      .exec();

    if (!user) {
      throw new NotFoundException("User not found");
    }

    await this.audit.log({
      userId: this.actorId(actor),
      action: "USER_UNLOCKED",
      module: "users",
      targetId: id,
      ip: req?.ip,
      userAgent: req?.headers?.["user-agent"],
    });

    return normalizeUser(user);
  }

  // ---------------------------------------------------------------------------
  // FORCE PASSWORD CHANGE
  // ---------------------------------------------------------------------------

  async forcePasswordChange(
    id: string,
    actor: any,
    req: any,
  ) {
    await this.protectTarget(actor, id);

    const update: any = {};

    setIfPresent(
      this.userModel,
      update,
      "mustChangePassword",
      true,
    );

    const user = await this.userModel
      .findByIdAndUpdate(
        id,
        { $set: update },
        { new: true },
      )
      .select("-password -passwordHash")
      .lean()
      .exec();

    if (!user) {
      throw new NotFoundException("User not found");
    }

    await this.audit.log({
      userId: this.actorId(actor),
      action: "USER_FORCE_PASSWORD_CHANGE",
      module: "users",
      targetId: id,
      ip: req?.ip,
      userAgent: req?.headers?.["user-agent"],
    });

    return normalizeUser(user);
  }

  // ---------------------------------------------------------------------------
  // RESET PASSWORD
  // ---------------------------------------------------------------------------

  async resetPassword(
    id: string,
    actor: any,
    req: any,
  ) {
    await this.protectTarget(actor, id);

    const user = await this.userModel
      .findById(id)
      .exec();

    if (!user) {
      throw new NotFoundException("User not found");
    }

    /*
     * Generate a one-time temporary secret.
     *
     * The plaintext password is NEVER written to the database
     * and NEVER written to logs.
     */
    const temporaryPassword =
      randomBytes(12).toString("base64url");

    const update: any = {};

    const passwordField = this.userModel.schema.path("password")
      ? "password"
      : this.userModel.schema.path("passwordHash")
        ? "passwordHash"
        : null;

    let hashWritten = false;

    if (passwordField) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const bcrypt = require("bcrypt");

        update[passwordField] =
          await bcrypt.hash(
            temporaryPassword,
            12,
          );

        hashWritten = true;
      } catch {
        /*
         * Do not write an incompatible password hash.
         * The account will instead be flagged for the
         * application's normal password-reset workflow.
         */
      }
    }

    setIfPresent(
      this.userModel,
      update,
      "mustChangePassword",
      true,
    );

    setIfPresent(
      this.userModel,
      update,
      "passwordResetByAdmin",
      true,
    );

    setIfPresent(
      this.userModel,
      update,
      "passwordChangedAt",
      new Date(),
    );

    await this.userModel
      .updateOne(
        { _id: id },
        { $set: update },
      )
      .exec();

    await this.audit.log({
      userId: this.actorId(actor),
      action: "USER_PASSWORD_RESET",
      module: "users",
      targetId: id,
      metadata: {
        hashWritten,
      },
      ip: req?.ip,
      userAgent: req?.headers?.["user-agent"],
    });

    return {
      success: true,
      message: hashWritten
        ? "Password reset and change required at next login."
        : "Password reset workflow flagged; connect this action to the application password-reset service.",
    };
  }
}