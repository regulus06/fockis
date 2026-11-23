import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import * as crypto from "crypto";

import { RecoveryCase, RecoveryCaseDocument, RecoveryStatus } from "./security-incident.schema";
import {
  ADMIN_NOTIFICATION_EVENT,
  ADMIN_NOTIFICATION_RESOLVED_EVENT,
} from "../../notifications/admin-notification.types";
import { describeUserAgent } from "../../../users/services/login-history.service";

// ============================================================================
// ACCOUNT RECOVERY CASES
//
// Opened by the account owner (public recovery form or the sign-in
// verification step). Reviewed by administrators with
// security.account_recovery. A case never changes the account by itself:
// the reviewer decides, and approval only lifts the verification
// requirement / lockout.
// ============================================================================

const RECOVERY_PERMISSION = "security.account_recovery";
const MAX_OPEN_CASES_PER_ACCOUNT = 1;

function caseNumber(): string {
  return `RC-${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
}

export function serializeRecoveryCase(doc: any, user?: any) {
  return {
    id: String(doc._id),
    number: doc.number,
    userId: String(doc.userId),
    username: user?.username ?? null,
    source: doc.source,
    status: doc.status,
    message: doc.message ?? "",
    restrictionId: doc.restrictionId ? String(doc.restrictionId) : null,
    incidentId: doc.incidentId ? String(doc.incidentId) : null,
    requestIp: doc.requestIp ?? null,
    requestDevice: doc.requestDevice ?? null,
    assignedTo: doc.assignedTo ?? null,
    decidedBy: doc.decidedBy ?? null,
    decidedAt: doc.decidedAt ?? null,
    timeline: doc.timeline ?? [],
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

@Injectable()
export class RecoveryCaseService {
  constructor(
    @InjectModel(RecoveryCase.name)
    private readonly cases: Model<RecoveryCaseDocument>,
    private readonly emitter: EventEmitter2,
  ) {}

  /**
   * Open a case for the account. If one is already open, it is returned
   * (and its message appended) instead of opening another.
   */
  async open(input: {
    userId: string;
    username?: string | null;
    source: "public_form" | "login_verification";
    message: string;
    restrictionId?: string | null;
    incidentId?: string | null;
    ip?: string | null;
    userAgent?: string | null;
  }): Promise<{ case: any; created: boolean }> {
    const userId = new Types.ObjectId(input.userId);
    const message = String(input.message ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 1000);
    const now = new Date();

    const existing = await this.cases
      .find({ userId, status: { $in: ["open", "in_review"] } })
      .sort({ createdAt: -1 })
      .limit(MAX_OPEN_CASES_PER_ACCOUNT)
      .lean()
      .exec();

    if (existing.length) {
      const current = existing[0];

      await this.cases.updateOne(
        { _id: current._id },
        {
          $push: {
            timeline: {
              at: now,
              action: "owner_follow_up",
              actorId: null,
              actorName: "Account owner",
              note: message.slice(0, 500),
            },
          },
        },
      );

      return { case: current, created: false };
    }

    const info = input.userAgent ? describeUserAgent(input.userAgent) : null;

    const doc = await this.cases.create({
      number: caseNumber(),
      userId,
      source: input.source,
      status: "open",
      message,
      restrictionId:
        input.restrictionId && Types.ObjectId.isValid(input.restrictionId)
          ? new Types.ObjectId(input.restrictionId)
          : null,
      incidentId:
        input.incidentId && Types.ObjectId.isValid(input.incidentId)
          ? new Types.ObjectId(input.incidentId)
          : null,
      requestIp: input.ip ?? null,
      requestDevice: info ? `${info.browser} on ${info.os}`.slice(0, 120) : null,
      timeline: [
        { at: now, action: "opened", actorId: null, actorName: "Account owner", note: "" },
      ],
    });

    this.emitter.emit(ADMIN_NOTIFICATION_EVENT, {
      type: "accounts.recovery_case",
      category: "accounts",
      priority: input.source === "login_verification" ? "high" : "medium",
      title: "New recovery case opened",
      message: `${doc.number}: ${input.username ? `@${input.username}` : "An account"} asked for help getting back into their account.`,
      groupKey: `recovery_case:${doc._id}`,
      entityType: "recovery_case",
      entityId: String(doc._id),
      link: `/admin/security/recovery/${doc._id}`,
      requiredPermissions: [RECOVERY_PERMISSION],
      actionRequired: true,
      excludeUserIds: [input.userId],
      metadata: { case: doc.number, source: input.source },
    });

    return { case: doc.toObject(), created: true };
  }

  async list(query: { status?: string; page?: number; pageSize?: number }) {
    const filter: Record<string, unknown> = {};

    if (query.status === "active") filter.status = { $in: ["open", "in_review"] };
    else if (query.status) filter.status = query.status;

    const pageSize = Math.min(Math.max(1, Number(query.pageSize) || 20), 100);
    const page = Math.max(1, Number(query.page) || 1);

    const [rows, total] = await Promise.all([
      this.cases
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean()
        .exec(),
      this.cases.countDocuments(filter).exec(),
    ]);

    return { rows, total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)) };
  }

  async get(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException("Recovery case not found.");

    const doc = await this.cases.findById(id).lean().exec();

    if (!doc) throw new NotFoundException("Recovery case not found.");

    return doc;
  }

  /** Move a case through review; returns the updated case. */
  async transition(
    id: string,
    action: "start_review" | "approve" | "reject" | "close",
    actor: { id: string; name: string },
    note: string,
  ) {
    const current = await this.get(id);

    const allowed: Record<string, RecoveryStatus[]> = {
      start_review: ["open"],
      approve: ["open", "in_review"],
      reject: ["open", "in_review"],
      close: ["open", "in_review"],
    };

    if (!allowed[action]) throw new BadRequestException("Unknown action.");

    if (!allowed[action].includes(current.status)) {
      throw new ConflictException(`A case that is ${current.status.replace("_", " ")} cannot be changed this way.`);
    }

    if ((action === "approve" || action === "reject") && !note.trim()) {
      throw new BadRequestException("Add a note explaining the decision.");
    }

    const next: RecoveryStatus =
      action === "start_review" ? "in_review" : action === "approve" ? "approved" : action === "reject" ? "rejected" : "closed";

    const now = new Date();
    const decided = next !== "in_review";

    const updated = await this.cases
      .findOneAndUpdate(
        { _id: current._id, status: current.status },
        {
          $set: {
            status: next,
            ...(action === "start_review" ? { assignedTo: actor.id } : {}),
            ...(decided ? { decidedBy: actor.id, decidedAt: now } : {}),
          },
          $push: {
            timeline: { at: now, action, actorId: actor.id, actorName: actor.name.slice(0, 120), note: note.slice(0, 500) },
          },
        },
        { new: true },
      )
      .lean()
      .exec();

    if (!updated) throw new ConflictException("The case was changed by someone else. Reload and try again.");

    if (decided) {
      this.emitter.emit(ADMIN_NOTIFICATION_RESOLVED_EVENT, {
        entityType: "recovery_case",
        entityId: String(current._id),
        resolvedBy: actor.id,
      });
    }

    return updated;
  }
}
