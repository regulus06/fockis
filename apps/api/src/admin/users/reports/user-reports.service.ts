import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { Connection } from "mongoose";

import {
  limitValue,
  pageValue,
} from "../user-admin-utils";

@Injectable()
export class UserReportsService {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
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
      this.normalizeRole(actor.role) ===
        "super_admin" ||
      (Array.isArray(actor.roles) &&
        actor.roles.some(
          (role: unknown) =>
            this.normalizeRole(role) ===
            "super_admin",
        ))
    );
  }

  private isAdminOrHigher(actor: any): boolean {
    return (
      this.isSuperAdmin(actor) ||
      this.normalizeRole(actor?.role) ===
        "admin"
    );
  }

  private getActorId(actor: any): string {
    return String(
      actor?._id ??
        actor?.id ??
        actor?.userId ??
        actor?.sub ??
        "",
    ).trim();
  }

  private async authorize(
    userId: string,
    actor: any,
  ): Promise<void> {
    const actorId =
      this.getActorId(actor);

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

    const userModel =
      this.connection.models["User"];

    if (!userModel) {
      throw new ForbiddenException(
        "User model is unavailable.",
      );
    }

    const target = await userModel
      .findById(userId)
      .select("_id role isActive")
      .lean()
      .exec();

    if (!target) {
      throw new ForbiddenException(
        "User not found.",
      );
    }

    const targetRole =
      this.normalizeRole(
        target.role,
      );

    /*
     * Only Super Admins can inspect reports
     * involving Admin or Super Admin accounts.
     */
    if (
      !this.isSuperAdmin(actor) &&
      (targetRole === "admin" ||
        targetRole === "super_admin")
    ) {
      throw new ForbiddenException(
        "Only Super Admins can view reports involving Admin or Super Admin accounts.",
      );
    }
  }

  async list(
    userId: string,
    q: any = {},
    actor: any,
  ) {
    await this.authorize(
      userId,
      actor,
    );

    const names = [
      "Report",
      "UserReport",
      "ModerationReport",
    ];

    const limit = Math.min(
      Math.max(
        Number(
          limitValue(q?.limit),
        ) || 25,
        1,
      ),
      100,
    );

    const requestedPage =
      Math.max(
        Number(
          pageValue(q?.page),
        ) || 1,
        1,
      );

    const requestedSkip =
      Number(q?.skip);

    const skip =
      Number.isFinite(
        requestedSkip,
      ) &&
      requestedSkip >= 0
        ? Math.floor(
            requestedSkip,
          )
        : (requestedPage - 1) *
          limit;

    for (const name of names) {
      const model =
        this.connection.models[name];

      if (!model) continue;

      const filter: any = {
        $or: [
          { reportedUserId: userId },
          { userId },
          { targetUserId: userId },
        ],
      };

      if (q?.status) {
        filter.status = String(
          q.status,
        ).trim();
      }

      if (q?.type) {
        filter.type = String(
          q.type,
        ).trim();
      }

      const [
        docs,
        total,
      ] = await Promise.all([
        model
          .find(filter)
          .sort({
            createdAt: -1,
          })
          .skip(skip)
          .limit(limit)
          .lean()
          .exec(),

        model.countDocuments(
          filter,
        ),
      ]);

      const items = docs.map(
        (x: any) => ({
          ...x,

          id: String(x._id),

          _id: String(x._id),

          reportedUserId:
            String(
              x.reportedUserId ??
                userId,
            ),

          type:
            x.type ?? "other",

          reason:
            x.reason ?? "",

          description:
            x.description,

          status:
            x.status ?? "open",

          priority:
            x.priority ?? "medium",

          createdAt:
            x.createdAt,

          updatedAt:
            x.updatedAt,
        }),
      );

      return {
        items,
        reports: items,
        total,
        page:
          Math.floor(
            skip / limit,
          ) + 1,
        limit,
        pages: Math.ceil(
          total / limit,
        ),
      };
    }

    return {
      items: [],
      reports: [],
      total: 0,
      page: 1,
      limit,
      pages: 0,
    };
  }
}