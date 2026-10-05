import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { User, UserDocument } from "../../../users/user.schema";
import { AuditService } from "../../audit/audit.service";
import { normalizeUser, setIfPresent } from "../user-admin-utils";

@Injectable()
export class UserProfileService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    private readonly audit: AuditService,
  ) {}

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

    return (
      this.normalizeRole(actor.role) === "super_admin" ||
      (Array.isArray(actor.roles) &&
        actor.roles.some(
          (role: unknown) =>
            this.normalizeRole(role) === "super_admin",
        ))
    );
  }

  private isAdminOrHigher(actor: any): boolean {
    if (!actor) return false;

    const role = this.normalizeRole(actor.role);

    return (
      this.isSuperAdmin(actor) ||
      role === "admin"
    );
  }

  private getActorId(actor: any): string {
    return String(actor?._id ?? actor?.id ?? "").trim();
  }

  async update(
    id: string,
    body: any,
    actor: any,
    req: any,
  ) {
    const actorId = this.getActorId(actor);

    if (!actorId) {
      throw new UnauthorizedException(
        "Authentication required.",
      );
    }

    if (!this.isAdminOrHigher(actor)) {
      throw new ForbiddenException(
        "Admin privileges required.",
      );
    }

    const target = await this.userModel
      .findById(id)
      .select("_id role isActive")
      .lean()
      .exec();

    if (!target) {
      throw new NotFoundException(
        "User not found",
      );
    }

    const targetRole = this.normalizeRole(
      (target as any).role,
    );

    const targetIsSuperAdmin =
      targetRole === "super_admin";

    const actorIsSuperAdmin =
      this.isSuperAdmin(actor);

    /*
     * Non-Super Admins cannot modify Admin or
     * Super Admin profiles.
     */
    if (
      !actorIsSuperAdmin &&
      (targetIsSuperAdmin ||
        targetRole === "admin")
    ) {
      throw new ForbiddenException(
        "Only Super Admins can modify Admin or Super Admin profiles.",
      );
    }

    /*
     * Prevent an Admin from modifying their own
     * privileged profile through this endpoint.
     */
    if (
      !actorIsSuperAdmin &&
      actorId === String(target._id)
    ) {
      throw new ForbiddenException(
        "Admins cannot modify their own administrative profile.",
      );
    }

    const allowed = [
      "firstName",
      "lastName",
      "name",
      "displayName",
      "username",
      "email",
      "phone",
      "bio",
      "location",
      "website",
      "gender",
      "birthDate",
      "countryCode",
      "callingCode",
      "profilePicture",
      "coverPhoto",
      "isPrivate",
    ];

    const update: Record<string, unknown> = {};

    for (const key of allowed) {
      setIfPresent(
        this.userModel,
        update,
        key,
        body?.[key],
      );
    }

    if (Object.keys(update).length === 0) {
      throw new ForbiddenException(
        "No profile fields were provided for update.",
      );
    }

    const user = await this.userModel
      .findByIdAndUpdate(
        id,
        { $set: update },
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
        "User not found",
      );
    }

    await this.audit.log({
      userId: actorId,
      action: "USER_PROFILE_UPDATED",
      module: "users",
      targetId: id,
      metadata: {
        fields: Object.keys(update),
      },
      ip: req?.ip,
      userAgent:
        req?.headers?.["user-agent"],
    });

    return normalizeUser(user);
  }
}