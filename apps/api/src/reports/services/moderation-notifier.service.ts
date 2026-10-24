import { Injectable, Logger } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { Connection, Types } from "mongoose";

import { NotificationsService } from "../../notifications/notifications.service";
import { AlertLevel, MODERATION_NOTIFICATION_TYPE, ReportTargetType } from "../reports.constants";
import { STAFF_ROLES } from "../utils/actor";

interface CaseLike {
  _id: Types.ObjectId | string;
  targetType: ReportTargetType;
  topReason?: string;
  eligibleReporterCount?: number;
}

const ALERT_TITLES: Record<AlertLevel, string> = {
  [AlertLevel.NONE]: "",
  [AlertLevel.NEW]: "New report to review",
  [AlertLevel.REVIEW]: "Report threshold reached",
  [AlertLevel.HIGH]: "High-priority moderation case",
  [AlertLevel.URGENT]: "Urgent safety escalation",
};

/**
 * Sends moderation notifications through the existing NotificationsService
 * (which also pushes them over the notifications socket). Callers only call
 * this after winning an atomic state change (alert level raised, decision
 * recorded, appeal filed), which is what keeps notifications idempotent.
 * A notification failure never fails the moderation operation itself.
 */
@Injectable()
export class ModerationNotifierService {
  private readonly logger = new Logger(ModerationNotifierService.name);

  constructor(
    private readonly notifications: NotificationsService,

    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  private caseLink(caseId: string) {
    return `/admin/moderation/cases/${caseId}`;
  }

  private async send(recipientId: string, title: string, message: string, entityId: string, link: string) {
    try {
      await this.notifications.create({
        recipientId,
        type: MODERATION_NOTIFICATION_TYPE,
        title,
        message,
        entityId,
        entityType: "moderation_case",
        link,
      });
    } catch (error) {
      this.logger.warn(`Could not send moderation notification to ${recipientId}: ${String(error)}`);
    }
  }

  /** Active moderators, admins and super admins. */
  async staffIds(limit = 200): Promise<string[]> {
    const userModel = this.connection.models["User"];

    if (!userModel) return [];

    try {
      const rows = await userModel
        .find({ isActive: { $ne: false }, $or: [{ role: { $in: STAFF_ROLES } }, { isSuperAdmin: true }] })
        .select("_id")
        .limit(limit)
        .lean()
        .exec();

      return rows.map((row: any) => String(row._id));
    } catch (error) {
      this.logger.warn(`Could not load moderation staff: ${String(error)}`);
      return [];
    }
  }

  async caseAlert(moderationCase: CaseLike, level: AlertLevel, reason: string) {
    const title = ALERT_TITLES[level];

    if (!title) return;

    const id = String(moderationCase._id);
    const subject = moderationCase.targetType === ReportTargetType.POST ? "A post" : "An account";
    const message = `${subject} needs review. ${reason}.`;
    const staff = await this.staffIds();

    await Promise.all(staff.map((recipient) => this.send(recipient, title, message, id, this.caseLink(id))));
  }

  async assigned(caseId: string, assigneeId: string) {
    await this.send(
      assigneeId,
      "Case assigned to you",
      "A moderation case was assigned to you.",
      caseId,
      this.caseLink(caseId),
    );
  }

  async appealFiled(caseId: string, recipients: string[]) {
    const unique = Array.from(new Set(recipients.filter(Boolean)));
    const targets = unique.length ? unique : await this.staffIds();

    await Promise.all(
      targets.map((recipient) =>
        this.send(recipient, "Appeal requires review", "A user appealed a moderation decision.", caseId, this.caseLink(caseId)),
      ),
    );
  }

  /** Private notice to the account owner. Never mentions reporters. */
  async userDecision(userId: string, caseId: string, title: string, message: string) {
    await this.send(userId, title, message, caseId, "/moderation");
  }
}
