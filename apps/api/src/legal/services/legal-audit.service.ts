import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { createHash } from "crypto";
import { Model } from "mongoose";

import { PAGE_SIZE } from "../legal.constants";
import { EvidenceAccessLog, EvidenceAccessLogDocument } from "../schemas/legal.schemas";
import { LegalCommonService } from "./legal-common.service";

export interface AccessLogInput {
  actorId: string;
  action: string;
  targetType: string;
  targetId?: string;
  targetLabel?: string;
  reason?: string;
  caseReference?: string;
  holdNumber?: string;
  metadata?: Record<string, unknown>;
}

export function canonical(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (typeof (value as any).toHexString === "function") return JSON.stringify(String(value));
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
}

export function sha256(data: string | Buffer) {
  return createHash("sha256").update(data).digest("hex");
}

export function accessHash(prevHash: string, e: any) {
  return sha256(
    prevHash +
      canonical({
        seq: e.seq,
        actorId: e.actorId,
        action: e.action,
        targetType: e.targetType,
        targetId: e.targetId,
        targetLabel: e.targetLabel,
        reason: e.reason,
        caseReference: e.caseReference,
        holdNumber: e.holdNumber,
        metadata: e.metadata,
        at: new Date(e.at).toISOString(),
      }),
  );
}

/**
 * Tamper-evident log of every evidence access and legal action. Entries are
 * append-only and hash-chained; verify() re-walks the chain.
 */
@Injectable()
export class LegalAuditService {
  private readonly logger = new Logger(LegalAuditService.name);
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    @InjectModel(EvidenceAccessLog.name) private readonly logs: Model<EvidenceAccessLogDocument>,
    private readonly common: LegalCommonService,
  ) {}

  /** Serialized so each entry links to the one before it. Throws if the write fails. */
  record(input: AccessLogInput): Promise<void> {
    const run = this.queue.then(() => this.append(input));
    this.queue = run.catch((error) => this.logger.error(`Evidence access log write failed (${input.action}): ${String(error)}`));
    return run;
  }

  private async append(input: AccessLogInput) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const last = await this.logs.findOne({}).sort({ seq: -1 }).select("seq hash").lean().exec();
      const entry = {
        seq: (last?.seq ?? 0) + 1,
        actorId: input.actorId,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId ?? "",
        targetLabel: (input.targetLabel ?? "").slice(0, 200),
        reason: (input.reason ?? "").slice(0, 1000),
        caseReference: input.caseReference ?? "",
        holdNumber: input.holdNumber ?? "",
        metadata: input.metadata ?? {},
        at: new Date(),
      };
      const prevHash = last?.hash ?? "";
      try {
        await this.logs.create({ ...entry, prevHash, hash: accessHash(prevHash, entry) });
        return;
      } catch (error: any) {
        if (error?.code !== 11000) throw error;
      }
    }
    throw new Error("Could not append to the evidence access log.");
  }

  async list(query: { action?: string; actorId?: string; caseReference?: string; targetId?: string; page?: number }) {
    const page = Math.max(1, query.page ?? 1);
    const filter: Record<string, unknown> = {};
    if (query.action) filter.action = query.action;
    if (query.actorId) filter.actorId = query.actorId;
    if (query.caseReference) filter.caseReference = query.caseReference;
    if (query.targetId) filter.targetId = query.targetId;
    const [rows, total] = await Promise.all([
      this.logs.find(filter).sort({ seq: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean().exec(),
      this.logs.countDocuments(filter).exec(),
    ]);
    const people = await this.common.people(rows.map((r) => r.actorId));
    return {
      items: rows.map((r) => ({
        id: String(r._id),
        seq: r.seq,
        action: r.action,
        targetType: r.targetType,
        targetId: r.targetId,
        targetLabel: r.targetLabel,
        reason: r.reason,
        caseReference: r.caseReference,
        holdNumber: r.holdNumber,
        metadata: r.metadata ?? {},
        at: r.at,
        actor: this.common.person(people, r.actorId),
      })),
      total,
      page,
      hasMore: page * PAGE_SIZE < total,
    };
  }

  async verify() {
    let prevHash = "";
    let expectedSeq = 1;
    let checked = 0;
    const cursor = this.logs.find({}).sort({ seq: 1 }).lean().cursor();
    for await (const e of cursor as AsyncIterable<any>) {
      if (e.seq !== expectedSeq || e.prevHash !== prevHash || accessHash(prevHash, e) !== e.hash) {
        return { intact: false, checked, brokenAt: e.seq as number | null };
      }
      prevHash = e.hash;
      expectedSeq += 1;
      checked += 1;
    }
    return { intact: true, checked, brokenAt: null as number | null };
  }

  /** Chain-of-custody entries for a set of records (oldest first). */
  async forTargets(targetIds: string[]) {
    const rows = await this.logs.find({ targetId: { $in: targetIds } }).sort({ seq: 1 }).limit(5000).lean().exec();
    return rows.map((r) => ({ seq: r.seq, action: r.action, actorId: r.actorId, targetId: r.targetId, reason: r.reason, at: r.at, hash: r.hash }));
  }

  /** Latest entries for the dashboard. */
  async recent(limit = 8) {
    return (await this.list({ page: 1 })).items.slice(0, limit);
  }
}
