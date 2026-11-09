import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { isSuperAdmin } from "../../reports/utils/actor";
import { ListRulesQueryDto, SaveRuleDto } from "../dto/policy.dto";
import { OperationalRule, OperationalRuleDocument } from "../schemas/policy.schemas";
import { ActorCtx, PoliciesService } from "./policies.service";
import { PolicyAuditService } from "./policy-audit.service";
import { PolicyCommonService, escapeRegex, oid } from "./policy-common.service";

/**
 * Operational rules: published platform rules (enforcement, reporting,
 * Fockis Shop seller requirements…). They document how Fockis operates and
 * never change authorization or business logic by themselves. Every change
 * is reviewed and audited like a policy.
 */
@Injectable()
export class OperationalRulesService {
  constructor(
    @InjectModel(OperationalRule.name) private readonly rules: Model<OperationalRuleDocument>,
    private readonly policies: PoliciesService,
    private readonly common: PolicyCommonService,
    private readonly audit: PolicyAuditService,
  ) {}

  private view(r: any, people: Map<string, any>) {
    const published = (r.revisions ?? []).slice(-1)[0] ?? null;
    return {
      id: String(r._id),
      slug: r.slug,
      title: r.title,
      description: r.description ?? "",
      category: r.category,
      module: r.module,
      content: r.content ?? "",
      changeSummary: r.changeSummary ?? "",
      status: r.status,
      version: r.version,
      effectiveDate: r.effectiveDate ?? null,
      enforcement: r.enforcement,
      enforcementNotes: r.enforcementNotes ?? "",
      publishedContent: published?.content ?? "",
      revisions: (r.revisions ?? []).map((v: any) => ({ version: v.version, changeSummary: v.changeSummary, publishedAt: v.publishedAt, publishedBy: this.common.person(people, v.publishedBy) })).reverse(),
      review: (r.review ?? []).map((e: any) => ({ action: e.action, note: e.note, at: e.at, actor: this.common.person(people, e.actorId) })).reverse(),
      submittedBy: this.common.person(people, r.submittedBy),
      createdBy: this.common.person(people, r.createdBy),
      updatedAt: r.updatedAt,
    };
  }

  private async peopleFor(rows: any[]) {
    return this.common.people(rows.flatMap((r) => [r.createdBy, r.submittedBy, ...(r.review ?? []).map((e: any) => e.actorId), ...(r.revisions ?? []).map((v: any) => v.publishedBy)]));
  }

  async list(query: ListRulesQueryDto) {
    const filter: Record<string, unknown> = {};
    if (query.module) filter.module = query.module;
    if (query.status) filter.status = query.status;
    if (query.search) filter.title = new RegExp(escapeRegex(query.search), "i");
    const rows = await this.rules.find(filter).sort({ module: 1, title: 1 }).limit(200).lean().exec();
    const people = await this.peopleFor(rows);
    return { items: rows.map((r) => this.view(r, people)) };
  }

  async get(id: string) {
    const r = await this.rules.findById(oid(id, "rule")).lean().exec();
    if (!r) throw new NotFoundException("That rule was not found.");
    return this.view(r, await this.peopleFor([r]));
  }

  async create(ctx: ActorCtx, dto: SaveRuleDto) {
    if (!dto.title || !dto.slug || !dto.category || !dto.module || !dto.content?.trim()) throw new BadRequestException("Add a title, slug, category, module and the rule text.");
    if (await this.rules.exists({ slug: dto.slug })) throw new ConflictException("Another rule already uses that slug.");
    const doc = await this.rules.create({
      slug: dto.slug,
      title: dto.title,
      description: dto.description ?? "",
      category: dto.category,
      module: dto.module,
      content: dto.content,
      changeSummary: dto.changeSummary ?? "Initial version",
      status: "draft",
      version: 0,
      effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : null,
      enforcement: dto.enforcement ?? "informational",
      enforcementNotes: dto.enforcementNotes ?? "",
      revisions: [],
      review: [{ action: "created", actorId: ctx.id, note: "", at: new Date() }],
      createdBy: ctx.id,
    });
    await this.audit.record({ actorId: ctx.id, actorRole: this.common.actorRole(ctx.actor), action: "rule_created", targetType: "operational_rule", targetId: String(doc._id), targetLabel: dto.title, context: ctx.context });
    return this.get(String(doc._id));
  }

  async update(ctx: ActorCtx, id: string, dto: SaveRuleDto) {
    const r = await this.rules.findById(oid(id, "rule")).lean().exec();
    if (!r) throw new NotFoundException("That rule was not found.");
    if (["pending_review", "approved"].includes(r.status)) throw new ConflictException("This rule is in review. Withdraw it to make changes.");
    if (dto.slug && dto.slug !== r.slug && (await this.rules.exists({ slug: dto.slug, _id: { $ne: r._id } }))) throw new ConflictException("Another rule already uses that slug.");
    const set: Record<string, unknown> = { status: "draft" };
    for (const k of ["title", "slug", "description", "category", "module", "content", "changeSummary", "enforcement", "enforcementNotes"] as const) if (dto[k] !== undefined) set[k] = dto[k];
    if (dto.effectiveDate !== undefined) set.effectiveDate = dto.effectiveDate ? new Date(dto.effectiveDate) : null;
    await this.rules.updateOne({ _id: r._id }, { $set: set, $push: { review: { action: "edited", actorId: ctx.id, note: "", at: new Date() } } }).exec();
    await this.audit.record({ actorId: ctx.id, actorRole: this.common.actorRole(ctx.actor), action: "rule_edited", targetType: "operational_rule", targetId: id, targetLabel: r.title, context: ctx.context });
    return this.get(id);
  }

  async transition(ctx: ActorCtx, id: string, action: "submit" | "approve" | "reject" | "publish" | "archive" | "withdraw", note = "") {
    const r = await this.rules.findById(oid(id, "rule")).lean().exec();
    if (!r) throw new NotFoundException("That rule was not found.");
    const from: Record<string, string[]> = {
      submit: ["draft", "rejected"],
      approve: ["pending_review"],
      reject: ["pending_review"],
      publish: ["approved"],
      archive: ["draft", "published", "rejected", "approved"],
      withdraw: ["pending_review", "approved"],
    };
    if (!from[action].includes(r.status)) throw new ConflictException(`This rule can't be ${action === "submit" ? "submitted" : action + "d"} right now.`);
    const now = new Date();
    const set: Record<string, unknown> = {};
    const push: Record<string, unknown> = { review: { action, actorId: ctx.id, note, at: now } };
    if (action === "submit") {
      if (!r.changeSummary?.trim()) throw new BadRequestException("Add a change summary before submitting.");
      Object.assign(set, { status: "pending_review", submittedBy: ctx.id });
    }
    if (action === "approve") {
      const settings = await this.policies.settings();
      if (settings.requireIndependentApproval && r.submittedBy === ctx.id && !isSuperAdmin(ctx.actor)) throw new ForbiddenException("Someone other than the submitter must approve this rule.");
      set.status = "approved";
    }
    if (action === "reject") {
      if (note.trim().length < 5) throw new BadRequestException("Explain why the rule is rejected.");
      set.status = "rejected";
    }
    if (action === "withdraw") set.status = "draft";
    if (action === "archive") set.status = "archived";
    if (action === "publish") {
      const version = (r.version ?? 0) + 1;
      Object.assign(set, { status: "published", version, effectiveDate: r.effectiveDate ?? now });
      push.revisions = { version, content: r.content, changeSummary: r.changeSummary, publishedBy: ctx.id, publishedAt: now };
    }
    await this.rules.updateOne({ _id: r._id }, { $set: set, $push: push }).exec();
    await this.audit.record({ actorId: ctx.id, actorRole: this.common.actorRole(ctx.actor), action: `rule_${action === "submit" ? "submitted" : action === "withdraw" ? "withdrawn" : action + "d"}`, targetType: "operational_rule", targetId: id, targetLabel: r.title, summary: note, context: ctx.context });
    if (action === "submit") {
      const approvers = await this.common.staffWith("policy.review", ctx.id);
      await this.common.notify(approvers, "Operational rule waiting for approval", r.title, "/admin/policy-compliance/rules", id, "operational_rule");
    }
    return this.get(id);
  }

  async counts() {
    return { published: await this.rules.countDocuments({ status: "published" }).exec(), pending: await this.rules.countDocuments({ status: "pending_review" }).exec() };
  }
}
