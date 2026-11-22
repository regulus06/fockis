import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import {
  FinanceAuditLog,
  FinanceAuditLogDocument,
} from "../schemas/finance-audit-log.schema";

@Injectable()
export class FinanceAuditService {
  private readonly logger = new Logger(FinanceAuditService.name);

  constructor(
    @InjectModel(FinanceAuditLog.name)
    private readonly auditModel: Model<FinanceAuditLogDocument>,
  ) {}

  async record(
    action: string,
    entity: string,
    entityId: string,
    actorUserId: string,
    details: Record<string, unknown> = {},
    storeId = "",
  ): Promise<void> {
    try {
      await this.auditModel.create({ action, entity, entityId, actorUserId, details, storeId });
    } catch (error) {
      // Never block the money operation because the log failed, but make it loud.
      this.logger.error(
        `Could not write audit log ${action} ${entity}/${entityId}: ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      );
    }
  }

  async list(filter: { entity?: string; storeId?: string; entityId?: string; limit?: number }) {
    const query: Record<string, unknown> = {};
    if (filter.entity) query.entity = filter.entity;
    if (filter.storeId) query.storeId = filter.storeId;
    if (filter.entityId) query.entityId = filter.entityId;
    const limit = Math.min(Math.max(Number(filter.limit) || 100, 1), 500);
    return this.auditModel.find(query).sort({ createdAt: -1 }).limit(limit).lean().exec();
  }
}
