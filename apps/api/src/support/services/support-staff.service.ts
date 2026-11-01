import { Injectable, Logger, Optional } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { Connection, Types } from "mongoose";

import { NotificationsService } from "../../notifications/notifications.service";
import { SUPPORT_NOTIFICATION_TYPE } from "../support.constants";

export interface StaffPerson {
  id: string;
  username: string;
  name: string;
  avatar: string;
}

// System roles that carry support.view (see admin/rbac/role-permissions.ts).
const STAFF_ROLES = ["moderator", "admin", "super_admin"];

/**
 * People who can work on support (admins, super admins and anyone whose
 * custom admin role includes support.view), plus user lookups and
 * notifications for the support module.
 */
@Injectable()
export class SupportStaffService {
  private readonly logger = new Logger(SupportStaffService.name);
  private cache: { at: number; ids: string[] } | null = null;

  constructor(
    @InjectConnection() private readonly connection: Connection,
    @Optional() private readonly notifications?: NotificationsService,
  ) {}

  person(user: any): StaffPerson | null {
    if (!user) return null;
    return {
      id: String(user._id),
      username: String(user.username ?? ""),
      name:
        user.name ||
        [user.firstName, user.lastName].filter(Boolean).join(" ") ||
        String(user.username ?? ""),
      avatar: String(user.profilePicture ?? ""),
    };
  }

  async usersById(ids: unknown[]): Promise<Map<string, any>> {
    const userModel = this.connection.models["User"];
    const valid = Array.from(
      new Set(
        ids
          .map((id) => String(id ?? ""))
          .filter((id) => Types.ObjectId.isValid(id)),
      ),
    );

    if (!userModel || !valid.length) return new Map();

    const rows = await userModel
      .find({ _id: { $in: valid.map((id) => new Types.ObjectId(id)) } })
      .select(
        "username firstName lastName name email profilePicture role createdAt",
      )
      .lean()
      .exec();

    return new Map(rows.map((row: any) => [String(row._id), row]));
  }

  /** Role filter for support staff. */
  private async staffFilter() {
    const roleModel = this.connection.models["AdminRole"];
    const roleIds = roleModel
      ? (
          await roleModel
            .find({ isActive: true, permissions: "support.view" })
            .select("_id")
            .lean()
            .exec()
        ).map((role: any) => role._id)
      : [];

    return {
      isActive: { $ne: false },
      $or: [
        { role: { $in: STAFF_ROLES } },
        { isSuperAdmin: true },
        ...(roleIds.length ? [{ adminRoleId: { $in: roleIds } }] : []),
      ],
    };
  }

  async list(): Promise<StaffPerson[]> {
    const userModel = this.connection.models["User"];
    if (!userModel) return [];

    const rows = await userModel
      .find(await this.staffFilter())
      .select("username firstName lastName name profilePicture")
      .limit(200)
      .lean()
      .exec();

    return rows.map((row: any) => this.person(row)!).filter(Boolean);
  }

  async isStaff(id: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) return false;
    const userModel = this.connection.models["User"];
    if (!userModel) return false;

    return Boolean(
      await userModel.exists({
        _id: new Types.ObjectId(id),
        ...(await this.staffFilter()),
      }),
    );
  }

  private async staffIds(): Promise<string[]> {
    if (this.cache && Date.now() - this.cache.at < 5 * 60_000) {
      return this.cache.ids;
    }

    const ids = (await this.list()).map((person) => person.id).slice(0, 50);
    this.cache = { at: Date.now(), ids };
    return ids;
  }

  async notify(
    recipientId: string,
    title: string,
    message: string,
    link: string,
    entityId: string,
    entityType: string,
  ) {
    if (!this.notifications || !Types.ObjectId.isValid(recipientId)) return;

    try {
      await this.notifications.create({
        recipientId,
        type: SUPPORT_NOTIFICATION_TYPE,
        title,
        message,
        link,
        entityId,
        entityType,
      });
    } catch (error) {
      // A notification failure never fails the support action itself.
      this.logger.warn(`Could not notify ${recipientId}: ${String(error)}`);
    }
  }

  /** Tells the assignee, or every support staff member when nobody is assigned. */
  async notifyStaff(
    assignee: unknown,
    title: string,
    message: string,
    link: string,
    entityId: string,
    entityType: string,
    exceptId?: string,
  ) {
    const target = assignee ? [String(assignee)] : await this.staffIds();

    await Promise.all(
      target
        .filter((id) => id !== exceptId)
        .map((id) =>
          this.notify(id, title, message, link, entityId, entityType),
        ),
    );
  }
}
