import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import { AcceptanceQueryDto } from "../dto/policy.dto";
import { LEGACY_REGISTRATION_VERSION, PAGE_SIZE } from "../policy.constants";
import { PolicyAcceptance, PolicyAcceptanceDocument, PolicyVersion, PolicyVersionDocument } from "../schemas/policy.schemas";
import { PoliciesService } from "./policies.service";
import { PolicyAuditService } from "./policy-audit.service";
import { PolicyCommonService, escapeRegex, oid } from "./policy-common.service";
import { UserActivityService } from "./user-activity.service";

/** Policy acceptance records: written by users, read by users (own) and compliance staff. */
@Injectable()
export class PolicyAcceptanceService {
  constructor(
    @InjectModel(PolicyAcceptance.name) private readonly acceptances: Model<PolicyAcceptanceDocument>,
    @InjectModel(PolicyVersion.name) private readonly versions: Model<PolicyVersionDocument>,
    private readonly policies: PoliciesService,
    private readonly common: PolicyCommonService,
    private readonly audit: PolicyAuditService,
    private readonly activity: UserActivityService,
  ) {}

  /**
   * Sign-up stores accepted policy slugs on the user (Register.tsx). The first
   * time a user opens the Policy Center those become proper records: for each
   * policy, the version that was published when they signed up. Policies that
   * didn't exist yet, or changed later, are left for the user to accept.
   */
  async backfill(userId: string) {
    if (!Types.ObjectId.isValid(userId) || !this.common.users) return;
    if (await this.acceptances.exists({ userId, source: "registration" })) return;
    const user: any = await this.common.users.findById(userId).select("acceptedPolicies policyAcceptanceVersion policyAcceptedAt createdAt").lean().exec();
    const accepted: string[] = Array.isArray(user?.acceptedPolicies) ? user.acceptedPolicies : [];
    if (!accepted.length) return;
    const at = new Date(user.policyAcceptedAt ?? user.createdAt ?? Date.now());
    const rows = await this.policies.publishedRows();
    for (const p of rows) {
      const slugs = [p.slug, ...(p.legacySlugs ?? [])];
      if (!slugs.some((s) => accepted.includes(s))) continue;
      // Version live at sign-up time. Seeded v1.0 texts count from the registration consent version date.
      const candidates = await this.versions.find({ policyId: p._id, status: { $in: ["published", "superseded"] } }).select("_id version publishedAt").lean().exec();
      const live = candidates
        .filter((v: any) => {
          const published = v.publishedAt ? new Date(v.publishedAt).getTime() : 0;
          const legacy = v.version === "1.0" && user.policyAcceptanceVersion === LEGACY_REGISTRATION_VERSION;
          return legacy || published <= at.getTime();
        })
        .sort((a: any, b: any) => new Date(b.publishedAt ?? 0).getTime() - new Date(a.publishedAt ?? 0).getTime())[0] as any;
      if (!live) continue;
      await this.acceptances
        .findOneAndUpdate(
          { userId, versionId: live._id },
          { $setOnInsert: { userId, policyId: p._id, versionId: live._id, slug: p.slug, version: live.version, acceptedAt: at, source: "registration", consentType: "required_policy", jurisdiction: "" } },
          { upsert: true },
        )
        .exec();
    }
  }

  /** Published policies with this user's acceptance state. */
  async forUser(userId: string) {
    await this.backfill(userId);
    const [rows, mine] = await Promise.all([this.policies.publishedRows(), this.acceptances.find({ userId }).sort({ acceptedAt: -1 }).lean().exec()]);
    return rows.map((p) => {
      const forPolicy = mine.filter((a) => String(a.policyId) === String(p._id));
      const current = forPolicy.find((a) => String(a.versionId) === String(p.publishedVersionId));
      const latest = forPolicy[0];
      return {
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
        acceptedAt: current?.acceptedAt ?? null,
        previouslyAccepted: !current && latest ? { version: latest.version, acceptedAt: latest.acceptedAt } : null,
        status: !p.requiredAcceptance ? "not_required" : current ? "accepted" : "action_needed",
      };
    });
  }

  async accept(userId: string, slug: string, versionId: string) {
    const policy = await this.policies.publicGet(slug);
    if (policy.versionId !== String(versionId)) throw new ConflictException("This policy was updated. Please review the latest version.");
    const exists = await this.acceptances.exists({ userId, versionId: oid(versionId, "version") });
    if (!exists) {
      await this.acceptances.create({
        userId,
        policyId: new Types.ObjectId(policy.id),
        versionId: new Types.ObjectId(versionId),
        slug: policy.slug,
        version: policy.version,
        acceptedAt: new Date(),
        source: "policy_center",
        consentType: "required_policy",
        jurisdiction: "",
      });
      await this.activity.add(userId, "policy_accepted", "Policy accepted", `${policy.title} v${policy.version}`);
    }
    return (await this.forUser(userId)).find((p) => p.slug === policy.slug);
  }

  /** The user's own acceptance history, newest first. */
  async history(userId: string) {
    await this.backfill(userId);
    const mine = await this.acceptances.find({ userId }).sort({ acceptedAt: -1 }).limit(200).lean().exec();
    const versions = await this.versions.find({ _id: { $in: mine.map((m) => m.versionId) } }).select("title publishedAt effectiveDate status").lean().exec();
    const byId = new Map(versions.map((v: any) => [String(v._id), v]));
    return mine.map((a) => {
      const v: any = byId.get(String(a.versionId));
      return {
        id: String(a._id),
        slug: a.slug,
        title: v?.title ?? a.slug,
        version: a.version,
        publishedAt: v?.publishedAt ?? null,
        effectiveDate: v?.effectiveDate ?? null,
        acceptedAt: a.acceptedAt,
        source: a.source,
        current: v?.status === "published",
      };
    });
  }

  /* ---------------- compliance staff ---------------- */

  private async filter(query: AcceptanceQueryDto) {
    const filter: Record<string, unknown> = {};
    if (query.policyId) filter.policyId = oid(query.policyId, "policy");
    if (query.version) filter.version = query.version;
    if (query.from || query.to) filter.acceptedAt = { ...(query.from ? { $gte: new Date(query.from) } : {}), ...(query.to ? { $lte: new Date(query.to) } : {}) };
    if (query.user) {
      const term = query.user.replace(/^@/, "");
      if (Types.ObjectId.isValid(term)) filter.userId = term;
      else {
        const u: any = this.common.users ? await this.common.users.findOne({ username: new RegExp(`^${escapeRegex(term)}$`, "i") }).select("_id").lean().exec() : null;
        filter.userId = u ? String(u._id) : "__none__";
      }
    }
    return filter;
  }

  /** Minimal fields only: account reference, policy, version, time, source. */
  async list(query: AcceptanceQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const filter = await this.filter(query);
    const [rows, total] = await Promise.all([
      this.acceptances.find(filter).sort({ acceptedAt: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean().exec(),
      this.acceptances.countDocuments(filter).exec(),
    ]);
    const people = await this.common.people(rows.map((r) => r.userId));
    const versions = await this.versions.find({ _id: { $in: rows.map((r) => r.versionId) } }).select("title status").lean().exec();
    const vById = new Map(versions.map((v: any) => [String(v._id), v]));
    return {
      items: rows.map((r) => {
        const u = this.common.person(people, r.userId);
        const v: any = vById.get(String(r.versionId));
        return {
          id: String(r._id),
          user: u ? { id: u.id, username: u.username } : null,
          policyTitle: v?.title ?? r.slug,
          slug: r.slug,
          version: r.version,
          current: v?.status === "published",
          acceptedAt: r.acceptedAt,
          source: r.source,
          consentType: r.consentType,
          jurisdiction: r.jurisdiction ?? "",
        };
      }),
      total,
      page,
      hasMore: page * PAGE_SIZE < total,
    };
  }

  /** CSV export (max 10,000 rows). Logged as a sensitive audit event. */
  async exportCsv(actorId: string, actorRole: string, query: AcceptanceQueryDto, context: Record<string, unknown>) {
    const filter = await this.filter(query);
    const rows = await this.acceptances.find(filter).sort({ acceptedAt: -1 }).limit(10_000).lean().exec();
    if (!rows.length) throw new NotFoundException("No records match these filters.");
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = ["account_id,policy,version,accepted_at,source,consent_type,jurisdiction", ...rows.map((r) => [r.userId, r.slug, r.version, new Date(r.acceptedAt).toISOString(), r.source, r.consentType, r.jurisdiction ?? ""].map(esc).join(","))];
    await this.audit.record({ actorId, actorRole, action: "acceptance_exported", targetType: "policy_acceptance", targetLabel: `${rows.length} records`, summary: JSON.stringify({ ...query, page: undefined }), context, sensitive: true });
    return { filename: `policy-acceptances-${new Date().toISOString().slice(0, 10)}.csv`, csv: lines.join("\n") };
  }
}
