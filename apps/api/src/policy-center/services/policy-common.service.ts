import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { Connection, Types } from "mongoose";

import { NotificationsService } from "../../notifications/notifications.service";
import { isSuperAdmin, normalizeRole, type Actor } from "../../reports/utils/actor";
import { POLICY_NOTIFICATION_TYPE } from "../policy.constants";

export interface PolicyPerson {
  id: string;
  username: string;
  name: string;
  avatar: string;
}

export function oid(id: string, label = "record"): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) throw new NotFoundException(`That ${label} was not found.`);
  return new Types.ObjectId(id);
}

export function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** People lookups, staff notifications and request context for the policy module. */
@Injectable()
export class PolicyCommonService {
  private readonly logger = new Logger(PolicyCommonService.name);

  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly notifications: NotificationsService,
  ) {}

  get users() {
    return this.connection.models["User"];
  }

  model(name: string) {
    return this.connection.models[name];
  }

  async people(ids: (string | null | undefined)[]) {
    const unique = Array.from(new Set(ids.map((id) => String(id ?? "")).filter((id) => Types.ObjectId.isValid(id))));
    if (!unique.length || !this.users) return new Map<string, any>();
    const rows = await this.users
      .find({ _id: { $in: unique.map((id) => new Types.ObjectId(id)) } })
      .select("username firstName lastName profilePicture role")
      .lean()
      .exec();
    return new Map(rows.map((u: any) => [String(u._id), u]));
  }

  person(map: Map<string, any>, id: string | null | undefined): PolicyPerson | null {
    if (!id) return null;
    const u = map.get(String(id));
    if (!u) return { id: String(id), username: "", name: id === "system" ? "System" : "", avatar: "" };
    return {
      id: String(u._id),
      username: u.username ?? "",
      name: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || "",
      avatar: u.profilePicture ?? "",
    };
  }

  actorRole(actor: Actor | null | undefined) {
    return isSuperAdmin(actor) ? "super_admin" : normalizeRole(actor?.role) || "user";
  }

  /** Request context for audit entries. No tokens, passwords or payment data. */
  context(req: { ip?: string; headers?: Record<string, unknown> } | undefined) {
    if (!req) return {};
    return { ip: String(req.ip ?? "").slice(0, 64), userAgent: String(req.headers?.["user-agent"] ?? "").slice(0, 200) };
  }

  /** Staff holding a policy permission through a custom role, plus super admins. */
  async staffWith(permission: string, exceptId?: string): Promise<string[]> {
    if (!this.users) return [];
    const roleModel = this.connection.models["AdminRole"];
    const roleIds = roleModel ? (await roleModel.find({ isActive: true, permissions: permission }).select("_id").lean().exec()).map((r: any) => r._id) : [];
    const rows = await this.users
      .find({ $or: [{ role: "super_admin" }, { isSuperAdmin: true }, { permissions: permission }, ...(roleIds.length ? [{ adminRoleId: { $in: roleIds } }] : [])] })
      .select("_id")
      .limit(200)
      .lean()
      .exec();
    return rows.map((u: any) => String(u._id)).filter((id) => id !== exceptId);
  }

  async notify(recipientIds: string[], title: string, message: string, link: string, entityId = "", entityType = "policy") {
    await Promise.all(
      recipientIds.map((recipientId) =>
        this.notifications
          .create({ recipientId, type: POLICY_NOTIFICATION_TYPE, title, message, entityId, entityType, link } as any)
          .catch((error) => this.logger.warn(`Policy notification failed: ${String(error)}`)),
      ),
    );
  }
}
