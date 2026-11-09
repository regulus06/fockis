import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import { MAX_OPEN_FEEDBACK_PER_USER, OPEN_FEEDBACK_STATUSES } from "../support.constants";
import type { FeedbackStatus } from "../support.constants";
import type { CreateFeedbackDto, FeedbackResponseDto, ListFeedbackQueryDto } from "../dto/support.dto";
import { SupportFeedback, SupportFeedbackDocument } from "../schemas/support-feedback.schema";
import { SupportAttachmentsService } from "./support-attachments.service";
import { SupportStaffService } from "./support-staff.service";
import { escapeRegex, newReference, toObjectId } from "./support.service";

const PAGE_SIZE = 20;
const plain = (doc: any): Record<string, any> => (doc && typeof doc.toObject === "function" ? doc.toObject() : doc);
const idOf = (value: any) => String(value?._id ?? value ?? "");

export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
  new: "New",
  under_review: "Under Review",
  planned: "Planned",
  implemented: "Implemented",
  rejected: "Not planned",
};

/** User feedback: ideas, bug reports, complaints, and the staff Feedback Inbox. */
@Injectable()
export class SupportFeedbackService {
  constructor(
    @InjectModel(SupportFeedback.name) private readonly feedback: Model<SupportFeedbackDocument>,
    private readonly files: SupportAttachmentsService,
    private readonly staff: SupportStaffService,
  ) {}

  private view(raw: any, viewer: "user" | "agent", people?: Map<string, any>) {
    const f = plain(raw);
    const base = {
      id: idOf(f._id),
      number: f.number,
      category: f.category,
      subject: f.subject,
      description: f.description,
      attachments: (f.attachments ?? []).map((a: any) => ({ key: a.key, name: a.name, mimeType: a.mimeType, size: a.size })),
      status: f.status as FeedbackStatus,
      statusHistory: (f.statusHistory ?? []).map((h: any) => ({ status: h.status, at: h.at })),
      responses: (f.responses ?? []).map((r: any) => ({
        id: idOf(r._id),
        body: r.body,
        createdAt: r.createdAt,
        ...(viewer === "agent" ? { author: this.staff.person(people?.get(idOf(r.authorId))) } : {}),
      })),
      unread: viewer === "user" ? Boolean(f.userUnread) : false,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
      firstResponseAt: f.firstResponseAt ?? null,
      resolvedAt: f.resolvedAt ?? null,
    };
    if (viewer === "user") return base;
    return {
      ...base,
      archived: Boolean(f.archived),
      user: this.staff.person(people?.get(idOf(f.userId))) ?? { id: idOf(f.userId), username: "", name: "", avatar: "" },
      assignedTo: f.assignedTo ? this.staff.person(people?.get(idOf(f.assignedTo))) : null,
      notes: (f.notes ?? []).map((n: any) => ({ id: idOf(n._id), body: n.body, createdAt: n.createdAt, author: this.staff.person(people?.get(idOf(n.authorId))) })),
    };
  }

  private async agentView(raw: any) {
    const f = plain(raw);
    const people = await this.staff.usersById([
      f.userId,
      f.assignedTo,
      ...(f.responses ?? []).map((r: any) => r.authorId),
      ...(f.notes ?? []).map((n: any) => n.authorId),
    ]);
    return this.view(f, "agent", people);
  }

  private async findAny(id: string) {
    const doc = await this.feedback.findById(toObjectId(id, "feedback")).exec();
    if (!doc) throw new NotFoundException("That feedback was not found.");
    return doc;
  }

  /* ---------------- user ---------------- */

  async create(userId: string, dto: CreateFeedbackDto) {
    const owner = toObjectId(userId, "account");
    const open = await this.feedback.countDocuments({ userId: owner, status: { $in: OPEN_FEEDBACK_STATUSES } }).exec();
    if (open >= MAX_OPEN_FEEDBACK_PER_USER) {
      throw new ConflictException("You have a lot of open feedback. Please wait for the team to review it before sending more.");
    }
    const attachments = this.files.assertOwned(userId, dto.attachments);
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        const doc = await this.feedback.create({
          userId: owner,
          number: newReference("FB"),
          category: dto.category,
          subject: dto.subject,
          description: dto.description,
          attachments,
          status: "new",
          statusHistory: [{ status: "new", by: owner, at: new Date() }],
        });
        await this.staff.notifyStaff(null, "New feedback", `${doc.number}: ${doc.subject}`, `/admin/support/feedback/${idOf(doc._id)}`, idOf(doc._id), "support_feedback", userId);
        return this.view(doc, "user");
      } catch (error: any) {
        if (error?.code !== 11000 || attempt === 3) throw error;
      }
    }
    throw new ConflictException("Could not send your feedback. Please try again.");
  }

  async listMine(userId: string, page = 1) {
    const filter = { userId: toObjectId(userId, "account") };
    const [items, total] = await Promise.all([
      this.feedback.find(filter).sort({ updatedAt: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).exec(),
      this.feedback.countDocuments(filter).exec(),
    ]);
    return { items: items.map((f) => this.view(f, "user")), total, page, hasMore: page * PAGE_SIZE < total };
  }

  async getMine(userId: string, id: string) {
    const doc = await this.feedback.findOne({ _id: toObjectId(id, "feedback"), userId: toObjectId(userId, "account") }).exec();
    if (!doc) throw new NotFoundException("That feedback was not found.");
    if (plain(doc).userUnread) await this.feedback.updateOne({ _id: doc._id }, { $set: { userUnread: false } }).exec();
    return this.view(doc, "user");
  }

  async mineFileLink(userId: string, id: string, key: string) {
    const doc = plain(await this.feedback.findOne({ _id: toObjectId(id, "feedback"), userId: toObjectId(userId, "account") }).exec());
    if (!doc) throw new NotFoundException("That feedback was not found.");
    return this.files.link(doc.attachments ?? [], key);
  }

  /* ---------------- staff ---------------- */

  async list(agentId: string, query: ListFeedbackQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const filter: Record<string, unknown> = { archived: query.archived ? true : { $ne: true } };
    const status = query.status ?? "open";
    if (status === "open") filter.status = { $in: OPEN_FEEDBACK_STATUSES };
    else if (status !== "all") filter.status = status;
    if (query.category) filter.category = query.category;
    if (query.assigned === "me") filter.assignedTo = toObjectId(agentId, "account");
    if (query.assigned === "unassigned") filter.assignedTo = null;
    if (query.search) {
      const pattern = new RegExp(escapeRegex(query.search), "i");
      filter.$or = [{ subject: pattern }, { number: pattern }, { description: pattern }];
    }
    const [items, total] = await Promise.all([
      this.feedback.find(filter).sort({ createdAt: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).exec(),
      this.feedback.countDocuments(filter).exec(),
    ]);
    const people = await this.staff.usersById(items.flatMap((f) => [f.userId, f.assignedTo]));
    return { items: items.map((f) => this.view(f, "agent", people)), total, page, hasMore: page * PAGE_SIZE < total };
  }

  async get(id: string) {
    return this.agentView(await this.findAny(id));
  }

  async respond(agentId: string, id: string, dto: FeedbackResponseDto) {
    const doc = plain(await this.findAny(id));
    const now = new Date();
    const status = dto.status && dto.status !== doc.status ? dto.status : null;
    await this.feedback
      .updateOne(
        { _id: doc._id },
        {
          $push: {
            responses: { _id: new Types.ObjectId(), authorId: toObjectId(agentId, "account"), body: dto.body, createdAt: now },
            ...(status ? { statusHistory: { status, by: toObjectId(agentId, "account"), at: now } } : {}),
          },
          $set: {
            userUnread: true,
            firstResponseAt: doc.firstResponseAt ?? now,
            ...(status ? { status, resolvedAt: ["implemented", "rejected"].includes(status) ? now : null } : {}),
            ...(doc.status === "new" && !status ? { status: "under_review" } : {}),
            ...(doc.assignedTo ? {} : { assignedTo: toObjectId(agentId, "account") }),
          },
        },
      )
      .exec();
    await this.staff.notify(idOf(doc.userId), "Fockis replied to your feedback", `${doc.number}: ${doc.subject}`, `/help/feedback/${idOf(doc._id)}`, idOf(doc._id), "support_feedback");
    return this.get(id);
  }

  async setStatus(agentId: string, id: string, status: FeedbackStatus) {
    const doc = plain(await this.findAny(id));
    if (doc.status === status) return this.get(id);
    const now = new Date();
    await this.feedback
      .updateOne(
        { _id: doc._id },
        {
          $set: { status, userUnread: true, resolvedAt: ["implemented", "rejected"].includes(status) ? now : null },
          $push: { statusHistory: { status, by: toObjectId(agentId, "account"), at: now } },
        },
      )
      .exec();
    await this.staff.notify(
      idOf(doc.userId),
      "Feedback status updated",
      `${doc.number} is now “${FEEDBACK_STATUS_LABELS[status]}”`,
      `/help/feedback/${idOf(doc._id)}`,
      idOf(doc._id),
      "support_feedback",
    );
    return this.get(id);
  }

  async assign(agentId: string, id: string, assigneeId: string | null | undefined) {
    const doc = plain(await this.findAny(id));
    if (assigneeId && !(await this.staff.isStaff(assigneeId))) throw new BadRequestException("That person can't be assigned support work.");
    await this.feedback.updateOne({ _id: doc._id }, { $set: { assignedTo: assigneeId ? toObjectId(assigneeId, "account") : null } }).exec();
    if (assigneeId && assigneeId !== agentId) {
      await this.staff.notify(assigneeId, "Feedback assigned to you", `${doc.number}: ${doc.subject}`, `/admin/support/feedback/${idOf(doc._id)}`, idOf(doc._id), "support_feedback");
    }
    return this.get(id);
  }

  async addNote(agentId: string, id: string, body: string) {
    const doc = await this.findAny(id);
    await this.feedback
      .updateOne({ _id: doc._id }, { $push: { notes: { _id: new Types.ObjectId(), authorId: toObjectId(agentId, "account"), body, createdAt: new Date() } } })
      .exec();
    return this.get(id);
  }

  async archive(id: string, archived: boolean) {
    const doc = await this.findAny(id);
    await this.feedback.updateOne({ _id: doc._id }, { $set: { archived } }).exec();
    return this.get(id);
  }

  async fileLink(id: string, key: string) {
    const doc = plain(await this.findAny(id));
    return this.files.link(doc.attachments ?? [], key);
  }

  async counts() {
    const [newCount, open, resolved] = await Promise.all([
      this.feedback.countDocuments({ archived: { $ne: true }, status: "new" }).exec(),
      this.feedback.countDocuments({ archived: { $ne: true }, status: { $in: OPEN_FEEDBACK_STATUSES } }).exec(),
      this.feedback.countDocuments({ status: { $in: ["implemented", "rejected"] } }).exec(),
    ]);
    return { new: newCount, open, resolved };
  }

  async recent(limit = 10) {
    const items = await this.feedback.find({ archived: { $ne: true } }).sort({ createdAt: -1 }).limit(limit).exec();
    const people = await this.staff.usersById(items.map((f) => f.userId));
    return items.map((f) => this.view(f, "agent", people));
  }
}
