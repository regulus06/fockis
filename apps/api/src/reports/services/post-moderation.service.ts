import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { Connection, Types } from "mongoose";

import { NotificationsService } from "../../notifications/notifications.service";
import { MODERATION_NOTIFICATION_TYPE } from "../reports.constants";
import { actorId, isSuperAdmin } from "../utils/actor";
import type { Actor } from "../utils/actor";
import { ModerationEventsService } from "./moderation-events.service";

const OPEN_CASE_STATUSES = ["pending", "under_review", "action_required", "escalated"];
const PAGE_SIZE = 20;

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface PostListQuery {
  status?: "visible" | "hidden" | "all";
  type?: string;
  search?: string;
  author?: string;
  escalated?: boolean;
  page?: number;
}

/**
 * Direct moderation of user posts from the Admin Center: hide, restore,
 * warn, escalate and (super admin only) permanently remove.
 *
 * Hiding is the same reversible soft flag used by report cases
 * (moderationStatus = "removed"): the post stays in the database, drops out
 * of feeds, profiles and single-post views, and can be restored.
 */
@Injectable()
export class PostModerationService {
  private readonly logger = new Logger(PostModerationService.name);

  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly events: ModerationEventsService,
    private readonly notifications: NotificationsService,
  ) {}

  private get posts() {
    const model = this.connection.models["Post"];
    if (!model) throw new NotFoundException("Posts are not available.");
    return model;
  }

  private id(value: string) {
    if (!Types.ObjectId.isValid(value)) throw new NotFoundException("That post was not found.");
    return new Types.ObjectId(value);
  }

  private async load(postId: string) {
    const post: any = await this.posts.findById(this.id(postId)).lean().exec();
    if (!post) throw new NotFoundException("That post was not found.");
    return post;
  }

  private async reportCounts(postIds: string[]) {
    const caseModel = this.connection.models["ModerationCase"];
    if (!caseModel || !postIds.length) return new Map<string, { reports: number; openCaseId: string | null; topReason: string | null }>();
    const rows: any[] = await caseModel
      .find({ targetType: "post", targetId: { $in: postIds.map((id) => new Types.ObjectId(id)) } })
      .select("targetId totalReportCount status topReason")
      .lean()
      .exec();
    const map = new Map<string, { reports: number; openCaseId: string | null; topReason: string | null }>();
    for (const row of rows) {
      const key = String(row.targetId);
      const current = map.get(key) ?? { reports: 0, openCaseId: null, topReason: null };
      current.reports += Number(row.totalReportCount ?? 0);
      if (OPEN_CASE_STATUSES.includes(row.status)) current.openCaseId = String(row._id);
      current.topReason = current.topReason ?? row.topReason ?? null;
      map.set(key, current);
    }
    return map;
  }

  private async people(ids: string[]) {
    const userModel = this.connection.models["User"];
    const valid = Array.from(new Set(ids.filter((id) => Types.ObjectId.isValid(id))));
    if (!userModel || !valid.length) return new Map<string, any>();
    const rows = await userModel.find({ _id: { $in: valid } }).select("username firstName lastName profilePicture role isActive createdAt").lean().exec();
    return new Map(rows.map((u: any) => [String(u._id), u]));
  }

  private person(u: any, fallbackId = "") {
    return u
      ? { id: String(u._id), username: u.username ?? "", name: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || "", avatar: u.profilePicture ?? "" }
      : { id: fallbackId, username: "", name: "", avatar: "" };
  }

  private view(post: any, people: Map<string, any>, reports?: Map<string, any>) {
    const r = reports?.get(String(post._id));
    const hidden = post.moderationStatus === "removed";
    return {
      id: String(post._id),
      type: post.type ?? "post",
      content: String(post.content ?? ""),
      media: String(post.media ?? "")
        .split(",")
        .map((m: string) => m.trim())
        .filter(Boolean),
      audience: post.audience ?? "public",
      createdAt: post.createdAt ?? null,
      author: this.person(people.get(String(post.user)), String(post.user ?? "")),
      status: hidden ? "hidden" : "visible",
      hiddenAt: hidden ? post.moderationRemovedAt ?? null : null,
      hiddenBy: hidden && post.moderationHiddenBy ? this.person(people.get(String(post.moderationHiddenBy)), String(post.moderationHiddenBy)) : null,
      hiddenThroughCase: hidden && post.moderationCaseId ? String(post.moderationCaseId) : null,
      reason: post.moderationReason ?? null,
      escalatedAt: post.moderationEscalatedAt ?? null,
      reports: r?.reports ?? 0,
      openCaseId: r?.openCaseId ?? null,
      topReason: r?.topReason ?? null,
    };
  }

  /* ---------------- reads ---------------- */

  async list(query: PostListQuery) {
    const page = Math.max(1, query.page ?? 1);
    const filter: Record<string, unknown> = {};
    if (query.status === "hidden") filter.moderationStatus = "removed";
    else if (query.status !== "all") filter.moderationStatus = { $ne: "removed" };
    if (query.type) filter.type = query.type;
    if (query.escalated) filter.moderationEscalatedAt = { $ne: null };
    if (query.search?.trim()) {
      const term = query.search.trim();
      filter.$or = Types.ObjectId.isValid(term)
        ? [{ _id: new Types.ObjectId(term) }, { user: term }]
        : [{ content: new RegExp(escapeRegex(term), "i") }, { username: new RegExp(`^${escapeRegex(term.replace(/^@/, ""))}$`, "i") }];
    }
    if (query.author?.trim()) filter.user = query.author.trim();
    const sort = query.status === "hidden" ? { moderationRemovedAt: -1, _id: -1 } : { createdAt: -1, _id: -1 };
    const [rows, total] = await Promise.all([
      this.posts.find(filter).sort(sort as any).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean().exec(),
      this.posts.countDocuments(filter).exec(),
    ]);
    const people = await this.people(rows.flatMap((p: any) => [String(p.user), String(p.moderationHiddenBy ?? "")]));
    const reports = await this.reportCounts(rows.map((p: any) => String(p._id)));
    return { items: rows.map((p: any) => this.view(p, people, reports)), total, page, hasMore: page * PAGE_SIZE < total };
  }

  async get(postId: string) {
    const post = await this.load(postId);
    const people = await this.people([String(post.user), String(post.moderationHiddenBy ?? "")]);
    const reports = await this.reportCounts([String(post._id)]);
    const history = await this.events.list({ targetType: "post", targetId: String(post._id) });
    return { ...this.view(post, people, reports), history: history.items };
  }

  /* ---------------- actions ---------------- */

  private async notifyAuthor(post: any, title: string, message: string) {
    const recipientId = String(post.user ?? "");
    if (!Types.ObjectId.isValid(recipientId)) return;
    try {
      // Users see the outcome and can appeal through My Moderation.
      await this.notifications.create({ recipientId, type: MODERATION_NOTIFICATION_TYPE, title, message, entityId: String(post._id), entityType: "post", link: "/moderation" });
    } catch (error) {
      this.logger.warn(`Could not notify post author ${recipientId}: ${String(error)}`);
    }
  }

  async hide(actor: Actor, postId: string, reason: string) {
    const post = await this.load(postId);
    if (post.moderationStatus === "removed") throw new ConflictException("This post is already hidden.");
    const res = await this.posts
      .updateOne(
        { _id: post._id, moderationStatus: { $ne: "removed" } },
        { $set: { moderationStatus: "removed", moderationRemovedAt: new Date(), moderationHiddenBy: actorId(actor), moderationReason: reason, moderationCaseId: null } },
      )
      .exec();
    if (!res.modifiedCount) throw new ConflictException("This post is already hidden.");
    await this.events.record({ actorId: actorId(actor), action: "hide_post", targetType: "post", targetId: String(post._id), reason, previousState: "visible", newState: "hidden", metadata: { authorId: String(post.user) } });
    await this.notifyAuthor(post, "Your post was hidden", `A post you shared was hidden for breaking the Community Guidelines: ${reason}`);
    return this.get(postId);
  }

  async restore(actor: Actor, postId: string, reason: string) {
    const post = await this.load(postId);
    if (post.moderationStatus !== "removed") throw new ConflictException("This post is not hidden.");
    await this.posts
      .updateOne(
        { _id: post._id },
        { $set: { moderationStatus: null, moderationRemovedAt: null, moderationHiddenBy: null, moderationReason: null, moderationCaseId: null, moderationEscalatedAt: null } },
      )
      .exec();
    await this.events.record({ actorId: actorId(actor), action: "restore_post", targetType: "post", targetId: String(post._id), reason, previousState: "hidden", newState: "visible", metadata: { authorId: String(post.user), caseId: post.moderationCaseId ?? null } });
    await this.notifyAuthor(post, "Your post was restored", "After review, a post of yours is visible again.");
    return this.get(postId);
  }

  async warn(actor: Actor, postId: string, message: string) {
    const post = await this.load(postId);
    await this.events.record({ actorId: actorId(actor), action: "warn_user", targetType: "account", targetId: String(post.user), reason: message, metadata: { postId: String(post._id) } });
    await this.notifyAuthor(post, "Warning from Fockis", `About one of your posts: ${message}`);
    return this.get(postId);
  }

  async escalate(actor: Actor, postId: string, reason: string) {
    const post = await this.load(postId);
    const now = new Date();
    await this.posts.updateOne({ _id: post._id }, { $set: { moderationEscalatedAt: now } }).exec();
    const caseModel = this.connection.models["ModerationCase"];
    if (caseModel) {
      await caseModel
        .updateMany(
          { targetType: "post", targetId: post._id, status: { $in: OPEN_CASE_STATUSES } },
          { $set: { status: "escalated", priority: "high", priorityRank: 2 }, $push: { history: { action: "escalated", actorId: actorId(actor), at: now, reason } } },
        )
        .exec();
    }
    await this.events.record({ actorId: actorId(actor), action: "escalate_post", targetType: "post", targetId: String(post._id), reason, previousState: post.moderationStatus === "removed" ? "hidden" : "visible", newState: "escalated" });
    return this.get(postId);
  }

  /**
   * Permanent removal: super admins only, only after the post was hidden,
   * and never while a legal hold covers it. A minimal record (no content)
   * stays in the moderation history.
   */
  async purge(actor: Actor, postId: string, reason: string, confirm: string) {
    if (!isSuperAdmin(actor)) throw new ForbiddenException("Only super admins can permanently remove content.");
    const post = await this.load(postId);
    if (post.moderationStatus !== "removed") throw new BadRequestException("Hide the post before removing it permanently.");
    if (confirm !== "DELETE") throw new BadRequestException('Type DELETE to confirm permanent removal.');
    const holds = this.connection.models["LegalHold"];
    if (holds && (await holds.exists({ status: "active", $or: [{ "records.recordId": String(post._id) }, { "subjects.userId": String(post.user) }] }))) {
      throw new ConflictException("A legal hold covers this content. It can't be removed until the hold is released.");
    }
    await this.posts.deleteOne({ _id: post._id }).exec();
    await this.events.record({ actorId: actorId(actor), action: "purge_post", targetType: "post", targetId: String(post._id), reason, previousState: "hidden", newState: "deleted", metadata: { authorId: String(post.user), type: post.type ?? "post" } });
    return { deleted: true };
  }
}
