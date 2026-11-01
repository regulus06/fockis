import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import * as bcrypt from "bcryptjs";
import { Connection, Model, Types } from "mongoose";

import type { AccountDeletionHandler } from "../account-deletion.token";
import { DeletionsQueryDto } from "../dto/legal.dto";
import { PAGE_SIZE } from "../legal.constants";
import { AccountDeletion, AccountDeletionDocument, LegalHold, LegalHoldDocument } from "../schemas/legal.schemas";
import { LegalAuditService } from "./legal-audit.service";
import { LegalCommonService } from "./legal-common.service";

const STAFF_ROLES = ["moderator", "admin", "super_admin"];

/**
 * Account deletion workflow.
 *
 * 1. A minimal deletion record is created (number, account ID, dates, outcome).
 * 2. Active legal holds naming the account, or covering its records, are checked.
 * 3. Public access is removed straight away (sign-in blocked).
 * 4. Posts and comments not covered by a hold are deleted; covered ones are
 *    kept but hidden from every public surface.
 * 5. The account itself is deleted, or — when it is under a hold — kept
 *    deactivated until the hold is released.
 * 6. Every step is written to the evidence access log.
 *
 * The deletion record keeps counts only. After the retention period the
 * account ID is removed from it as well.
 */
@Injectable()
export class AccountDeletionService implements AccountDeletionHandler {
  private readonly logger = new Logger(AccountDeletionService.name);

  constructor(
    @InjectModel(AccountDeletion.name) private readonly deletions: Model<AccountDeletionDocument>,
    @InjectModel(LegalHold.name) private readonly holds: Model<LegalHoldDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly common: LegalCommonService,
    private readonly audit: LegalAuditService,
  ) {}

  async activeHolds(userId: string) {
    const rows = await this.holds.find({ status: "active", "subjects.userId": String(userId) }).select("number caseReference").lean().exec();
    return rows.map((h) => ({ number: h.number, caseReference: h.caseReference }));
  }

  /** User-side entry point: confirms the password, then runs the workflow. */
  async requestOwnDeletion(userId: string, password: string) {
    const users = this.connection.models["User"];
    if (!users || !Types.ObjectId.isValid(userId)) throw new NotFoundException("Account not found.");
    const user: any = await users.findById(userId).select("password role isSuperAdmin").lean().exec();
    if (!user) throw new NotFoundException("Account not found.");
    if (STAFF_ROLES.includes(String(user.role ?? "").toLowerCase()) || user.isSuperAdmin) {
      throw new ForbiddenException("Staff accounts can't be deleted from Settings. Ask a super admin.");
    }
    const ok = user.password ? await bcrypt.compare(String(password ?? ""), String(user.password)) : false;
    if (!ok) throw new UnauthorizedException("That password isn't correct.");
    return this.process(userId, "user", userId);
  }

  async process(userId: string, source: "user" | "admin", requestedBy: string) {
    const users = this.connection.models["User"];
    if (!users || !Types.ObjectId.isValid(userId)) throw new BadRequestException("Invalid account ID.");
    const user: any = await users.findById(userId).select("_id username").lean().exec();
    if (!user) throw new NotFoundException("Account not found.");

    const number = await this.common.nextNumber("DA");
    const record = await this.deletions.create({ number, userId: String(userId), source, requestedBy, requestedAt: new Date(), status: "processing", holdNumbers: [], summary: {}, completedAt: null, anonymizedAt: null });

    try {
      // Public access goes first, so nothing is reachable while the rest runs.
      await users.updateOne({ _id: user._id }, { $set: { isActive: false, online: false } }).exec();

      const holdRows = await this.holds.find({ status: "active", $or: [{ "subjects.userId": String(userId) }] }).select("number records").lean().exec();
      const accountHeld = holdRows.length > 0;
      const recordHolds = await this.holds.find({ status: "active" }).select("number records").lean().exec();
      const heldRecordIds = new Set(recordHolds.flatMap((h) => (h.records ?? []).map((r) => r.recordId)));
      const holdNumbers = new Set(holdRows.map((h) => h.number));

      const summary: Record<string, number> = { postsDeleted: 0, postsRetained: 0, commentsDeleted: 0, commentsRetained: 0, accountDeleted: 0, accountRetained: 0 };

      const posts = this.connection.models["Post"];
      if (posts) {
        const ids: string[] = (await posts.find({ user: String(userId) }).select("_id").lean().exec()).map((p: any) => String(p._id));
        const keep = ids.filter((id) => accountHeld || heldRecordIds.has(id));
        const remove = ids.filter((id) => !keep.includes(id));
        for (const h of recordHolds) if ((h.records ?? []).some((r) => keep.includes(r.recordId))) holdNumbers.add(h.number);
        if (remove.length) summary.postsDeleted = (await posts.deleteMany({ _id: { $in: remove.map((id) => new Types.ObjectId(id)) } }).exec()).deletedCount ?? 0;
        if (keep.length) {
          // Kept for the hold, but hidden everywhere (the feed already skips removed posts).
          await posts
            .updateMany(
              { _id: { $in: keep.map((id) => new Types.ObjectId(id)) } },
              { $set: { moderationStatus: "removed", moderationRemovedAt: new Date(), moderationHiddenBy: "system", moderationReason: "Account deleted (kept under legal hold)" } },
            )
            .exec();
        }
        summary.postsRetained = keep.length;
      }

      const comments = this.connection.models["Comment"];
      if (comments) {
        const ids: string[] = (await comments.find({ userId: String(userId) }).select("_id").lean().exec()).map((c: any) => String(c._id));
        const keep = ids.filter((id) => accountHeld || heldRecordIds.has(id));
        const remove = ids.filter((id) => !keep.includes(id));
        if (remove.length) summary.commentsDeleted = (await comments.deleteMany({ _id: { $in: remove.map((id) => new Types.ObjectId(id)) } }).exec()).deletedCount ?? 0;
        summary.commentsRetained = keep.length;
      }

      if (accountHeld || heldRecordIds.has(String(userId))) {
        summary.accountRetained = 1;
      } else {
        summary.privacyRecordsDeleted = await this.removePrivacyCenterData(String(userId));
        summary.accountDeleted = (await users.deleteOne({ _id: user._id }).exec()).deletedCount ?? 0;
      }

      const status = holdNumbers.size ? "completed_with_hold" : "completed";
      await this.deletions.updateOne({ _id: record._id }, { $set: { status, completedAt: new Date(), holdNumbers: Array.from(holdNumbers), summary } }).exec();
      await this.audit.record({
        actorId: requestedBy,
        action: status === "completed" ? "account_deleted" : "account_deleted_with_hold",
        targetType: "account_deletion",
        targetId: String(record._id),
        targetLabel: number,
        holdNumber: Array.from(holdNumbers).join(", "),
        metadata: { source, ...summary },
      });
      if (holdNumbers.size) {
        await this.common.notifyStaff("Deletion limited by legal hold", `${number}: some records were kept under ${Array.from(holdNumbers).join(", ")}.`, "/admin/legal/deletions", String(record._id), "account_deletion");
      }
      return { number, status };
    } catch (error) {
      this.logger.error(`Account deletion ${number} failed: ${String(error)}`);
      await this.deletions.updateOne({ _id: record._id }, { $set: { status: "failed", error: String((error as Error)?.message ?? error).slice(0, 300) } }).exec();
      throw error;
    }
  }

  /**
   * Policy Center data that only exists to serve the account (privacy
   * settings, consents, activity, data requests and export files).
   * Policy acceptance records are kept and follow their retention rule.
   */
  private async removePrivacyCenterData(userId: string) {
    let removed = 0;
    const requests = this.connection.models["UserDataRequest"];
    if (requests) {
      const files = await requests.find({ userId, fileKey: { $nin: ["", null] } }).select("fileKey").lean().exec();
      for (const f of files as any[]) await this.common.cloud.deleteObject(f.fileKey).catch(() => undefined);
    }
    for (const name of ["UserPrivacySettings", "UserConsent", "UserConsentEvent", "UserPolicyActivity", "UserDataRequest"]) {
      const model = this.connection.models[name];
      if (model) removed += ((await model.deleteMany({ userId }).exec()) as any)?.deletedCount ?? 0;
    }
    const privacy = this.connection.models["UserPrivacySettings"];
    if (privacy) await privacy.updateMany({ mutedUserIds: userId }, { $pull: { mutedUserIds: userId } }).exec();
    return removed;
  }

  async list(query: DeletionsQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const filter: Record<string, unknown> = {};
    if (query.status && query.status !== "all") filter.status = query.status;
    if (query.search) filter.$or = [{ number: query.search.toUpperCase() }, { userId: query.search }];
    const [rows, total] = await Promise.all([
      this.deletions.find(filter).sort({ requestedAt: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean().exec(),
      this.deletions.countDocuments(filter).exec(),
    ]);
    return {
      items: rows.map((r) => ({
        id: String(r._id),
        number: r.number,
        userId: r.userId || null,
        source: r.source,
        status: r.status,
        requestedAt: r.requestedAt,
        completedAt: r.completedAt ?? null,
        holdNumbers: r.holdNumbers ?? [],
        summary: r.summary ?? {},
        anonymizedAt: r.anonymizedAt ?? null,
      })),
      total,
      page,
      hasMore: page * PAGE_SIZE < total,
    };
  }

  async counts() {
    return { total: await this.deletions.countDocuments({}).exec(), withHold: await this.deletions.countDocuments({ status: "completed_with_hold" }).exec() };
  }
}
