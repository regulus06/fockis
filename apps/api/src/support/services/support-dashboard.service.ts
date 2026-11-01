import { Injectable } from "@nestjs/common";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import { Connection, Model } from "mongoose";

import { ACTIVE_STATUSES } from "../support.constants";
import { SupportTicket, SupportTicketDocument } from "../schemas/support-ticket.schema";
import { SupportFeedbackService } from "./support-feedback.service";
import { SupportService } from "./support.service";
import { SupportStaffService } from "./support-staff.service";

const OPEN_CASE_STATUSES = ["pending", "under_review", "action_required", "escalated"];

/**
 * Support & Moderation overview. Every number is counted from the
 * database; nothing is estimated or hard-coded.
 */
@Injectable()
export class SupportDashboardService {
  constructor(
    @InjectModel(SupportTicket.name) private readonly tickets: Model<SupportTicketDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly support: SupportService,
    private readonly feedback: SupportFeedbackService,
    private readonly staff: SupportStaffService,
  ) {}

  private count(model: string, filter: Record<string, unknown>) {
    const m = this.connection.models[model];
    return m ? m.countDocuments(filter).exec() : Promise.resolve(0);
  }

  async overview() {
    const since = new Date(Date.now() - 30 * 86_400_000);
    const [feedback, openTickets, resolvedTickets, highTickets, reportedPosts, highCases, hiddenPosts, resolvedCases, unread, responded] =
      await Promise.all([
        this.feedback.counts(),
        this.tickets.countDocuments({ kind: { $ne: "chat" }, status: { $in: ACTIVE_STATUSES } }).exec(),
        this.tickets.countDocuments({ status: { $in: ["resolved", "closed"] } }).exec(),
        this.tickets.countDocuments({ status: { $in: ACTIVE_STATUSES }, priority: { $in: ["high", "urgent"] } }).exec(),
        this.count("ModerationCase", { targetType: "post", status: { $in: OPEN_CASE_STATUSES } }),
        this.count("ModerationCase", { status: { $in: OPEN_CASE_STATUSES }, priority: { $in: ["high", "urgent"] } }),
        this.count("Post", { moderationStatus: "removed" }),
        this.count("ModerationCase", { status: { $in: ["resolved", "dismissed"] } }),
        this.tickets.countDocuments({ agentUnread: true, status: { $in: ACTIVE_STATUSES } }).exec(),
        this.tickets
          .find({ firstResponseAt: { $ne: null }, createdAt: { $gte: since } })
          .select("createdAt firstResponseAt")
          .limit(2000)
          .lean()
          .exec(),
      ]);
    const waits = (responded as any[]).map((t) => new Date(t.firstResponseAt).getTime() - new Date(t.createdAt).getTime()).filter((ms) => ms >= 0);
    const liveChats = await this.tickets.countDocuments({ kind: "chat", status: { $in: ACTIVE_STATUSES } }).exec();
    const settings = await this.support.getSettings();

    return {
      newFeedback: feedback.new,
      openFeedback: feedback.open,
      openTickets,
      reportedPosts,
      hiddenPosts,
      resolved: resolvedTickets + feedback.resolved + resolvedCases,
      highPriority: highTickets + highCases,
      unreadTickets: unread,
      liveChats,
      liveChatOnline: settings.liveChatOnline,
      avgFirstResponseMinutes: waits.length ? Math.round(waits.reduce((a, b) => a + b, 0) / waits.length / 60000) : null,
    };
  }

  /** Newest reports, tickets and feedback, merged into one list. */
  async recent(limit = 12, includeReports = true) {
    const caseModel = includeReports ? this.connection.models["ModerationCase"] : undefined;
    const [cases, ticketDocs, feedback] = await Promise.all([
      caseModel
        ? caseModel.find({}).sort({ latestReportAt: -1 }).limit(limit).select("targetType targetId reportedUserId status priority topReason latestReportAt targetSnapshot totalReportCount").lean().exec()
        : Promise.resolve([] as any[]),
      this.tickets.find({ kind: { $ne: "chat" } }).sort({ lastMessageAt: -1 }).limit(limit).exec(),
      this.feedback.recent(limit),
    ]);
    const people = await this.staff.usersById([...ticketDocs.map((t) => t.userId), ...(cases as any[]).map((c) => c.reportedUserId)]);

    const rows = [
      ...(cases as any[]).map((c) => ({
        type: "report" as const,
        id: String(c._id),
        subject: c.targetType === "post" ? String(c.targetSnapshot?.content ?? "Reported post").slice(0, 80) || "Reported post" : "Reported account",
        reference: c.targetType === "post" ? `Post #${String(c.targetId).slice(-6).toUpperCase()}` : `Account #${String(c.targetId).slice(-6).toUpperCase()}`,
        user: this.staff.person(people.get(String(c.reportedUserId))),
        status: c.status,
        priority: c.priority,
        at: c.latestReportAt,
        link: `/admin/moderation/cases/${c._id}`,
      })),
      ...ticketDocs.map((t) => {
        const s = this.support.summary(t, "agent", people) as any;
        return { type: "ticket" as const, id: s.id, subject: s.subject, reference: `Ticket ${s.number}`, user: s.user, status: s.status, priority: s.priority, at: s.lastMessageAt, link: `/admin/support/tickets/${s.id}` };
      }),
      ...feedback.map((f: any) => ({
        type: "feedback" as const,
        id: f.id,
        subject: f.subject,
        reference: `Feedback ${f.number}`,
        user: f.user,
        status: f.status,
        priority: null,
        at: f.createdAt,
        link: `/admin/support/feedback/${f.id}`,
      })),
    ];
    rows.sort((a, b) => new Date(b.at ?? 0).getTime() - new Date(a.at ?? 0).getTime());
    return { items: rows.slice(0, limit) };
  }
}
