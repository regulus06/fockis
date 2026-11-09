import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { canonical, sha256 } from "../../legal/services/legal-audit.service";
import { PAGE_SIZE } from "../policy.constants";
import { PolicyAuditEvent, PolicyAuditEventDocument } from "../schemas/policy.schemas";
import { PolicyCommonService } from "./policy-common.service";

export interface PolicyAuditInput {
  actorId: string;
  actorRole?: string;
  action: string;
  targetType: string;
  targetId?: string;
  targetLabel?: string;
  summary?: string;
  context?: Record<string, unknown>;
  /** Sensitive events (exports, retention access) need policy.audit.view + acceptance view. */
  sensitive?: boolean;
}

function hashOf(prev: string, e: any) {
  return sha256(
    prev +
      canonical({
        seq: e.seq,
        actorId: e.actorId,
        actorRole: e.actorRole,
        action: e.action,
        targetType: e.targetType,
        targetId: e.targetId,
        targetLabel: e.targetLabel,
        summary: e.summary,
        context: e.context,
        sensitive: e.sensitive,
        at: new Date(e.at).toISOString(),
      }),
  );
}

/** Tamper-evident audit trail for policies, rules, acceptance and retention settings. */
@Injectable()
export class PolicyAuditService {
  private readonly logger = new Logger(PolicyAuditService.name);
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    @InjectModel(PolicyAuditEvent.name) private readonly events: Model<PolicyAuditEventDocument>,
    private readonly common: PolicyCommonService,
  ) {}

  record(input: PolicyAuditInput): Promise<void> {
    const run = this.queue.then(() => this.append(input));
    this.queue = run.catch((error) => this.logger.error(`Policy audit write failed (${input.action}): ${String(error)}`));
    return run;
  }

  private async append(input: PolicyAuditInput) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const last = await this.events.findOne({}).sort({ seq: -1 }).select("seq hash").lean().exec();
      const entry = {
        seq: (last?.seq ?? 0) + 1,
        actorId: input.actorId,
        actorRole: input.actorRole ?? "",
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId ?? "",
        targetLabel: (input.targetLabel ?? "").slice(0, 200),
        summary: (input.summary ?? "").slice(0, 1000),
        context: input.context ?? {},
        sensitive: Boolean(input.sensitive),
        at: new Date(),
      };
      const prevHash = last?.hash ?? "";
      try {
        await this.events.create({ ...entry, prevHash, hash: hashOf(prevHash, entry) });
        return;
      } catch (error: any) {
        if (error?.code !== 11000) throw error;
      }
    }
    throw new Error("Could not append to the policy audit log.");
  }

  async list(query: { action?: string; targetId?: string; search?: string; includeSensitive: boolean; page?: number; limit?: number }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(50, query.limit ?? PAGE_SIZE);
    const filter: Record<string, unknown> = {};
    if (!query.includeSensitive) filter.sensitive = { $ne: true };
    if (query.action) filter.action = query.action;
    if (query.targetId) filter.targetId = query.targetId;
    if (query.search) filter.targetLabel = new RegExp(query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const [rows, total] = await Promise.all([
      this.events.find(filter).sort({ seq: -1 }).skip((page - 1) * limit).limit(limit).lean().exec(),
      this.events.countDocuments(filter).exec(),
    ]);
    const people = await this.common.people(rows.map((r) => r.actorId));
    return {
      items: rows.map((r) => ({
        id: String(r._id),
        seq: r.seq,
        action: r.action,
        actorRole: r.actorRole,
        targetType: r.targetType,
        targetId: r.targetId,
        targetLabel: r.targetLabel,
        summary: r.summary,
        sensitive: r.sensitive,
        at: r.at,
        actor: this.common.person(people, r.actorId),
      })),
      total,
      page,
      hasMore: page * limit < total,
    };
  }

  async verify() {
    let prevHash = "";
    let expected = 1;
    let checked = 0;
    const cursor = this.events.find({}).sort({ seq: 1 }).lean().cursor();
    for await (const e of cursor as AsyncIterable<any>) {
      if (e.seq !== expected || e.prevHash !== prevHash || hashOf(prevHash, e) !== e.hash) return { intact: false, checked, brokenAt: e.seq as number | null };
      prevHash = e.hash;
      expected += 1;
      checked += 1;
    }
    return { intact: true, checked, brokenAt: null as number | null };
  }
}
