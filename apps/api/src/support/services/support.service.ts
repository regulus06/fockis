import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import { randomInt } from "crypto";
import { Connection, Model, Types } from "mongoose";

import {
  ACTIVE_STATUSES,
  MAX_ACTIVE_TICKETS_PER_USER,
  MAX_MESSAGES_PER_TICKET,
  REOPEN_WINDOW_DAYS,
} from "../support.constants";
import type { SupportPriority, SupportStatus } from "../support.constants";
import type { AgentReplyDto, CreateTicketDto, ListMyTicketsQueryDto, ListTicketsQueryDto, TicketMessageDto } from "../dto/support.dto";
import { SupportTicket, SupportTicketDocument } from "../schemas/support-ticket.schema";
import { SupportSettings, SupportSettingsDocument } from "../schemas/support-settings.schema";
import { SupportAttachmentsService, type StoredAttachment } from "./support-attachments.service";
import { SupportStaffService } from "./support-staff.service";

type Viewer = "user" | "agent";
type AnyTicket = Record<string, any>;

const PAGE_SIZE = 20;
const NUMBER_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

const plain = (doc: any): AnyTicket => (doc && typeof doc.toObject === "function" ? doc.toObject() : doc);
const idOf = (value: any) => String(value?._id ?? value ?? "");

export function toObjectId(id: string, label = "ticket"): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) throw new NotFoundException(`That ${label} was not found.`);
  return new Types.ObjectId(id);
}

export function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function newReference(prefix: string) {
  let out = `${prefix}-`;
  for (let i = 0; i < 6; i += 1) out += NUMBER_ALPHABET[randomInt(NUMBER_ALPHABET.length)];
  return out;
}

const attachmentView = (a: any) => ({ key: a.key, name: a.name, mimeType: a.mimeType, size: a.size });

/** Support tickets and live-chat conversations (user and staff sides). */
@Injectable()
export class SupportService {
  constructor(
    @InjectModel(SupportTicket.name) private readonly tickets: Model<SupportTicketDocument>,
    @InjectModel(SupportSettings.name) private readonly settings: Model<SupportSettingsDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly files: SupportAttachmentsService,
    private readonly staff: SupportStaffService,
  ) {}

  /* ------------------------------------------------------------------ */
  /* Serialization                                                       */
  /* ------------------------------------------------------------------ */

  summary(raw: any, viewer: Viewer, people?: Map<string, any>) {
    const t = plain(raw);
    const messages: any[] = t.messages ?? [];
    const last = messages[messages.length - 1];
    const base = {
      id: idOf(t._id),
      number: t.number,
      kind: t.kind,
      category: t.category,
      subject: t.subject,
      status: t.status as SupportStatus,
      priority: (t.priority ?? "normal") as SupportPriority,
      createdAt: t.createdAt,
      lastMessageAt: t.lastMessageAt,
      unread: viewer === "user" ? Boolean(t.userUnread) : Boolean(t.agentUnread),
      messageCount: messages.length,
      lastMessage: last
        ? { author: last.author, preview: String(last.body || (last.attachments?.length ? "📎 Attachment" : "")).slice(0, 140) }
        : null,
    };
    if (viewer === "user") return base;
    return {
      ...base,
      user: this.staff.person(people?.get(idOf(t.userId))) ?? { id: idOf(t.userId), username: "", name: "", avatar: "" },
      assignedTo: t.assignedTo ? this.staff.person(people?.get(idOf(t.assignedTo))) ?? { id: idOf(t.assignedTo), username: "", name: "", avatar: "" } : null,
      firstResponseAt: t.firstResponseAt ?? null,
    };
  }

  private async detail(raw: any, viewer: Viewer) {
    const t = plain(raw);
    const people =
      viewer === "agent"
        ? await this.staff.usersById([t.userId, t.assignedTo, ...(t.messages ?? []).map((m: any) => m.authorId), ...(t.notes ?? []).map((n: any) => n.authorId)])
        : undefined;
    const base = {
      ...this.summary(t, viewer, people),
      pageUrl: t.pageUrl ?? "",
      affectedFeature: t.affectedFeature ?? "",
      deviceInfo: t.deviceInfo ?? "",
      resolvedAt: t.resolvedAt ?? null,
      closedAt: t.closedAt ?? null,
      canReopen: viewer === "user" ? this.canReopen(t) : ["resolved", "closed"].includes(t.status),
      // Agent identities are never shown to users; replies appear as "Fockis Support".
      messages: (t.messages ?? []).map((m: any) => ({
        id: idOf(m._id),
        author: m.author,
        body: m.body,
        attachments: (m.attachments ?? []).map(attachmentView),
        createdAt: m.createdAt,
        ...(viewer === "agent" ? { authorName: this.staff.person(people?.get(idOf(m.authorId)))?.name ?? "" } : {}),
      })),
    };
    if (viewer === "user") return base;
    const u = people?.get(idOf(t.userId));
    return {
      ...base,
      userEmail: u?.email ?? "",
      userSince: u?.createdAt ?? null,
      notes: (t.notes ?? []).map((n: any) => ({
        id: idOf(n._id),
        body: n.body,
        createdAt: n.createdAt,
        author: this.staff.person(people?.get(idOf(n.authorId))),
      })),
    };
  }

  private canReopen(t: AnyTicket) {
    if (!["resolved", "closed"].includes(t.status)) return false;
    const since = new Date(t.closedAt ?? t.resolvedAt ?? t.updatedAt ?? 0).getTime();
    return Date.now() - since <= REOPEN_WINDOW_DAYS * 86_400_000;
  }

  private allFiles(t: AnyTicket): StoredAttachment[] {
    return (t.messages ?? []).flatMap((m: any) => m.attachments ?? []);
  }

  private async findOwned(userId: string, ticketId: string) {
    const ticket = await this.tickets
      .findOne({ _id: toObjectId(ticketId), userId: toObjectId(userId, "account") })
      .exec();
    if (!ticket) throw new NotFoundException("That support request was not found.");
    return ticket;
  }

  private async findAny(ticketId: string) {
    const ticket = await this.tickets.findById(toObjectId(ticketId)).exec();
    if (!ticket) throw new NotFoundException("That support request was not found.");
    return ticket;
  }

  private message(authorId: string, author: "user" | "agent", body: string, attachments: StoredAttachment[] = []) {
    return { _id: new Types.ObjectId(), authorId: toObjectId(authorId, "account"), author, body, attachments, createdAt: new Date() };
  }

  private link(ticket: AnyTicket, viewer: Viewer) {
    if (viewer === "user") return `/help/tickets/${idOf(ticket._id)}`;
    return `/admin/support/${(ticket as any).kind === "chat" ? "live" : "tickets"}/${idOf(ticket._id)}`;
  }

  /* ------------------------------------------------------------------ */
  /* User side                                                           */
  /* ------------------------------------------------------------------ */

  async create(userId: string, dto: CreateTicketDto) {
    const owner = toObjectId(userId, "account");
    if (dto.kind !== "chat" && dto.message.trim().length < 10) {
      throw new BadRequestException("Describe the issue in at least 10 characters.");
    }
    const attachments = this.files.assertOwned(userId, dto.attachments);

    // Live chat: keep one conversation open per user and add to it.
    if (dto.kind === "chat") {
      const existing = await this.tickets
        .findOne({ userId: owner, kind: "chat", status: { $in: ACTIVE_STATUSES } })
        .exec();
      if (existing) return this.reply(userId, idOf(existing._id), { body: dto.message, attachments: dto.attachments });
    }

    const active = await this.tickets.countDocuments({ userId: owner, status: { $in: ACTIVE_STATUSES } }).exec();
    if (active >= MAX_ACTIVE_TICKETS_PER_USER) {
      throw new ConflictException(
        `You have ${active} open requests. Please wait for a reply or close one before opening another.`,
      );
    }

    const now = new Date();
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        const ticket = await this.tickets.create({
          userId: owner,
          number: newReference("FK"),
          kind: dto.kind,
          category: dto.category,
          subject: dto.subject,
          status: "open",
          priority: "normal",
          messages: [this.message(userId, "user", dto.message, attachments)],
          pageUrl: dto.pageUrl ?? "",
          affectedFeature: dto.affectedFeature ?? "",
          deviceInfo: dto.deviceInfo ?? "",
          lastMessageAt: now,
          userUnread: false,
          agentUnread: true,
        });
        const label = dto.kind === "chat" ? "New live chat" : dto.kind === "problem" ? "New problem report" : "New support ticket";
        await this.staff.notifyStaff(null, label, `${ticket.number}: ${ticket.subject}`, this.link(ticket, "agent"), idOf(ticket._id), "support_ticket", userId);
        return this.detail(ticket, "user");
      } catch (error: any) {
        if (error?.code !== 11000 || attempt === 3) throw error;
      }
    }
    throw new ConflictException("Could not create the request. Please try again.");
  }

  async listMine(userId: string, query: ListMyTicketsQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const filter: Record<string, unknown> = { userId: toObjectId(userId, "account") };
    if (query.filter === "active") filter.status = { $in: ACTIVE_STATUSES };
    if (query.filter === "closed") filter.status = { $in: ["resolved", "closed"] };

    const [items, total] = await Promise.all([
      this.tickets.find(filter).sort({ lastMessageAt: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).exec(),
      this.tickets.countDocuments(filter).exec(),
    ]);
    return { items: items.map((t) => this.summary(t, "user")), total, page, hasMore: page * PAGE_SIZE < total };
  }

  async getMine(userId: string, ticketId: string) {
    const ticket = await this.findOwned(userId, ticketId);
    if (plain(ticket).userUnread) {
      await this.tickets.updateOne({ _id: ticket._id }, { $set: { userUnread: false } }).exec();
      (ticket as any).userUnread = false;
    }
    return this.detail(ticket, "user");
  }

  async activeChat(userId: string) {
    const chat = await this.tickets
      .findOne({ userId: toObjectId(userId, "account"), kind: "chat", status: { $in: ACTIVE_STATUSES } })
      .exec();
    if (!chat) return { chat: null };
    if (plain(chat).userUnread) await this.tickets.updateOne({ _id: chat._id }, { $set: { userUnread: false } }).exec();
    return { chat: await this.detail(chat, "user") };
  }

  async reply(userId: string, ticketId: string, dto: TicketMessageDto) {
    const ticket = plain(await this.findOwned(userId, ticketId));
    const attachments = this.files.assertOwned(userId, dto.attachments);
    if (!dto.body?.trim() && !attachments.length) throw new BadRequestException("Write a message or attach a file.");
    if (ticket.status === "closed") {
      if (!this.canReopen(ticket)) throw new ConflictException("This request is closed. Please open a new one.");
    }
    if ((ticket.messages ?? []).length >= MAX_MESSAGES_PER_TICKET) {
      throw new BadRequestException("This conversation is too long. Please open a new request.");
    }
    const next: SupportStatus = ["in_progress", "escalated"].includes(ticket.status) ? ticket.status : "open";
    const updated = await this.tickets
      .findOneAndUpdate(
        { _id: ticket._id },
        {
          $push: { messages: this.message(userId, "user", dto.body?.trim() ?? "", attachments) },
          $set: { status: next, lastMessageAt: new Date(), agentUnread: true, userUnread: false, resolvedAt: null, closedAt: null },
        },
        { returnDocument: "after" },
      )
      .exec();
    if (!updated) throw new NotFoundException("That support request was not found.");
    await this.staff.notifyStaff(ticket.assignedTo, "User replied", `${ticket.number}: ${ticket.subject}`, this.link(ticket, "agent"), idOf(ticket._id), "support_ticket", userId);
    return this.detail(updated, "user");
  }

  async reopenMine(userId: string, ticketId: string) {
    const ticket = plain(await this.findOwned(userId, ticketId));
    if (!this.canReopen(ticket)) {
      throw new ConflictException(`Requests can be reopened within ${REOPEN_WINDOW_DAYS} days of being resolved or closed.`);
    }
    const updated = await this.tickets
      .findOneAndUpdate({ _id: ticket._id }, { $set: { status: "open", resolvedAt: null, closedAt: null, agentUnread: true } }, { returnDocument: "after" })
      .exec();
    await this.staff.notifyStaff(ticket.assignedTo, "Request reopened", `${ticket.number}: ${ticket.subject}`, this.link(ticket, "agent"), idOf(ticket._id), "support_ticket", userId);
    return this.detail(updated, "user");
  }

  async closeMine(userId: string, ticketId: string) {
    const ticket = plain(await this.findOwned(userId, ticketId));
    if (ticket.status === "closed") return this.detail(ticket, "user");
    const updated = await this.tickets
      .findOneAndUpdate({ _id: ticket._id }, { $set: { status: "closed", closedAt: new Date() } }, { returnDocument: "after" })
      .exec();
    return this.detail(updated, "user");
  }

  async fileLink(userId: string, ticketId: string, key: string) {
    const ticket = plain(await this.findOwned(userId, ticketId));
    return this.files.link(this.allFiles(ticket), key);
  }

  async overview(userId: string) {
    const owner = toObjectId(userId, "account");
    const [activeTickets, unreadTickets, settings] = await Promise.all([
      this.tickets.countDocuments({ userId: owner, status: { $in: ACTIVE_STATUSES } }).exec(),
      this.tickets.countDocuments({ userId: owner, userUnread: true }).exec(),
      this.getSettings(),
    ]);
    const feedbackModel = this.connection.models["SupportFeedback"];
    const unreadFeedback = feedbackModel ? await feedbackModel.countDocuments({ userId: owner, userUnread: true }).exec() : 0;
    return { liveChatOnline: settings.liveChatOnline, activeTickets, unreadTickets, unreadFeedback };
  }

  /* ------------------------------------------------------------------ */
  /* Staff side                                                          */
  /* ------------------------------------------------------------------ */

  async list(agentId: string, query: ListTicketsQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, query.limit ?? PAGE_SIZE);
    const filter: Record<string, unknown> = {};
    const status = query.status ?? "active";
    if (status === "active") filter.status = { $in: ACTIVE_STATUSES };
    else if (status !== "all") filter.status = status;
    if (query.kind) filter.kind = query.kind;
    if (query.priority) filter.priority = query.priority;
    if (query.assigned === "me") filter.assignedTo = toObjectId(agentId, "account");
    if (query.assigned === "unassigned") filter.assignedTo = null;
    if (query.search) {
      const pattern = new RegExp(escapeRegex(query.search), "i");
      filter.$or = [{ subject: pattern }, { number: pattern }];
    }

    const [items, total] = await Promise.all([
      this.tickets.find(filter).sort({ lastMessageAt: -1 }).skip((page - 1) * limit).limit(limit).exec(),
      this.tickets.countDocuments(filter).exec(),
    ]);
    const people = await this.staff.usersById(items.flatMap((t) => [t.userId, t.assignedTo]));
    return { items: items.map((t) => this.summary(t, "agent", people)), total, page, hasMore: page * limit < total };
  }

  async stats() {
    const statuses: SupportStatus[] = ["open", "in_progress", "awaiting_user", "escalated", "resolved", "closed"];
    const counts = await Promise.all(statuses.map(async (s) => [s, await this.tickets.countDocuments({ status: s }).exec()]));
    const unread = await this.tickets.countDocuments({ agentUnread: true, status: { $in: ACTIVE_STATUSES } }).exec();
    return { byStatus: Object.fromEntries(counts), unread };
  }

  async getForAgent(ticketId: string) {
    const ticket = await this.findAny(ticketId);
    if (plain(ticket).agentUnread) await this.tickets.updateOne({ _id: ticket._id }, { $set: { agentUnread: false } }).exec();
    return this.detail(await this.findAny(ticketId), "agent");
  }

  async replyAsAgent(agentId: string, ticketId: string, dto: AgentReplyDto) {
    const ticket = plain(await this.findAny(ticketId));
    const attachments = this.files.assertOwned(agentId, dto.attachments, true);
    if (!dto.body?.trim() && !attachments.length) throw new BadRequestException("Write a reply or attach a file.");
    if ((ticket.messages ?? []).length >= MAX_MESSAGES_PER_TICKET) {
      throw new BadRequestException("This conversation has reached its message limit.");
    }
    const status: SupportStatus = dto.status ?? "awaiting_user";
    const now = new Date();
    await this.tickets
      .updateOne(
        { _id: ticket._id },
        {
          $push: { messages: this.message(agentId, "agent", dto.body?.trim() ?? "", attachments) },
          $set: {
            status,
            lastMessageAt: now,
            userUnread: true,
            agentUnread: false,
            firstResponseAt: ticket.firstResponseAt ?? now,
            // Replying to an unassigned request takes it.
            ...(ticket.assignedTo ? {} : { assignedTo: toObjectId(agentId, "account"), assignedAt: now }),
            resolvedAt: status === "resolved" ? now : null,
            closedAt: status === "closed" ? now : null,
          },
        },
      )
      .exec();
    await this.staff.notify(idOf(ticket.userId), "Fockis Support replied", `New reply on ${ticket.number}: ${ticket.subject}`, this.link(ticket, "user"), idOf(ticket._id), "support_ticket");
    return this.getForAgent(ticketId);
  }

  async setStatus(ticketId: string, status: SupportStatus) {
    const ticket = plain(await this.findAny(ticketId));
    const now = new Date();
    await this.tickets
      .updateOne(
        { _id: ticket._id },
        { $set: { status, resolvedAt: status === "resolved" ? now : status === "closed" ? ticket.resolvedAt ?? null : null, closedAt: status === "closed" ? now : null } },
      )
      .exec();
    if (status === "resolved" && ticket.status !== "resolved") {
      await this.staff.notify(idOf(ticket.userId), "Support request resolved", `${ticket.number}: ${ticket.subject}`, this.link(ticket, "user"), idOf(ticket._id), "support_ticket");
    }
    return this.getForAgent(ticketId);
  }

  async setPriority(ticketId: string, priority: SupportPriority) {
    const ticket = await this.findAny(ticketId);
    await this.tickets.updateOne({ _id: ticket._id }, { $set: { priority } }).exec();
    return this.getForAgent(ticketId);
  }

  /** Escalation raises priority to at least high and flags the ticket for senior staff. */
  async escalate(agentId: string, ticketId: string, reason: string) {
    const ticket = plain(await this.findAny(ticketId));
    const priority: SupportPriority = ticket.priority === "urgent" ? "urgent" : "high";
    await this.tickets
      .updateOne(
        { _id: ticket._id },
        {
          $set: { status: "escalated", priority },
          $push: { notes: { _id: new Types.ObjectId(), authorId: toObjectId(agentId, "account"), body: `Escalated: ${reason}`, createdAt: new Date() } },
        },
      )
      .exec();
    await this.staff.notifyStaff(null, "Ticket escalated", `${ticket.number}: ${ticket.subject}`, this.link(ticket, "agent"), idOf(ticket._id), "support_ticket", agentId);
    return this.getForAgent(ticketId);
  }

  async assign(agentId: string, ticketId: string, assigneeId: string | null | undefined) {
    const ticket = plain(await this.findAny(ticketId));
    if (assigneeId && !(await this.staff.isStaff(assigneeId))) {
      throw new BadRequestException("That person can't be assigned support work.");
    }
    await this.tickets
      .updateOne(
        { _id: ticket._id },
        {
          $set: {
            assignedTo: assigneeId ? toObjectId(assigneeId, "account") : null,
            assignedAt: assigneeId ? new Date() : null,
            ...(assigneeId && ticket.status === "open" ? { status: "in_progress" } : {}),
          },
        },
      )
      .exec();
    if (assigneeId && assigneeId !== agentId) {
      await this.staff.notify(assigneeId, "Assigned to you", `${ticket.number}: ${ticket.subject}`, this.link(ticket, "agent"), idOf(ticket._id), "support_ticket");
    }
    return this.getForAgent(ticketId);
  }

  async addNote(agentId: string, ticketId: string, body: string) {
    const ticket = await this.findAny(ticketId);
    await this.tickets
      .updateOne({ _id: ticket._id }, { $push: { notes: { _id: new Types.ObjectId(), authorId: toObjectId(agentId, "account"), body, createdAt: new Date() } } })
      .exec();
    return this.getForAgent(ticketId);
  }

  async agentFileLink(ticketId: string, key: string) {
    const ticket = plain(await this.findAny(ticketId));
    return this.files.link(this.allFiles(ticket), key);
  }

  /* ------------------------------------------------------------------ */
  /* Settings & status                                                   */
  /* ------------------------------------------------------------------ */

  async getSettings() {
    const doc = plain(await this.settings.findOne({ key: "global" }).exec());
    return { liveChatOnline: Boolean(doc?.liveChatOnline), updatedAt: doc?.updatedAt ?? null };
  }

  async updateSettings(agentId: string, liveChatOnline: boolean) {
    await this.settings
      .findOneAndUpdate(
        { key: "global" },
        { $set: { liveChatOnline, updatedBy: toObjectId(agentId, "account") } },
        { upsert: true, returnDocument: "after" },
      )
      .exec();
    return this.getSettings();
  }

  /**
   * Real health check used by the System Status panel: the API answered this
   * request, and the database answers a ping. Nothing here is hard-coded.
   */
  async status() {
    const checkedAt = new Date().toISOString();
    let database: "operational" | "degraded" | "outage" = "outage";
    let latencyMs: number | null = null;
    try {
      if (this.connection.readyState === 1 && this.connection.db) {
        const started = Date.now();
        await this.connection.db.admin().ping();
        latencyMs = Date.now() - started;
        database = latencyMs > 1500 ? "degraded" : "operational";
      }
    } catch {
      database = "outage";
    }
    return {
      status: database,
      checkedAt,
      components: [
        { id: "api", name: "Fockis API", status: "operational" as const, latencyMs: null },
        { id: "database", name: "Database", status: database, latencyMs },
      ],
    };
  }
}
