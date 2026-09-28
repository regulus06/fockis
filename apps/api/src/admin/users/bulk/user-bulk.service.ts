import {
  Injectable,
  ForbiddenException,
} from "@nestjs/common";

import {
  InjectModel,
} from "@nestjs/mongoose";

import {
  Model,
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
    const ids =
      Array.isArray(body?.userIds)
        ? body.userIds
            .map(String)
            .filter(Boolean)
        : [];

    const action =
      String(
        body?.action ?? "",
      );

    if (!ids.length) {
      return {
        success: false,
        affected: 0,
        failed: 0,
        message:
          "No users selected",
      };
    }

    if (
      action === "delete" &&
      !actor?.isSuperAdmin &&
      actor?.role !== "super_admin"
    ) {
      throw new ForbiddenException(
        "Super admin required for bulk deletion",
      );
    }

    const update: any = {};

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

    await this.audit.log({
      userId:
        String(
          actor?._id ??
          actor?.id,
        ),

      action:
        "USER_BULK_ACTION",

      module: "users",

      metadata: {
        action,
        userIds: ids,
        reason:
          body?.reason ?? null,
      },

      ip: req?.ip,

      userAgent:
        req?.headers?.[
          "user-agent"
        ],
    });

    const affected =
      result.modifiedCount ?? 0;

    const matched =
      result.matchedCount ??
      ids.length;

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
}