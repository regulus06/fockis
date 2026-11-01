import { Injectable, Logger } from "@nestjs/common";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import { createHash } from "crypto";
import { Connection, Model, Types } from "mongoose";

import { ModerationEvent, ModerationEventDocument } from "../schemas/moderation-event.schema";

export interface ModerationEventInput {
  actorId: string;
  action: string;
  targetType: "post" | "account" | "case";
  targetId: string;
  reason?: string;
  previousState?: string | null;
  newState?: string | null;
  metadata?: Record<string, unknown>;
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value ?? null);
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
}

export function eventHash(prevHash: string, e: Omit<ModerationEvent, "hash" | "prevHash">) {
  return createHash("sha256")
    .update(
      prevHash +
        canonical({
          seq: e.seq,
          actorId: e.actorId,
          action: e.action,
          targetType: e.targetType,
          targetId: e.targetId,
          reason: e.reason,
          previousState: e.previousState,
          newState: e.newState,
          metadata: e.metadata,
          at: new Date(e.at).toISOString(),
        }),
    )
    .digest("hex");
}

/** Tamper-evident moderation history (append-only, hash-chained). */
@Injectable()
export class ModerationEventsService {
  private readonly logger = new Logger(ModerationEventsService.name);
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    @InjectModel(ModerationEvent.name) private readonly events: Model<ModerationEventDocument>,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  /** Writes are serialized so every entry links to the one before it. */
  record(input: ModerationEventInput): Promise<void> {
    const run = this.queue.then(() => this.append(input)).catch((error) => {
      this.logger.warn(`Moderation history write failed (${input.action}): ${String(error)}`);
    });
    this.queue = run;
    return run as Promise<void>;
  }

  private async append(input: ModerationEventInput) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const last = await this.events.findOne({}).sort({ seq: -1 }).select("seq hash").lean().exec();
      const entry = {
        seq: (last?.seq ?? 0) + 1,
        actorId: input.actorId,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        reason: (input.reason ?? "").slice(0, 1000),
        previousState: input.previousState ?? null,
        newState: input.newState ?? null,
        metadata: input.metadata ?? {},
        at: new Date(),
      };
      const prevHash = last?.hash ?? "";
      try {
        await this.events.create({ ...entry, prevHash, hash: eventHash(prevHash, entry) });
        return;
      } catch (error: any) {
        // Another API instance took this seq; read the new tail and retry.
        if (error?.code !== 11000) throw error;
      }
    }
  }

  async list(query: { action?: string; targetType?: string; targetId?: string; actorId?: string; page?: number }) {
    const page = Math.max(1, query.page ?? 1);
    const filter: Record<string, unknown> = {};
    if (query.action) filter.action = query.action;
    if (query.targetType) filter.targetType = query.targetType;
    if (query.targetId) filter.targetId = query.targetId;
    if (query.actorId) filter.actorId = query.actorId;
    const [rows, total] = await Promise.all([
      this.events.find(filter).sort({ seq: -1 }).skip((page - 1) * 25).limit(25).lean().exec(),
      this.events.countDocuments(filter).exec(),
    ]);
    const userModel = this.connection.models["User"];
    const ids = Array.from(new Set(rows.map((r) => r.actorId).filter((id) => Types.ObjectId.isValid(id))));
    const users = userModel && ids.length ? await userModel.find({ _id: { $in: ids } }).select("username firstName lastName profilePicture").lean().exec() : [];
    const byId = new Map(users.map((u: any) => [String(u._id), u]));
    return {
      items: rows.map((r) => {
        const u: any = byId.get(r.actorId);
        return {
          id: String(r._id),
          seq: r.seq,
          action: r.action,
          targetType: r.targetType,
          targetId: r.targetId,
          reason: r.reason,
          previousState: r.previousState,
          newState: r.newState,
          metadata: r.metadata ?? {},
          at: r.at,
          actor: u
            ? { id: String(u._id), username: u.username ?? "", name: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || "", avatar: u.profilePicture ?? "" }
            : { id: r.actorId, username: "", name: r.actorId === "system" ? "System" : "", avatar: "" },
        };
      }),
      total,
      page,
      hasMore: page * 25 < total,
    };
  }

  /** Recomputes the chain. Any edited, removed or re-ordered entry is reported. */
  async verify() {
    let prevHash = "";
    let expectedSeq = 1;
    let checked = 0;
    const cursor = this.events.find({}).sort({ seq: 1 }).lean().cursor();
    for await (const e of cursor as AsyncIterable<any>) {
      if (e.seq !== expectedSeq || e.prevHash !== prevHash || eventHash(prevHash, e) !== e.hash) {
        return { intact: false, checked, brokenAt: e.seq, expectedSeq };
      }
      prevHash = e.hash;
      expectedSeq += 1;
      checked += 1;
    }
    return { intact: true, checked, brokenAt: null, expectedSeq };
  }
}
