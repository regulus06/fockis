import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import { Connection, Model, Types } from "mongoose";

import { CreateJurisdictionRuleDto, UpdatePolicyDto } from "../dto/legal.dto";
import {
  AUTOMATED_RETENTION_TYPES,
  RETENTION_CATEGORIES,
} from "../legal.constants";
import {
  AccountDeletion,
  AccountDeletionDocument,
  EvidenceExport,
  EvidenceExportDocument,
  EvidenceRecord,
  EvidenceRecordDocument,
  LegalCounter,
  LegalHold,
  LegalHoldDocument,
  LegalRequest,
  LegalRequestDocument,
  RetentionPolicy,
  RetentionPolicyDocument,
} from "../schemas/legal.schemas";
import { LegalAuditService } from "./legal-audit.service";
import { LegalCommonService } from "./legal-common.service";

const DAY = 86_400_000;
const BATCH = 500;
const RUN_EVERY_MS = 6 * 60 * 60 * 1000;
const LOCK_MS = 60 * 60 * 1000;

/**
 * Retention rules and the background job that applies them.
 *
 * - Rules exist per record category and jurisdiction; the job applies the
 *   "global" rule for automated categories.
 * - Nothing is deleted until compliance staff set a period and switch the
 *   rule on. No period is pre-filled.
 * - Anything covered by an active legal hold is always skipped.
 * - Every run re-applies deletion tombstones, so an account restored from a
 *   backup after deletion is deactivated again.
 */
@Injectable()
export class RetentionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RetentionService.name);
  private timer: NodeJS.Timeout | null = null;
  private first: NodeJS.Timeout | null = null;

  constructor(
    @InjectModel(RetentionPolicy.name)
    private readonly policies: Model<RetentionPolicyDocument>,
    @InjectModel(EvidenceRecord.name)
    private readonly records: Model<EvidenceRecordDocument>,
    @InjectModel(EvidenceExport.name)
    private readonly exportsModel: Model<EvidenceExportDocument>,
    @InjectModel(AccountDeletion.name)
    private readonly deletions: Model<AccountDeletionDocument>,
    @InjectModel(LegalRequest.name)
    private readonly requests: Model<LegalRequestDocument>,
    @InjectModel(LegalHold.name)
    private readonly holds: Model<LegalHoldDocument>,
    @InjectModel(LegalCounter.name)
    private readonly counters: Model<LegalCounter>,
    @InjectConnection()
    private readonly connection: Connection,
    private readonly common: LegalCommonService,
    private readonly audit: LegalAuditService,
  ) {}

  async onModuleInit() {
    await this.migrateLegacy().catch((error) =>
      this.logger.warn(`Retention migration failed: ${String(error)}`),
    );

    await this.seed().catch((error) =>
      this.logger.warn(`Retention seed failed: ${String(error)}`),
    );

    if (
      process.env.NODE_ENV === "test" ||
      process.env.LEGAL_RETENTION_JOB === "off"
    ) {
      return;
    }

    this.first = setTimeout(
      () => void this.runScheduled(),
      10 * 60 * 1000,
    );

    this.timer = setInterval(
      () => void this.runScheduled(),
      RUN_EVERY_MS,
    );

    this.first.unref?.();
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.first) clearTimeout(this.first);
    if (this.timer) clearInterval(this.timer);
  }

  /**
   * Earlier releases created rules with pre-filled periods and a unique index
   * on recordType alone. Pre-filled periods that staff never changed are
   * cleared (they were not set by compliance), and the old index is dropped
   * so jurisdiction rules can exist alongside the global one.
   */
  async migrateLegacy() {
    const collection: any = (this.policies as any).collection;

    if (collection?.indexes) {
      const indexes: any[] = await collection.indexes().catch(() => []);

      if (indexes.some((i) => i.name === "recordType_1")) {
        await collection
          .dropIndex("recordType_1")
          .catch(() => undefined);
      }
    }

    await this.policies
      .updateMany(
        { jurisdiction: { $exists: false } },
        { $set: { jurisdiction: "global" } },
      )
      .exec();

    const untouched = await this.policies
      .find({
        jurisdiction: "global",
        retentionDays: { $ne: null },
        updatedBy: { $exists: false },
        "history.0": { $exists: false },
      })
      .select("_id retentionDays")
      .lean()
      .exec();

    for (const r of untouched) {
      await this.policies
        .updateOne(
          { _id: r._id },
          {
            $set: {
              retentionDays: null,
              enabled: false,
              status: "needs_configuration",
            },
            $push: {
              history: {
                at: new Date(),
                by: "system",
                changes: `retentionDays: ${r.retentionDays} days → not set; enabled → false`,
                reason:
                  "Pre-filled default removed. Compliance must set the period.",
              },
            },
          },
        )
        .exec();
    }

    for (const c of RETENTION_CATEGORIES) {
      await this.policies
        .updateMany(
          {
            recordType: c.recordType,
            automated: { $exists: false },
          },
          { $set: { automated: c.automated } },
        )
        .exec();
    }
  }

  /** Creates one empty "global" rule per category. Existing rules are left untouched. */
  async seed() {
    for (const c of RETENTION_CATEGORIES) {
      await this.policies
        .findOneAndUpdate(
          {
            recordType: c.recordType,
            jurisdiction: "global",
          },
          {
            $setOnInsert: {
              recordType: c.recordType,
              jurisdiction: "global",
              label: c.label,
              description: c.description,
              action: c.action,
              automated: c.automated,
              retentionDays: null,
              enabled: false,
              status: "needs_configuration",
              purpose: "",
              legalBasis: "",
              responsibleRole: "",
              effectiveDate: null,
              nextReviewAt: null,
              lastRunAt: null,
              lastRunAffected: 0,
              lastRunNote: "",
              history: [],
            },
          },
          { upsert: true },
        )
        .exec();
    }
  }

  private view(r: any, people: Map<string, any>) {
    return {
      id: String(r._id),
      recordType: r.recordType,
      jurisdiction: r.jurisdiction ?? "global",
      label: r.label,
      retentionDays: r.retentionDays ?? null,
      action: r.action,
      enabled: Boolean(r.enabled),
      automated: Boolean(
        r.automated ??
          AUTOMATED_RETENTION_TYPES.includes(r.recordType),
      ),
      status:
        r.status ??
        (r.retentionDays ? "active" : "needs_configuration"),
      description: r.description ?? "",
      purpose: r.purpose ?? "",
      legalBasis: r.legalBasis ?? "",
      responsibleRole: r.responsibleRole ?? "",
      effectiveDate: r.effectiveDate ?? null,
      nextReviewAt: r.nextReviewAt ?? null,
      reviewDue: Boolean(
        r.nextReviewAt &&
          new Date(r.nextReviewAt).getTime() <= Date.now(),
      ),
      updatedAt: r.updatedAt,
      updatedBy: this.common.person(people, r.updatedBy),
      lastRunAt: r.lastRunAt ?? null,
      lastRunAffected: r.lastRunAffected ?? 0,
      lastRunNote: r.lastRunNote ?? "",
      history: (r.history ?? [])
        .slice(-20)
        .reverse()
        .map((h: any) => ({
          at: h.at,
          changes: h.changes,
          reason: h.reason,
          by: this.common.person(people, h.by),
        })),
    };
  }

  async list() {
    const order = new Map(
      RETENTION_CATEGORIES.map((c, i) => [
        c.recordType as string,
        i,
      ]),
    );

    const rows = await this.policies.find({}).lean().exec();

    rows.sort(
      (a, b) =>
        (order.get(a.recordType) ?? 99) -
          (order.get(b.recordType) ?? 99) ||
        String(a.jurisdiction).localeCompare(
          String(b.jurisdiction),
        ),
    );

    const people = await this.common.people(
      rows.flatMap((r) => [
        r.updatedBy,
        ...(r.history ?? []).map((h) => h.by),
      ]),
    );

    return rows.map((r) => this.view(r, people));
  }

  private describeChanges(
    before: any,
    after: Record<string, unknown>,
  ) {
    const label = (k: string, v: unknown) =>
      k === "retentionDays"
        ? v
          ? `${v} days`
          : "not set"
        : v instanceof Date
          ? v.toISOString().slice(0, 10)
          : String(v ?? "");

    return Object.entries(after)
      .filter(
        ([k, v]) =>
          k !== "updatedBy" &&
          String(before?.[k] ?? "") !== String(v ?? ""),
      )
      .map(
        ([k, v]) =>
          `${k}: ${label(k, before?.[k])} → ${label(k, v)}`,
      )
      .join("; ");
  }

  /**
   * The explicit status property type fixes the Mongoose create() overload
   * error while preserving the existing update behavior.
   */
  private buildSet(
    dto: UpdatePolicyDto,
    actorId: string,
    current?: any,
  ): Record<string, unknown> & { status: string } {
    const set: Record<string, unknown> & { status: string } = {
      updatedBy: actorId,
      status: "",
    };

    if (dto.retentionDays !== undefined) {
      set.retentionDays = dto.retentionDays;
    }

    if (dto.action !== undefined) {
      set.action = dto.action;
    }

    if (dto.enabled !== undefined) {
      set.enabled = dto.enabled;
    }

    if (dto.purpose !== undefined) {
      set.purpose = dto.purpose;
    }

    if (dto.legalBasis !== undefined) {
      set.legalBasis = dto.legalBasis;
    }

    if (dto.responsibleRole !== undefined) {
      set.responsibleRole = dto.responsibleRole;
    }

    if (dto.effectiveDate !== undefined) {
      set.effectiveDate = dto.effectiveDate
        ? new Date(dto.effectiveDate)
        : null;
    }

    if (dto.nextReviewAt !== undefined) {
      set.nextReviewAt = dto.nextReviewAt
        ? new Date(dto.nextReviewAt)
        : null;
    }

    const days =
      set.retentionDays !== undefined
        ? set.retentionDays
        : current?.retentionDays;

    const enabled =
      set.enabled !== undefined
        ? set.enabled
        : current?.enabled;

    if (dto.status) {
      set.status = dto.status;
    } else {
      set.status = !days
        ? "needs_configuration"
        : enabled
          ? "active"
          : "paused";
    }

    // A rule can only run automatically once it has a period.
    if (!days) {
      set.enabled = false;
    }

    return set;
  }

  async update(
    actorId: string,
    recordType: string,
    dto: UpdatePolicyDto,
    jurisdiction = "global",
  ) {
    const policy = await this.policies
      .findOne({
        recordType,
        jurisdiction: jurisdiction || "global",
      })
      .lean()
      .exec();

    if (!policy) {
      throw new NotFoundException(
        "That retention rule was not found.",
      );
    }

    const set = this.buildSet(dto, actorId, policy);
    const changes = this.describeChanges(policy, set);

    await this.policies
      .updateOne(
        { _id: policy._id },
        {
          $set: set,
          $push: {
            history: {
              at: new Date(),
              by: actorId,
              changes: changes || "no changes",
              reason: dto.reason,
            },
          },
        },
      )
      .exec();

    await this.audit.record({
      actorId,
      action: "retention_policy_changed",
      targetType: "retention_policy",
      targetId: `${recordType}:${policy.jurisdiction}`,
      targetLabel: `${policy.label} (${policy.jurisdiction})`,
      reason: dto.reason,
      metadata: { changes },
    });

    return (await this.list()).find(
      (p) =>
        p.recordType === recordType &&
        p.jurisdiction === policy.jurisdiction,
    );
  }

  /** Adds a jurisdiction-specific rule for a category. */
  async createJurisdictionRule(
    actorId: string,
    dto: CreateJurisdictionRuleDto,
  ) {
    const jurisdiction = dto.jurisdiction.toUpperCase();

    const base = await this.policies
      .findOne({
        recordType: dto.recordType,
        jurisdiction: "global",
      })
      .lean()
      .exec();

    if (!base) {
      throw new NotFoundException(
        "That category was not found.",
      );
    }

    if (
      await this.policies.exists({
        recordType: dto.recordType,
        jurisdiction,
      })
    ) {
      throw new ConflictException(
        `A ${jurisdiction} rule already exists for this category.`,
      );
    }

    const set = this.buildSet(dto, actorId);

    await this.policies.create({
      recordType: dto.recordType,
      jurisdiction,
      label: base.label,
      description: base.description,
      action: (set.action as any) ?? base.action,
      automated: base.automated,
      retentionDays: (set.retentionDays as any) ?? null,
      enabled: Boolean(set.enabled),
      status: set.status,
      purpose: (set.purpose as string) ?? "",
      legalBasis: (set.legalBasis as string) ?? "",
      responsibleRole:
        (set.responsibleRole as string) ?? "",
      effectiveDate: (set.effectiveDate as any) ?? null,
      nextReviewAt: (set.nextReviewAt as any) ?? null,
      updatedBy: actorId,
      history: [
        {
          at: new Date(),
          by: actorId,
          changes: "rule created",
          reason: dto.reason,
        },
      ],
    });

    await this.audit.record({
      actorId,
      action: "retention_policy_changed",
      targetType: "retention_policy",
      targetId: `${dto.recordType}:${jurisdiction}`,
      targetLabel: `${base.label} (${jurisdiction})`,
      reason: dto.reason,
      metadata: { created: true },
    });

    return (await this.list()).find(
      (p) =>
        p.recordType === dto.recordType &&
        p.jurisdiction === jurisdiction,
    );
  }

  /* ---------------- job ---------------- */

  private async runScheduled() {
    try {
      const now = Date.now();

      const lock = await this.counters
        .findOneAndUpdate(
          {
            _id: "retention-lock",
            seq: { $lt: now - LOCK_MS },
          },
          { $set: { seq: now } },
          { new: true },
        )
        .lean()
        .exec()
        .catch(() => null);

      if (!lock) {
        if (
          await this.counters.exists({
            _id: "retention-lock",
          })
        ) {
          return;
        }

        await this.counters.create({
          _id: "retention-lock",
          seq: now,
        });
      }

      await this.run("system");
    } catch (error) {
      this.logger.warn(
        `Retention job failed: ${String(error)}`,
      );
    }
  }

  async run(actorId: string) {
    const rules = await this.policies
      .find({ jurisdiction: "global" })
      .lean()
      .exec();

    const active = new Map(
      rules
        .filter(
          (r) =>
            r.enabled &&
            r.retentionDays &&
            r.automated,
        )
        .map((r) => [r.recordType, r]),
    );

    const result: Record<string, number> = {};
    const notes: Record<string, string> = {};

    const activeHolds = await this.holds
      .find({ status: "active" })
      .select("_id records subjects")
      .lean()
      .exec();

    const heldHoldIds = new Set(
      activeHolds.map((h) => String(h._id)),
    );

    const heldRecordIds = new Set(
      activeHolds.flatMap((h) =>
        (h.records ?? []).map((r) => r.recordId),
      ),
    );

    const heldUserIds = new Set(
      activeHolds.flatMap((h) =>
        (h.subjects ?? []).map((s) => s.userId),
      ),
    );

    const cutoff = (r: any) =>
      new Date(
        Date.now() - Number(r.retentionDays) * DAY,
      );

    const ev = active.get("evidence_record");

    if (ev) {
      const rows = await this.records
        .find({
          status: "preserved",
          preservedAt: { $lt: cutoff(ev) },
        })
        .select(
          "_id number holdId recordId userId files caseReference",
        )
        .limit(BATCH)
        .lean()
        .exec();

      let n = 0;

      for (const r of rows) {
        if (
          (r.holdId &&
            heldHoldIds.has(String(r.holdId))) ||
          heldRecordIds.has(r.recordId) ||
          (r.userId && heldUserIds.has(r.userId))
        ) {
          continue;
        }

        for (const f of r.files ?? []) {
          await this.common.cloud
            .deleteObject(f.key)
            .catch(() => undefined);
        }

        await this.records
          .updateOne(
            { _id: r._id, status: "preserved" },
            {
              $set: {
                status: "expired",
                expiredAt: new Date(),
                snapshot: {},
                files: [],
              },
            },
          )
          .exec();

        await this.audit.record({
          actorId,
          action: "evidence_expired",
          targetType: "evidence_record",
          targetId: String(r._id),
          targetLabel: r.number,
          caseReference: r.caseReference,
          reason: `Retention period of ${ev.retentionDays} days ended`,
        });

        n += 1;
      }

      result.evidence_record = n;
    }

    const ex = active.get("evidence_export");

    if (ex) {
      const rows = await this.exportsModel
        .find({
          exportedAt: { $lt: cutoff(ex) },
          packageRemovedAt: null,
        })
        .select(
          "_id number packageKey caseReference",
        )
        .limit(BATCH)
        .lean()
        .exec();

      for (const r of rows) {
        if (r.packageKey) {
          await this.common.cloud
            .deleteObject(r.packageKey)
            .catch(() => undefined);
        }

        await this.exportsModel
          .updateOne(
            { _id: r._id },
            {
              $set: {
                packageRemovedAt: new Date(),
                packageKey: "",
              },
            },
          )
          .exec();

        await this.audit.record({
          actorId,
          action: "export_package_removed",
          targetType: "evidence_export",
          targetId: String(r._id),
          targetLabel: r.number,
          caseReference: r.caseReference,
          reason: `Retention period of ${ex.retentionDays} days ended`,
        });
      }

      result.evidence_export = rows.length;
    }

    const da = active.get("deleted_account_record");

    if (da) {
      const rows = await this.deletions
        .find({
          requestedAt: { $lt: cutoff(da) },
          anonymizedAt: null,
          status: { $in: ["completed", "failed"] },
        })
        .select("_id userId")
        .limit(BATCH)
        .lean()
        .exec();

      const ids = rows
        .filter((r) => !heldUserIds.has(r.userId))
        .map((r) => r._id);

      if (ids.length) {
        await this.deletions
          .updateMany(
            { _id: { $in: ids } },
            {
              $set: {
                userId: "",
                requestedBy: "",
                anonymizedAt: new Date(),
              },
            },
          )
          .exec();
      }

      result.deleted_account_record = ids.length;
    }

    const lr = active.get("legal_request_closed");

    if (lr) {
      const rows = await this.requests
        .find({
          completionStatus: {
            $in: ["completed", "closed"],
          },
          completedAt: { $lt: cutoff(lr) },
          anonymizedAt: null,
        })
        .select("_id holdId")
        .limit(BATCH)
        .lean()
        .exec();

      const ids = rows
        .filter(
          (r) =>
            !(r.holdId &&
              heldHoldIds.has(String(r.holdId))),
        )
        .map((r) => r._id);

      if (ids.length) {
        await this.requests
          .updateMany(
            { _id: { $in: ids } },
            {
              $set: {
                authority: "[removed]",
                authorityContact: "",
                notes: "",
                anonymizedAt: new Date(),
              },
            },
          )
          .exec();
      }

      result.legal_request_closed = ids.length;
    }

    const pa = active.get("policy_acceptance");
    const acceptances =
      this.connection?.models?.["PolicyAcceptance"];
    const users = this.connection?.models?.["User"];

    if (pa && acceptances && users) {
      // Only records of accounts that no longer exist; active users keep their history.
      const candidates = await acceptances
        .find({
          acceptedAt: { $lt: cutoff(pa) },
        })
        .select("_id userId")
        .limit(BATCH * 4)
        .lean()
        .exec();

      const userIds = Array.from(
        new Set(
          candidates
            .map((c: any) => String(c.userId))
            .filter(
              (id) =>
                Types.ObjectId.isValid(id) &&
                !heldUserIds.has(id),
            ),
        ),
      );

      const existing = new Set(
        (
          await users
            .find({
              _id: {
                $in: userIds.map(
                  (id) => new Types.ObjectId(id),
                ),
              },
            })
            .select("_id")
            .lean()
            .exec()
        ).map((u: any) => String(u._id)),
      );

      const gone = userIds.filter(
        (id) => !existing.has(id),
      );

      const removed = gone.length
        ? (
            (await acceptances
              .deleteMany({
                userId: { $in: gone },
                acceptedAt: { $lt: cutoff(pa) },
              })
              .exec()) as any
          ).deletedCount ?? 0
        : 0;

      result.policy_acceptance = removed;
    }

    // Manual-review categories: flag the rule for review when its review date has passed.
    for (const r of rules.filter((x) => !x.automated)) {
      notes[r.recordType] = !r.retentionDays
        ? "Period not set — no records deleted."
        : r.nextReviewAt &&
            new Date(r.nextReviewAt).getTime() <=
              Date.now()
          ? "Review date passed — please review."
          : "Handled by manual review.";
    }

    // Expired personal-data exports (Policy Center → Download My Data).
    const dataRequests =
      this.connection?.models?.["UserDataRequest"];

    if (dataRequests) {
      const rows = await dataRequests
        .find({
          type: "export",
          status: "completed",
          expiresAt: { $lt: new Date() },
          fileKey: { $ne: "" },
        })
        .select("_id fileKey")
        .limit(BATCH)
        .lean()
        .exec();

      for (const r of rows as any[]) {
        await this.common.cloud
          .deleteObject(r.fileKey)
          .catch(() => undefined);

        await dataRequests
          .updateOne(
            { _id: r._id },
            {
              $set: {
                fileKey: "",
                status: "expired",
              },
            },
          )
          .exec();
      }

      result.personal_data_exports = rows.length;
    }

    result.tombstones_reapplied =
      await this.reapplyTombstones(actorId);

    const now = new Date();

    for (const r of rules) {
      await this.policies
        .updateOne(
          { _id: r._id },
          {
            $set: {
              lastRunAt: now,
              lastRunAffected:
                result[r.recordType] ?? 0,
              lastRunNote:
                notes[r.recordType] ?? "",
            },
          },
        )
        .exec();
    }

    await this.audit.record({
      actorId,
      action: "retention_run",
      targetType: "retention_policy",
      targetLabel: "Retention job",
      metadata: result,
    });

    return {
      ranAt: now,
      affected: result,
    };
  }

  /**
   * Deletion tombstones: if an account that was deleted shows up again
   * (for example after restoring a backup), deactivate it straight away.
   */
  async reapplyTombstones(actorId: string) {
    const users = this.connection?.models?.["User"];

    if (!users) return 0;

    const tombstones = await this.deletions
      .find({
        status: {
          $in: ["completed", "completed_with_hold"],
        },
        userId: { $ne: "" },
      })
      .select("userId number status")
      .limit(5000)
      .lean()
      .exec();

    const ids = tombstones
      .map((t) => t.userId)
      .filter((id) => Types.ObjectId.isValid(id));

    if (!ids.length) return 0;

    const revived = await users
      .find({
        _id: {
          $in: ids.map(
            (id) => new Types.ObjectId(id),
          ),
        },
        isActive: { $ne: false },
      })
      .select("_id")
      .lean()
      .exec();

    for (const u of revived as any[]) {
      await users
        .updateOne(
          { _id: u._id },
          {
            $set: {
              isActive: false,
              online: false,
            },
          },
        )
        .exec();

      const t = tombstones.find(
        (x) => x.userId === String(u._id),
      );

      await this.audit.record({
        actorId,
        action: "tombstone_reapplied",
        targetType: "account_deletion",
        targetId: String(u._id),
        targetLabel: t?.number ?? "",
        reason:
          "Deleted account was active again (possible backup restore) and was deactivated.",
      });
    }

    return revived.length;
  }

  /** Short summary for the dashboard panel. */
  async summary() {
    const rows = (await this.list()).filter(
      (r) => r.jurisdiction === "global",
    );

    const configured = rows.filter(
      (r) => r.retentionDays,
    );

    const nextReview =
      rows
        .map((r) => r.nextReviewAt)
        .filter(Boolean)
        .sort(
          (a, b) =>
            new Date(a as Date).getTime() -
            new Date(b as Date).getTime(),
        )[0] ?? null;

    return {
      active: rows.some(
        (r) => r.enabled && r.retentionDays,
      ),
      configured: configured.length,
      total: rows.length,
      policies: rows.map((r) => ({
        recordType: r.recordType,
        label: r.label,
        retentionDays: r.retentionDays,
        action: r.action,
        enabled: r.enabled,
      })),
      nextReviewAt: nextReview,
      lastRunAt:
        rows
          .map((r) => r.lastRunAt)
          .filter(Boolean)
          .sort()
          .pop() ?? null,
    };
  }
}