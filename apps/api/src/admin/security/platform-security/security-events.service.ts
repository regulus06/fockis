import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { AuditLog } from "../../audit/audit-log.schema";
import { redactAuditValue } from "../../audit/audit.service";

// ============================================================================
// SECURITY EVENTS
//
// Security events are written to the existing Admin Center audit collection
// (AuditLog, module = "security") instead of a parallel collection.
//
// Never pass passwords, tokens, recovery codes or MFA secrets here; metadata
// is additionally redacted by key name before it is stored.
// ============================================================================

export type SecurityOutcome = "success" | "failure" | "denied";

export type SecuritySeverity = "info" | "low" | "medium" | "high" | "critical";

export interface SecurityEventInput {
  action: string;
  outcome: SecurityOutcome;
  severity?: SecuritySeverity;
  actorId?: string | null;
  actorName?: string | null;
  targetId?: string | null;
  targetType?: string | null;
  organizationId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
  /** Set for high-volume authentication events. */
  retentionDays?: number;
}

export interface SecurityEventQuery {
  module?: string;
  action?: string;
  outcome?: string;
  severity?: string;
  search?: string;
  targetId?: string;
  organizationId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export const SECURITY_MODULE = "security";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toDate(value?: string): Date | null {
  if (!value) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

@Injectable()
export class SecurityEventsService {
  private readonly logger = new Logger(SecurityEventsService.name);

  constructor(
    @InjectModel(AuditLog.name)
    private readonly auditModel: Model<AuditLog>,
  ) {}

  /**
   * Record a security event. Never throws: auditing must not break sign-in.
   * Returns true only when the record was stored.
   */
  async record(event: SecurityEventInput): Promise<boolean> {
    try {
      const expiresAt =
        event.retentionDays && event.retentionDays > 0
          ? new Date(Date.now() + event.retentionDays * 86_400_000)
          : undefined;

      await this.auditModel.create({
        module: SECURITY_MODULE,
        action: String(event.action).slice(0, 120),
        outcome: event.outcome,
        severity: event.severity ?? "info",
        ...(event.actorId ? { userId: String(event.actorId) } : {}),
        ...(event.actorName ? { actorName: String(event.actorName).slice(0, 120) } : {}),
        ...(event.targetId ? { targetId: String(event.targetId) } : {}),
        ...(event.targetType ? { targetType: String(event.targetType) } : {}),
        ...(event.organizationId ? { organizationId: String(event.organizationId) } : {}),
        ...(event.ip ? { ip: String(event.ip).slice(0, 64) } : {}),
        ...(event.userAgent ? { userAgent: String(event.userAgent).slice(0, 512) } : {}),
        metadata: redactAuditValue(event.metadata ?? {}) as Record<string, unknown>,
        ...(expiresAt ? { expiresAt } : {}),
      });

      return true;
    } catch (error) {
      this.logger.error(
        `Security event "${event.action}" could not be recorded: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );

      return false;
    }
  }

  // ==========================================================================
  // QUERY
  // ==========================================================================

  buildFilter(query: SecurityEventQuery, forceModule?: string): Record<string, any> {
    const filter: Record<string, any> = {};

    const module = forceModule ?? query.module;

    if (module) filter.module = String(module);

    if (query.action) {
      filter.action = {
        $regex: `^${escapeRegex(String(query.action).slice(0, 80))}`,
      };
    }

    if (query.outcome) filter.outcome = String(query.outcome);
    if (query.severity) filter.severity = String(query.severity);
    if (query.targetId) filter.targetId = String(query.targetId);
    if (query.organizationId) filter.organizationId = String(query.organizationId);

    const from = toDate(query.from);
    const to = toDate(query.to);

    if (from || to) {
      filter.createdAt = {
        ...(from ? { $gte: from } : {}),
        ...(to ? { $lte: to } : {}),
      };
    }

    const search = String(query.search ?? "").trim().slice(0, 80);

    if (search) {
      const pattern = { $regex: escapeRegex(search), $options: "i" };

      filter.$or = [
        { action: pattern },
        { actorName: pattern },
        { targetId: pattern },
        { userId: pattern },
        { ip: pattern },
      ];
    }

    return filter;
  }

  async query(query: SecurityEventQuery, forceModule?: string) {
    const page = Math.max(1, Math.floor(Number(query.page) || 1));
    const pageSize = Math.min(100, Math.max(5, Math.floor(Number(query.pageSize) || 25)));

    const filter = this.buildFilter(query, forceModule);

    const [items, total] = await Promise.all([
      this.auditModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean()
        .exec(),
      this.auditModel.countDocuments(filter).exec(),
    ]);

    return {
      items: items.map((item) => this.toView(item)),
      total,
      page,
      pageSize,
    };
  }

  async exportCsv(query: SecurityEventQuery, forceModule?: string): Promise<string> {
    const filter = this.buildFilter(query, forceModule);

    const rows = await this.auditModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(5000)
      .lean()
      .exec();

    const header = [
      "time",
      "module",
      "action",
      "outcome",
      "severity",
      "actor",
      "actorName",
      "targetType",
      "target",
      "organization",
      "ip",
    ];

    const escape = (value: unknown) => {
      const text = value === null || value === undefined ? "" : String(value);

      // Neutralize spreadsheet formula injection.
      const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;

      return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
    };

    const lines = rows.map((row: any) =>
      [
        row.createdAt ? new Date(row.createdAt).toISOString() : "",
        row.module,
        row.action,
        row.outcome,
        row.severity,
        row.userId,
        row.actorName,
        row.targetType,
        row.targetId,
        row.organizationId,
        row.ip,
      ]
        .map(escape)
        .join(","),
    );

    return [header.join(","), ...lines].join("\n");
  }

  toView(item: any) {
    return {
      id: String(item._id),
      createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : null,
      module: item.module ?? "",
      action: item.action ?? "",
      outcome: item.outcome ?? (item.metadata?.status === "failed" ? "failure" : item.metadata?.status === "success" ? "success" : null),
      severity: item.severity ?? null,
      actorId: item.userId ?? null,
      actorName: item.actorName ?? null,
      targetId: item.targetId ?? null,
      targetType: item.targetType ?? null,
      organizationId: item.organizationId ?? null,
      ip: item.ip ?? null,
      userAgent: item.userAgent ?? null,
      metadata: redactAuditValue(item.metadata ?? {}),
    };
  }

  // ==========================================================================
  // STATS
  // ==========================================================================

  async countSince(action: string, since: Date, extra: Record<string, any> = {}) {
    return this.auditModel
      .countDocuments({
        module: SECURITY_MODULE,
        action,
        createdAt: { $gte: since },
        ...extra,
      })
      .exec();
  }

  async recent(limit = 10, filter: Record<string, any> = {}) {
    const items = await this.auditModel
      .find({ module: SECURITY_MODULE, ...filter })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();

    return items.map((item) => this.toView(item));
  }
}
