import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import { isSuperAdmin, type Actor } from "../../reports/utils/actor";
import { POLICY_SEED } from "../data/policy-seed";
import { CreatePolicyDto, ListPoliciesQueryDto, ListVersionsQueryDto, RestoreVersionDto, SaveDraftDto } from "../dto/policy.dto";
import { OPEN_VERSION_STATUSES, PAGE_SIZE } from "../policy.constants";
import {
  Policy,
  PolicyAcceptance,
  PolicyAcceptanceDocument,
  PolicyDocument,
  PolicySettings,
  PolicySettingsDocument,
  PolicyVersion,
  PolicyVersionDocument,
} from "../schemas/policy.schemas";
import { PolicyAuditService } from "./policy-audit.service";
import { PolicyCommonService, escapeRegex, oid } from "./policy-common.service";

const DAY = 86_400_000;

export interface ActorCtx {
  id: string;
  actor: Actor;
  context?: Record<string, unknown>;
}

/** Parses "2.3.1" into comparable numbers. */
export function versionKey(v: string) {
  return String(v)
    .split(".")
    .map((n) => Number(n) || 0)
    .concat([0, 0, 0])
    .slice(0, 3);
}
export function compareVersions(a: string, b: string) {
  const x = versionKey(a);
  const y = versionKey(b);
  for (let i = 0; i < 3; i += 1) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
}

/**
 * Policies and their versions: Draft → Review → Approve → Schedule → Publish.
 * Published versions are never edited or deleted; each change is a new
 * version, and publishing supersedes (not removes) the previous one.
 */
@Injectable()
export class PoliciesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PoliciesService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    @InjectModel(Policy.name) private readonly policies: Model<PolicyDocument>,
    @InjectModel(PolicyVersion.name) private readonly versions: Model<PolicyVersionDocument>,
    @InjectModel(PolicyAcceptance.name) private readonly acceptances: Model<PolicyAcceptanceDocument>,
    @InjectModel(PolicySettings.name) private readonly settingsModel: Model<PolicySettingsDocument>,
    private readonly common: PolicyCommonService,
    private readonly audit: PolicyAuditService,
  ) {}

  async onModuleInit() {
    await this.seed().catch((error) => this.logger.warn(`Policy seed failed: ${String(error)}`));
    if (process.env.NODE_ENV === "test") return;
    this.timer = setInterval(() => void this.publishDue().catch((e) => this.logger.warn(`Scheduled publish failed: ${String(e)}`)), 5 * 60 * 1000);
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /** One-time import of the original policy pages. Never duplicates or overwrites. */
  async seed() {
    for (const s of POLICY_SEED) {
      const exists = await this.policies.exists({ $or: [{ slug: s.slug }, { legacySlugs: s.slug }, ...(s.legacySlugs.length ? [{ slug: { $in: s.legacySlugs } }] : [])] });
      if (exists) continue;
      const effective = s.effectiveDate ? new Date(`${s.effectiveDate}T00:00:00Z`) : null;
      const policy = await this.policies.create({
        slug: s.slug,
        legacySlugs: s.legacySlugs,
        title: s.title,
        category: s.category,
        description: s.description,
        audience: "everyone",
        requiredAcceptance: s.requiredAcceptance,
        status: s.status,
        order: s.order,
        createdBy: "system",
        updatedBy: "system",
        documents: [],
      });
      const version = await this.versions.create({
        policyId: policy._id,
        version: "1.0",
        title: s.title,
        description: s.description,
        sections: s.sections,
        changeSummary: s.status === "published" ? "Initial version (imported from the original policy pages)." : "Initial draft for legal review.",
        status: s.status,
        requiredAcceptance: s.requiredAcceptance,
        effectiveDate: effective,
        createdBy: "system",
        publishedBy: s.status === "published" ? "system" : "",
        publishedAt: s.status === "published" ? effective : null,
        review: [],
      });
      const set =
        s.status === "published"
          ? { publishedVersionId: version._id, publishedVersion: "1.0", publishedAt: effective, effectiveDate: effective }
          : { workingVersionId: version._id };
      await this.policies.updateOne({ _id: policy._id }, { $set: set }).exec();
    }
    await this.settingsModel.findOneAndUpdate({ key: "global" }, { $setOnInsert: { key: "global" } }, { upsert: true }).exec();
  }

  async settings() {
    const defaults = { key: "global", defaultReviewDays: 365, requireIndependentApproval: true, approvalDeadlineDays: 7, notifyUsersOnRequiredUpdate: true, notifyApprovers: true, acceptanceGraceDays: 30 };
    const doc = await this.settingsModel.findOne({ key: "global" }).lean().exec();
    return { ...defaults, ...Object.fromEntries(Object.entries(doc ?? {}).filter(([, v]) => v !== undefined && v !== null)) } as any;
  }

  async updateSettings(ctx: ActorCtx, dto: Record<string, unknown>) {
    const before = await this.settings();
    const set: Record<string, unknown> = { updatedBy: ctx.id };
    const changes: string[] = [];
    for (const [k, v] of Object.entries(dto)) {
      if (v === undefined) continue;
      set[k] = v;
      if ((before as any)[k] !== v) changes.push(`${k}: ${(before as any)[k]} → ${v}`);
    }
    await this.settingsModel.findOneAndUpdate({ key: "global" }, { $set: set }, { upsert: true }).exec();
    if (changes.length) {
      await this.audit.record({ actorId: ctx.id, actorRole: this.common.actorRole(ctx.actor), action: dto.requiredAcceptance !== undefined ? "acceptance_requirement_changed" : "policy_settings_changed", targetType: "policy_settings", targetLabel: "Policy settings", summary: changes.join("; "), context: ctx.context });
    }
    return this.settings();
  }

  /* ======================================================================
     VIEWS
  ====================================================================== */

  private summary(p: any, people: Map<string, any>, working?: any) {
    return {
      id: String(p._id),
      slug: p.slug,
      legacySlugs: p.legacySlugs ?? [],
      title: p.title,
      category: p.category,
      description: p.description ?? "",
      audience: p.audience ?? "everyone",
      requiredAcceptance: Boolean(p.requiredAcceptance),
      status: p.status,
      publishedVersion: p.publishedVersion || null,
      publishedAt: p.publishedAt ?? null,
      effectiveDate: p.effectiveDate ?? null,
      reviewDate: p.reviewDate ?? null,
      documents: p.documents ?? [],
      updatedAt: p.updatedAt,
      updatedBy: this.common.person(people, p.updatedBy),
      working: working ? { id: String(working._id), version: working.version, status: working.status, scheduledFor: working.scheduledFor ?? null } : null,
    };
  }

  versionView(v: any, people: Map<string, any>, internal = true) {
    return {
      id: String(v._id),
      policyId: String(v.policyId),
      version: v.version,
      title: v.title,
      description: v.description ?? "",
      sections: (v.sections ?? []).map((s: any) => ({ heading: s.heading ?? "", body: s.body ?? "" })),
      changeSummary: v.changeSummary ?? "",
      status: v.status,
      requiredAcceptance: Boolean(v.requiredAcceptance),
      effectiveDate: v.effectiveDate ?? null,
      scheduledFor: v.scheduledFor ?? null,
      approvalDeadline: v.approvalDeadline ?? null,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
      publishedAt: v.publishedAt ?? null,
      supersededAt: v.supersededAt ?? null,
      restoredFrom: v.restoredFrom ?? "",
      createdBy: this.common.person(people, v.createdBy),
      submittedBy: this.common.person(people, v.submittedBy),
      submittedAt: v.submittedAt ?? null,
      approvedBy: this.common.person(people, v.approvedBy),
      approvedAt: v.approvedAt ?? null,
      rejectedBy: this.common.person(people, v.rejectedBy),
      rejectedAt: v.rejectedAt ?? null,
      publishedBy: this.common.person(people, v.publishedBy),
      ...(internal ? { review: (v.review ?? []).map((r: any) => ({ action: r.action, note: r.note, at: r.at, actor: this.common.person(people, r.actorId) })) } : {}),
    };
  }

  private versionPeople(v: any) {
    return [v.createdBy, v.submittedBy, v.approvedBy, v.rejectedBy, v.publishedBy, ...(v.review ?? []).map((r: any) => r.actorId)];
  }

  /* ======================================================================
     ADMIN — READ
  ====================================================================== */

  async list(query: ListPoliciesQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const filter: Record<string, unknown> = {};
    if (query.category) filter.category = query.category;
    if (query.status) filter.status = query.status;
    if (query.search) {
      const re = new RegExp(escapeRegex(query.search), "i");
      filter.$or = [{ title: re }, { slug: re }, { description: re }];
    }
    const [rows, total, categoryCounts] = await Promise.all([
      this.policies.find(filter).sort({ order: 1, title: 1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean().exec(),
      this.policies.countDocuments(filter).exec(),
      this.policies.countDocuments({}).exec(),
    ]);
    const workingIds = rows.map((r) => r.workingVersionId).filter(Boolean);
    const working = workingIds.length ? await this.versions.find({ _id: { $in: workingIds } }).select("version status scheduledFor").lean().exec() : [];
    const byId = new Map(working.map((w: any) => [String(w._id), w]));
    const people = await this.common.people(rows.map((r) => r.updatedBy));
    return {
      items: rows.map((r) => this.summary(r, people, r.workingVersionId ? byId.get(String(r.workingVersionId)) : undefined)),
      total,
      page,
      hasMore: page * PAGE_SIZE < total,
      all: categoryCounts,
    };
  }

  private async loadPolicy(id: string) {
    const p = await this.policies.findById(oid(id, "policy")).lean().exec();
    if (!p) throw new NotFoundException("That policy was not found.");
    return p;
  }

  async get(id: string) {
    const p = await this.loadPolicy(id);
    const [working, published, history] = await Promise.all([
      p.workingVersionId ? this.versions.findById(p.workingVersionId).lean().exec() : null,
      p.publishedVersionId ? this.versions.findById(p.publishedVersionId).lean().exec() : null,
      this.versions.find({ policyId: p._id }).select("version status changeSummary publishedAt effectiveDate createdAt createdBy approvedBy").sort({ createdAt: -1 }).lean().exec(),
    ]);
    const people = await this.common.people([p.updatedBy, ...(working ? this.versionPeople(working) : []), ...(published ? this.versionPeople(published) : []), ...history.flatMap((h: any) => [h.createdBy, h.approvedBy])]);
    const acceptanceCount = p.publishedVersionId ? await this.acceptances.countDocuments({ versionId: p.publishedVersionId }).exec() : 0;
    return {
      ...this.summary(p, people, working ?? undefined),
      workingVersion: working ? this.versionView(working, people) : null,
      publishedVersionDetail: published ? this.versionView(published, people) : null,
      versions: history.map((h: any) => ({
        id: String(h._id),
        version: h.version,
        status: h.status,
        changeSummary: h.changeSummary ?? "",
        publishedAt: h.publishedAt ?? null,
        effectiveDate: h.effectiveDate ?? null,
        createdAt: h.createdAt,
        createdBy: this.common.person(people, h.createdBy),
        approvedBy: this.common.person(people, h.approvedBy),
      })),
      acceptanceCount,
    };
  }

  async listVersions(query: ListVersionsQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const filter: Record<string, unknown> = {};
    if (query.policyId) filter.policyId = oid(query.policyId, "policy");
    if (query.status) filter.status = query.status;
    const [rows, total] = await Promise.all([
      this.versions.find(filter).select("-sections -review").sort({ createdAt: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean().exec(),
      this.versions.countDocuments(filter).exec(),
    ]);
    const policies = await this.policies.find({ _id: { $in: rows.map((r) => r.policyId) } }).select("title slug").lean().exec();
    const pById = new Map(policies.map((p: any) => [String(p._id), p]));
    const people = await this.common.people(rows.flatMap((r) => this.versionPeople(r)));
    return {
      items: rows.map((r) => ({ ...this.versionView({ ...r, sections: [] }, people, false), policyTitle: (pById.get(String(r.policyId)) as any)?.title ?? "", policySlug: (pById.get(String(r.policyId)) as any)?.slug ?? "" })),
      total,
      page,
      hasMore: page * PAGE_SIZE < total,
    };
  }

  async getVersion(versionId: string) {
    const v = await this.versions.findById(oid(versionId, "version")).lean().exec();
    if (!v) throw new NotFoundException("That version was not found.");
    const p = await this.policies.findById(v.policyId).select("title slug").lean().exec();
    const people = await this.common.people(this.versionPeople(v));
    return { ...this.versionView(v, people), policyTitle: (p as any)?.title ?? "", policySlug: (p as any)?.slug ?? "" };
  }

  async approvals(view: "pending" | "decided" | "all", page = 1) {
    const filter: Record<string, unknown> =
      view === "pending" ? { status: "pending_review" } : view === "decided" ? { status: { $in: ["approved", "scheduled", "rejected", "published"] }, submittedAt: { $ne: null } } : { submittedAt: { $ne: null } };
    const [rows, total] = await Promise.all([
      this.versions.find(filter).select("-sections").sort({ submittedAt: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean().exec(),
      this.versions.countDocuments(filter).exec(),
    ]);
    const policies = await this.policies.find({ _id: { $in: rows.map((r) => r.policyId) } }).select("title slug category").lean().exec();
    const pById = new Map(policies.map((p: any) => [String(p._id), p]));
    const people = await this.common.people(rows.flatMap((r) => this.versionPeople(r)));
    return {
      items: rows.map((r) => {
        const p: any = pById.get(String(r.policyId));
        return { ...this.versionView({ ...r, sections: [] }, people), policyTitle: p?.title ?? "", policySlug: p?.slug ?? "", category: p?.category ?? "" };
      }),
      total,
      page,
      hasMore: page * PAGE_SIZE < total,
    };
  }

  async stats() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const weekAgo = new Date(now.getTime() - 7 * DAY);
    const [active, activeThisMonth, pending, scheduledRows, totalVersions, acceptances, acceptancesWeek] = await Promise.all([
      this.policies.countDocuments({ status: "published" }).exec(),
      this.policies.countDocuments({ status: "published", publishedAt: { $gte: monthStart } }).exec(),
      this.versions.countDocuments({ status: "pending_review" }).exec(),
      this.versions.find({ status: "scheduled" }).select("scheduledFor").sort({ scheduledFor: 1 }).lean().exec(),
      this.versions.countDocuments({}).exec(),
      this.acceptances.countDocuments({}).exec(),
      this.acceptances.countDocuments({ acceptedAt: { $gte: weekAgo } }).exec(),
    ]);
    return {
      activePolicies: active,
      publishedThisMonth: activeThisMonth,
      pendingApproval: pending,
      scheduledUpdates: scheduledRows.length,
      nextScheduled: (scheduledRows[0] as any)?.scheduledFor ?? null,
      policyVersions: totalVersions,
      userAcceptances: acceptances,
      acceptancesThisWeek: acceptancesWeek,
    };
  }

  /* ======================================================================
     ADMIN — WRITE
  ====================================================================== */

  private async assertSlugFree(slug: string, exceptId?: Types.ObjectId) {
    const clash = await this.policies.findOne({ $or: [{ slug }, { legacySlugs: slug }], ...(exceptId ? { _id: { $ne: exceptId } } : {}) }).select("_id").lean().exec();
    if (clash) throw new ConflictException("Another policy already uses that slug.");
  }

  private async assertVersionFree(policyId: Types.ObjectId, version: string, exceptId?: Types.ObjectId) {
    const clash = await this.versions.findOne({ policyId, version, ...(exceptId ? { _id: { $ne: exceptId } } : {}) }).select("_id").lean().exec();
    if (clash) throw new ConflictException(`Version ${version} already exists for this policy.`);
  }

  async create(ctx: ActorCtx, dto: CreatePolicyDto) {
    await this.assertSlugFree(dto.slug);
    const settings = await this.settings();
    const policy = await this.policies.create({
      slug: dto.slug,
      legacySlugs: [],
      title: dto.title,
      category: dto.category,
      description: dto.description ?? "",
      audience: dto.audience ?? "everyone",
      requiredAcceptance: Boolean(dto.requiredAcceptance),
      status: "draft",
      order: 100,
      reviewDate: dto.reviewDate ? new Date(dto.reviewDate) : new Date(Date.now() + settings.defaultReviewDays * DAY),
      documents: dto.documents ?? [],
      createdBy: ctx.id,
      updatedBy: ctx.id,
    });
    const version = await this.versions.create({
      policyId: policy._id,
      version: dto.version,
      title: dto.title,
      description: dto.description ?? "",
      sections: dto.sections,
      changeSummary: dto.changeSummary ?? "",
      status: "draft",
      requiredAcceptance: Boolean(dto.requiredAcceptance),
      effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : null,
      createdBy: ctx.id,
      review: [{ action: "created", actorId: ctx.id, note: "", at: new Date() }],
    });
    await this.policies.updateOne({ _id: policy._id }, { $set: { workingVersionId: version._id } }).exec();
    await this.audit.record({ actorId: ctx.id, actorRole: this.common.actorRole(ctx.actor), action: "policy_created", targetType: "policy", targetId: String(policy._id), targetLabel: `${dto.title} v${dto.version}`, summary: dto.changeSummary ?? "", context: ctx.context });
    return this.get(String(policy._id));
  }

  /** Edits the working draft, or starts a new version from the published text. */
  async saveDraft(ctx: ActorCtx, id: string, dto: SaveDraftDto) {
    const p = await this.loadPolicy(id);
    if (p.status === "archived") throw new ConflictException("Restore this policy before editing it.");
    let working: any = p.workingVersionId ? await this.versions.findById(p.workingVersionId).lean().exec() : null;
    if (working && !["draft", "rejected"].includes(working.status)) {
      throw new ConflictException("This version is in review. Withdraw it to make changes.");
    }

    // Policy-level metadata.
    const policySet: Record<string, unknown> = { updatedBy: ctx.id };
    if (dto.category) policySet.category = dto.category;
    if (dto.audience) policySet.audience = dto.audience;
    if (dto.reviewDate !== undefined) policySet.reviewDate = dto.reviewDate ? new Date(dto.reviewDate) : null;
    if (dto.documents) policySet.documents = dto.documents;
    if (!p.publishedVersionId) {
      // Never published: the row mirrors the draft.
      if (dto.title) policySet.title = dto.title;
      if (dto.description !== undefined) policySet.description = dto.description;
      if (dto.requiredAcceptance !== undefined) policySet.requiredAcceptance = dto.requiredAcceptance;
    }

    const changes: string[] = [];
    if (!working) {
      const base: any = p.publishedVersionId ? await this.versions.findById(p.publishedVersionId).lean().exec() : null;
      if (!dto.version) throw new BadRequestException("Choose a new version number for these changes.");
      if (base && compareVersions(dto.version, base.version) <= 0) throw new BadRequestException(`The new version must be higher than ${base.version}.`);
      await this.assertVersionFree(p._id, dto.version);
      const created = await this.versions.create({
        policyId: p._id,
        version: dto.version,
        title: dto.title ?? base?.title ?? p.title,
        description: dto.description ?? base?.description ?? p.description,
        sections: dto.sections ?? base?.sections ?? [],
        changeSummary: dto.changeSummary ?? "",
        status: "draft",
        requiredAcceptance: dto.requiredAcceptance ?? base?.requiredAcceptance ?? p.requiredAcceptance,
        effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : null,
        createdBy: ctx.id,
        review: [{ action: "created", actorId: ctx.id, note: base ? `Based on v${base.version}` : "", at: new Date() }],
      });
      working = created;
      policySet.workingVersionId = created._id;
      if (p.status !== "published") policySet.status = "draft";
      changes.push(`new version ${dto.version}`);
    } else {
      const set: Record<string, unknown> = { status: "draft" };
      if (dto.version && dto.version !== working.version) {
        if (p.publishedVersion && compareVersions(dto.version, p.publishedVersion) <= 0) throw new BadRequestException(`The new version must be higher than ${p.publishedVersion}.`);
        await this.assertVersionFree(p._id, dto.version, working._id);
        set.version = dto.version;
      }
      if (dto.title) set.title = dto.title;
      if (dto.description !== undefined) set.description = dto.description;
      if (dto.sections) set.sections = dto.sections;
      if (dto.changeSummary !== undefined) set.changeSummary = dto.changeSummary;
      if (dto.requiredAcceptance !== undefined) {
        if (dto.requiredAcceptance !== working.requiredAcceptance) changes.push("acceptance requirement changed");
        set.requiredAcceptance = dto.requiredAcceptance;
      }
      if (dto.effectiveDate !== undefined) set.effectiveDate = dto.effectiveDate ? new Date(dto.effectiveDate) : null;
      await this.versions.updateOne({ _id: working._id }, { $set: set, $push: { review: { action: "edited", actorId: ctx.id, note: "", at: new Date() } } }).exec();
      if (p.status === "rejected" || (p.status !== "published" && p.status !== "draft")) policySet.status = p.publishedVersionId ? "published" : "draft";
      changes.push(`v${set.version ?? working.version} edited`);
    }
    await this.policies.updateOne({ _id: p._id }, { $set: policySet }).exec();
    await this.audit.record({ actorId: ctx.id, actorRole: this.common.actorRole(ctx.actor), action: changes.some((c) => c.startsWith("new version")) ? "version_created" : "policy_edited", targetType: "policy", targetId: id, targetLabel: p.title, summary: changes.join(", "), context: ctx.context });
    return this.get(id);
  }

  private async working(id: string, expected: string[], verb: string) {
    const p = await this.loadPolicy(id);
    const v: any = p.workingVersionId ? await this.versions.findById(p.workingVersionId).lean().exec() : null;
    if (!v || !expected.includes(v.status)) throw new ConflictException(`There is no version ready to ${verb}.`);
    return { p, v };
  }

  async submit(ctx: ActorCtx, id: string, note = "") {
    const { p, v } = await this.working(id, ["draft"], "submit");
    if (!v.sections?.length || !v.sections.some((s: any) => String(s.body).trim())) throw new BadRequestException("Add the policy text before submitting.");
    if (!v.changeSummary?.trim()) throw new BadRequestException("Add a change summary before submitting.");
    if (!v.effectiveDate) throw new BadRequestException("Set an effective date before submitting.");
    const settings = await this.settings();
    const now = new Date();
    await this.versions
      .updateOne(
        { _id: v._id },
        { $set: { status: "pending_review", submittedBy: ctx.id, submittedAt: now, approvalDeadline: new Date(now.getTime() + settings.approvalDeadlineDays * DAY) }, $push: { review: { action: "submitted", actorId: ctx.id, note, at: now } } },
      )
      .exec();
    await this.policies.updateOne({ _id: p._id }, { $set: { updatedBy: ctx.id, ...(p.publishedVersionId ? {} : { status: "pending_review" }) } }).exec();
    await this.audit.record({ actorId: ctx.id, actorRole: this.common.actorRole(ctx.actor), action: "policy_submitted", targetType: "policy_version", targetId: String(v._id), targetLabel: `${p.title} v${v.version}`, summary: note, context: ctx.context });
    if (settings.notifyApprovers) {
      const approvers = await this.common.staffWith("policy.review", ctx.id);
      await this.common.notify(approvers, "Policy waiting for approval", `${p.title} v${v.version}`, "/admin/policy-compliance/approvals", String(v._id), "policy_version");
    }
    return this.get(id);
  }

  async withdraw(ctx: ActorCtx, id: string) {
    const { p, v } = await this.working(id, ["pending_review", "approved", "scheduled"], "withdraw");
    await this.versions.updateOne({ _id: v._id }, { $set: { status: "draft", scheduledFor: null }, $push: { review: { action: "withdrawn", actorId: ctx.id, note: "", at: new Date() } } }).exec();
    if (!p.publishedVersionId) await this.policies.updateOne({ _id: p._id }, { $set: { status: "draft" } }).exec();
    await this.audit.record({ actorId: ctx.id, actorRole: this.common.actorRole(ctx.actor), action: "policy_withdrawn", targetType: "policy_version", targetId: String(v._id), targetLabel: `${p.title} v${v.version}`, context: ctx.context });
    return this.get(id);
  }

  async approve(ctx: ActorCtx, id: string, note = "") {
    const { p, v } = await this.working(id, ["pending_review"], "approve");
    const settings = await this.settings();
    if (settings.requireIndependentApproval && v.submittedBy === ctx.id && !isSuperAdmin(ctx.actor)) {
      throw new ForbiddenException("Someone other than the submitter must approve this version.");
    }
    const now = new Date();
    await this.versions.updateOne({ _id: v._id }, { $set: { status: "approved", approvedBy: ctx.id, approvedAt: now }, $push: { review: { action: "approved", actorId: ctx.id, note, at: now } } }).exec();
    if (!p.publishedVersionId) await this.policies.updateOne({ _id: p._id }, { $set: { status: "approved" } }).exec();
    await this.audit.record({ actorId: ctx.id, actorRole: this.common.actorRole(ctx.actor), action: "policy_approved", targetType: "policy_version", targetId: String(v._id), targetLabel: `${p.title} v${v.version}`, summary: note, context: ctx.context });
    if (v.submittedBy && v.submittedBy !== ctx.id) await this.common.notify([v.submittedBy], "Policy version approved", `${p.title} v${v.version}`, `/admin/policy-compliance/policies/${id}`, String(v._id), "policy_version");
    return this.get(id);
  }

  async reject(ctx: ActorCtx, id: string, note: string, changesOnly: boolean) {
    const { p, v } = await this.working(id, ["pending_review"], changesOnly ? "send back" : "reject");
    const now = new Date();
    await this.versions
      .updateOne(
        { _id: v._id },
        changesOnly
          ? { $set: { status: "draft" }, $push: { review: { action: "changes_requested", actorId: ctx.id, note, at: now } } }
          : { $set: { status: "rejected", rejectedBy: ctx.id, rejectedAt: now }, $push: { review: { action: "rejected", actorId: ctx.id, note, at: now } } },
      )
      .exec();
    if (!p.publishedVersionId) await this.policies.updateOne({ _id: p._id }, { $set: { status: changesOnly ? "draft" : "rejected" } }).exec();
    await this.audit.record({ actorId: ctx.id, actorRole: this.common.actorRole(ctx.actor), action: changesOnly ? "policy_changes_requested" : "policy_rejected", targetType: "policy_version", targetId: String(v._id), targetLabel: `${p.title} v${v.version}`, summary: note, context: ctx.context });
    if (v.submittedBy && v.submittedBy !== ctx.id) await this.common.notify([v.submittedBy], changesOnly ? "Changes requested on a policy" : "Policy version rejected", `${p.title} v${v.version}: ${note}`.slice(0, 280), `/admin/policy-compliance/policies/${id}`, String(v._id), "policy_version");
    return this.get(id);
  }

  async schedule(ctx: ActorCtx, id: string, publishAt: string) {
    const { p, v } = await this.working(id, ["approved", "scheduled"], "schedule");
    const when = new Date(publishAt);
    if (Number.isNaN(when.getTime()) || when.getTime() < Date.now() + 60_000) throw new BadRequestException("Choose a publication time in the future.");
    await this.versions.updateOne({ _id: v._id }, { $set: { status: "scheduled", scheduledFor: when }, $push: { review: { action: "scheduled", actorId: ctx.id, note: when.toISOString(), at: new Date() } } }).exec();
    if (!p.publishedVersionId) await this.policies.updateOne({ _id: p._id }, { $set: { status: "scheduled" } }).exec();
    await this.audit.record({ actorId: ctx.id, actorRole: this.common.actorRole(ctx.actor), action: "policy_scheduled", targetType: "policy_version", targetId: String(v._id), targetLabel: `${p.title} v${v.version}`, summary: `Publishes ${when.toISOString()}`, context: ctx.context });
    return this.get(id);
  }

  async publish(ctx: ActorCtx, id: string) {
    const { p, v } = await this.working(id, ["approved", "scheduled"], "publish");
    await this.publishVersion(ctx.id, this.common.actorRole(ctx.actor), p, v, ctx.context);
    return this.get(id);
  }

  private async publishVersion(actorId: string, actorRole: string, p: any, v: any, context?: Record<string, unknown>) {
    const now = new Date();
    if (p.publishedVersionId) {
      await this.versions.updateOne({ _id: p.publishedVersionId, status: "published" }, { $set: { status: "superseded", supersededAt: now } }).exec();
    }
    await this.versions.updateOne({ _id: v._id }, { $set: { status: "published", publishedBy: actorId, publishedAt: now, scheduledFor: null }, $push: { review: { action: "published", actorId, note: "", at: now } } }).exec();
    await this.policies
      .updateOne(
        { _id: p._id },
        {
          $set: {
            status: "published",
            publishedVersionId: v._id,
            publishedVersion: v.version,
            publishedAt: now,
            effectiveDate: v.effectiveDate ?? now,
            title: v.title,
            description: v.description,
            requiredAcceptance: Boolean(v.requiredAcceptance),
            workingVersionId: null,
            updatedBy: actorId,
            archivedAt: null,
          },
        },
      )
      .exec();
    await this.audit.record({ actorId, actorRole, action: "policy_published", targetType: "policy_version", targetId: String(v._id), targetLabel: `${v.title} v${v.version}`, summary: v.changeSummary ?? "", context });
    const settings = await this.settings();
    if (v.requiredAcceptance && settings.notifyUsersOnRequiredUpdate) {
      void this.notifyAllUsers(`${v.title} was updated`, `Version ${v.version}: ${String(v.changeSummary || "Please review and accept the updated policy.").slice(0, 200)}`, "/settings/policy/history", String(v._id));
    }
  }

  /** Background: in-app notice to active users about a required update. */
  private async notifyAllUsers(title: string, message: string, link: string, entityId: string) {
    if (!this.common.users) return;
    try {
      const cursor = this.common.users.find({ $or: [{ isActive: true }, { isActive: { $exists: false } }] }).select("_id").lean().cursor();
      let batch: string[] = [];
      for await (const u of cursor as AsyncIterable<any>) {
        batch.push(String(u._id));
        if (batch.length === 500) {
          await this.common.notify(batch, title, message, link, entityId, "policy_version");
          batch = [];
        }
      }
      if (batch.length) await this.common.notify(batch, title, message, link, entityId, "policy_version");
    } catch (error) {
      this.logger.warn(`Policy update notifications failed: ${String(error)}`);
    }
  }

  /** Publishes scheduled versions whose time has come. */
  async publishDue() {
    const due = await this.versions.find({ status: "scheduled", scheduledFor: { $lte: new Date() } }).lean().exec();
    for (const v of due) {
      const p = await this.policies.findById(v.policyId).lean().exec();
      if (!p || String(p.workingVersionId) !== String(v._id)) continue;
      await this.publishVersion("system", "system", p, v);
    }
    return due.length;
  }

  async archive(ctx: ActorCtx, id: string, note: string) {
    const p = await this.loadPolicy(id);
    if (p.status === "archived") throw new ConflictException("This policy is already archived.");
    await this.policies.updateOne({ _id: p._id }, { $set: { status: "archived", archivedAt: new Date(), updatedBy: ctx.id } }).exec();
    await this.audit.record({ actorId: ctx.id, actorRole: this.common.actorRole(ctx.actor), action: "policy_archived", targetType: "policy", targetId: id, targetLabel: p.title, summary: note, context: ctx.context });
    return this.get(id);
  }

  async unarchive(ctx: ActorCtx, id: string) {
    const p = await this.loadPolicy(id);
    if (p.status !== "archived") throw new ConflictException("This policy isn't archived.");
    await this.policies.updateOne({ _id: p._id }, { $set: { status: p.publishedVersionId ? "published" : "draft", archivedAt: null, updatedBy: ctx.id } }).exec();
    await this.audit.record({ actorId: ctx.id, actorRole: this.common.actorRole(ctx.actor), action: "policy_restored", targetType: "policy", targetId: id, targetLabel: p.title, context: ctx.context });
    return this.get(id);
  }

  /** Starts a new draft from an older version's text. History is kept as it was. */
  async restoreVersion(ctx: ActorCtx, versionId: string, dto: RestoreVersionDto) {
    const old = await this.versions.findById(oid(versionId, "version")).lean().exec();
    if (!old) throw new NotFoundException("That version was not found.");
    const p = await this.policies.findById(old.policyId).lean().exec();
    if (!p) throw new NotFoundException("That policy was not found.");
    if (p.workingVersionId) throw new ConflictException("Finish or withdraw the version in progress first.");
    if (p.publishedVersion && compareVersions(dto.newVersion, p.publishedVersion) <= 0) throw new BadRequestException(`The new version must be higher than ${p.publishedVersion}.`);
    await this.assertVersionFree(p._id, dto.newVersion);
    const created = await this.versions.create({
      policyId: p._id,
      version: dto.newVersion,
      title: old.title,
      description: old.description,
      sections: old.sections,
      changeSummary: dto.changeSummary,
      status: "draft",
      requiredAcceptance: old.requiredAcceptance,
      effectiveDate: null,
      createdBy: ctx.id,
      restoredFrom: old.version,
      review: [{ action: "created", actorId: ctx.id, note: `Restored from v${old.version}`, at: new Date() }],
    });
    await this.policies.updateOne({ _id: p._id }, { $set: { workingVersionId: created._id, updatedBy: ctx.id, ...(p.publishedVersionId ? {} : { status: "draft" }) } }).exec();
    await this.audit.record({ actorId: ctx.id, actorRole: this.common.actorRole(ctx.actor), action: "version_created", targetType: "policy_version", targetId: String(created._id), targetLabel: `${p.title} v${dto.newVersion}`, summary: `Restored from v${old.version}: ${dto.changeSummary}`, context: ctx.context });
    return this.get(String(p._id));
  }

  /* ======================================================================
     PUBLIC (published only — no drafts, notes or review history)
  ====================================================================== */

  async publicList() {
    const rows = await this.policies.find({ status: "published", publishedVersionId: { $ne: null } }).sort({ order: 1, title: 1 }).lean().exec();
    return rows.map((p) => ({
      id: String(p._id),
      slug: p.slug,
      title: p.title,
      category: p.category,
      description: p.description ?? "",
      version: p.publishedVersion,
      versionId: String(p.publishedVersionId),
      effectiveDate: p.effectiveDate ?? null,
      updatedAt: p.publishedAt ?? null,
      requiredAcceptance: Boolean(p.requiredAcceptance),
    }));
  }

  async publicGet(slug: string) {
    const key = String(slug ?? "").toLowerCase().slice(0, 80);
    const p = await this.policies.findOne({ status: "published", $or: [{ slug: key }, { legacySlugs: key }] }).lean().exec();
    if (!p || !p.publishedVersionId) throw new NotFoundException("That policy was not found.");
    const v = await this.versions.findById(p.publishedVersionId).lean().exec();
    if (!v) throw new NotFoundException("That policy was not found.");
    return {
      id: String(p._id),
      slug: p.slug,
      title: p.title,
      category: p.category,
      description: p.description ?? "",
      version: v.version,
      versionId: String(v._id),
      effectiveDate: p.effectiveDate ?? null,
      updatedAt: p.publishedAt ?? null,
      requiredAcceptance: Boolean(p.requiredAcceptance),
      changeSummary: v.changeSummary ?? "",
      sections: (v.sections ?? []).map((s) => ({ heading: s.heading, body: s.body })),
    };
  }

  /** Published versions of one policy (public history: dates and summaries only). */
  async publicVersions(slug: string) {
    const p = await this.policies.findOne({ status: "published", $or: [{ slug }, { legacySlugs: slug }] }).select("_id").lean().exec();
    if (!p) return [];
    const rows = await this.versions.find({ policyId: p._id, status: { $in: ["published", "superseded"] } }).select("version changeSummary publishedAt effectiveDate status").sort({ publishedAt: -1 }).lean().exec();
    return rows.map((r) => ({ version: r.version, changeSummary: r.changeSummary ?? "", publishedAt: r.publishedAt, effectiveDate: r.effectiveDate, current: r.status === "published" }));
  }

  /** Published policy rows for other services (acceptance, overview). */
  async publishedRows() {
    return this.policies.find({ status: "published", publishedVersionId: { $ne: null } }).sort({ order: 1, title: 1 }).lean().exec();
  }
}
