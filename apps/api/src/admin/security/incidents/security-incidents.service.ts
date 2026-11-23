import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import { Connection, Model, Types } from "mongoose";

type FilterQuery<_T> = Record<string, any>;

import {
  INCIDENT_KINDS,
  INCIDENT_STATUSES,
  SecurityIncident,
  SecurityIncidentDocument,
} from "./security-incident.schema";
import { REASON_LABELS } from "./risk-evaluation";
import { AuthRestrictionService, serializeRestriction } from "./auth-restriction.service";
import { ADMIN_NOTIFICATION_RESOLVED_EVENT } from "../../notifications/admin-notification.types";

// ============================================================================
// SECURITY INCIDENTS — ADMINISTRATION
// ============================================================================

export interface IncidentActor {
  id: string;
  name: string;
}

export function serializeIncident(doc: any, extra: { username?: string | null; restriction?: any } = {}) {
  return {
    id: String(doc._id),
    number: doc.number,
    kind: doc.kind,
    status: doc.status,
    open: Boolean(doc.open),
    level: doc.level,
    riskScore: doc.riskScore ?? 0,
    reasonCodes: doc.reasonCodes ?? [],
    reasons: (doc.reasonCodes ?? []).map((code: string) => ({ code, label: REASON_LABELS[code] ?? code })),
    subjectUserId: doc.subjectUserId ? String(doc.subjectUserId) : null,
    subjectLabel: doc.subjectLabel ?? "",
    username: extra.username ?? null,
    privileged: Boolean(doc.privileged),
    sourceIp: doc.sourceIp ?? null,
    windowFailures: doc.windowFailures ?? 0,
    totalFailures: doc.totalFailures ?? 0,
    blockedAttempts: doc.blockedAttempts ?? 0,
    distinctSources: doc.distinctSources ?? 0,
    distinctTargets: doc.distinctTargets ?? 0,
    firstSeenAt: doc.firstSeenAt,
    lastActivityAt: doc.lastActivityAt,
    restrictionId: doc.restrictionId ? String(doc.restrictionId) : null,
    restriction: extra.restriction ? serializeRestriction(extra.restriction) : null,
    verifiedAt: doc.verifiedAt ?? null,
    sessionsRevokedAt: doc.sessionsRevokedAt ?? null,
    successAfterFailuresAt: doc.successAfterFailuresAt ?? null,
    acknowledgedBy: doc.acknowledgedBy ?? null,
    acknowledgedAt: doc.acknowledgedAt ?? null,
    resolvedBy: doc.resolvedBy ?? null,
    resolvedAt: doc.resolvedAt ?? null,
    resolutionNote: doc.resolutionNote ?? "",
    timeline: (doc.timeline ?? []).slice(-100),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

@Injectable()
export class SecurityIncidentsService {
  constructor(
    @InjectModel(SecurityIncident.name)
    private readonly incidents: Model<SecurityIncidentDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly restrictions: AuthRestrictionService,
    private readonly emitter: EventEmitter2,
  ) {}

  async usernames(ids: (string | null | undefined)[]): Promise<Map<string, string>> {
    const valid = Array.from(new Set(ids.filter((id): id is string => Boolean(id) && Types.ObjectId.isValid(String(id)))));

    if (!valid.length) return new Map();

    const rows = await this.connection
      .collection("users")
      .find({ _id: { $in: valid.map((id) => new Types.ObjectId(id)) } }, { projection: { username: 1 } })
      .toArray();

    return new Map(rows.map((row) => [String(row._id), String(row.username ?? "")]));
  }

  async list(query: {
    status?: string;
    level?: string;
    kind?: string;
    open?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }) {
    const filter: FilterQuery<SecurityIncidentDocument> = {};

    if (query.status) {
      if (!(INCIDENT_STATUSES as readonly string[]).includes(query.status)) {
        throw new BadRequestException("Unknown status.");
      }
      filter.status = query.status;
    }

    if (query.level) {
      if (!["warning", "high", "critical"].includes(query.level)) throw new BadRequestException("Unknown level.");
      filter.level = query.level;
    }

    if (query.kind) {
      if (!(INCIDENT_KINDS as readonly string[]).includes(query.kind)) throw new BadRequestException("Unknown type.");
      filter.kind = query.kind;
    }

    if (query.open === "true") filter.open = true;
    if (query.open === "false") filter.open = false;

    const search = String(query.search ?? "").trim().slice(0, 60);

    if (search) {
      const pattern = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ number: pattern }, { subjectLabel: pattern }];
    }

    const pageSize = Math.min(Math.max(1, Number(query.pageSize) || 20), 100);
    const page = Math.max(1, Number(query.page) || 1);

    const [rows, total, counts] = await Promise.all([
      this.incidents
        .find(filter)
        .sort({ open: -1, levelRank: -1, lastActivityAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .select("-timeline")
        .lean()
        .exec(),
      this.incidents.countDocuments(filter).exec(),
      this.incidents
        .aggregate([{ $match: { open: true } }, { $group: { _id: "$level", count: { $sum: 1 } } }])
        .exec(),
    ]);

    const names = await this.usernames(rows.map((r) => (r.subjectUserId ? String(r.subjectUserId) : null)));

    return {
      items: rows.map((row) =>
        serializeIncident(row, { username: row.subjectUserId ? names.get(String(row.subjectUserId)) : null }),
      ),
      total,
      page,
      pageSize,
      pages: Math.max(1, Math.ceil(total / pageSize)),
      openByLevel: Object.fromEntries(counts.map((c: any) => [c._id, c.count])),
    };
  }

  async getDoc(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException("Incident not found.");

    const doc = await this.incidents.findById(id).lean().exec();

    if (!doc) throw new NotFoundException("Incident not found.");

    return doc;
  }

  async get(id: string) {
    const doc = await this.getDoc(id);
    const names = await this.usernames([doc.subjectUserId ? String(doc.subjectUserId) : null]);
    const restriction = doc.restrictionId
      ? await this.restrictions.findById(String(doc.restrictionId))
      : null;

    return serializeIncident(doc, {
      username: doc.subjectUserId ? names.get(String(doc.subjectUserId)) : null,
      restriction: restriction ? restriction.toObject() : null,
    });
  }

  async acknowledge(id: string, actor: IncidentActor, note: string) {
    const doc = await this.getDoc(id);

    if (!doc.open) throw new ConflictException("This incident is already closed.");

    const now = new Date();
    const keepStatus = ["verification_pending", "restricted", "under_review", "verified"].includes(doc.status);

    await this.incidents.updateOne(
      { _id: doc._id, open: true },
      {
        $set: {
          acknowledgedBy: actor.id,
          acknowledgedAt: now,
          ...(keepStatus ? {} : { status: "monitoring" }),
        },
        $push: {
          timeline: { at: now, action: "acknowledged", actorId: actor.id, actorName: actor.name.slice(0, 120), note: note.slice(0, 500) },
        },
      },
    );

    return this.get(id);
  }

  async resolve(id: string, actor: IncidentActor, note: string, liftRestriction: boolean) {
    if (!note.trim()) throw new BadRequestException("Add a resolution note.");

    const doc = await this.getDoc(id);

    if (!doc.open) throw new ConflictException("This incident is already closed.");

    const now = new Date();
    let lifted = false;

    if (liftRestriction && doc.restrictionId) {
      lifted = Boolean(await this.restrictions.lift(String(doc.restrictionId), actor.id, note));
    }

    const result = await this.incidents.updateOne(
      { _id: doc._id, open: true },
      {
        $set: {
          open: false,
          status: "resolved",
          resolvedBy: actor.id,
          resolvedAt: now,
          resolutionNote: note.slice(0, 1000),
        },
        $push: {
          timeline: {
            at: now,
            action: "resolved",
            actorId: actor.id,
            actorName: actor.name.slice(0, 120),
            note: `${note.slice(0, 450)}${lifted ? " (verification requirement lifted)" : ""}`,
          },
        },
      },
    );

    if (!result.modifiedCount) throw new ConflictException("The incident was changed by someone else. Reload and try again.");

    this.emitter.emit(ADMIN_NOTIFICATION_RESOLVED_EVENT, {
      entityType: "security_incident",
      entityId: String(doc._id),
      resolvedBy: actor.id,
    });

    return { incident: await this.get(id), restrictionLifted: lifted };
  }

  async appendTimeline(id: string | null, entry: { action: string; actorId: string | null; actorName: string; note: string }) {
    if (!id || !Types.ObjectId.isValid(id)) return;

    await this.incidents.updateOne(
      { _id: new Types.ObjectId(id) },
      { $push: { timeline: { at: new Date(), ...entry, note: entry.note.slice(0, 500) } } },
    );
  }
}
