import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog } from './audit-log.schema';

/**
 * Keys whose values must never be written to an audit record.
 * Matching is case-insensitive and applies at any depth.
 */
const SENSITIVE_KEY =
  /pass(word)?|secret|token|recovery|otp|mfa.?code|^code$|authorization|cookie|api.?key|private.?key/i;

export function redactAuditValue(value: unknown, depth = 0): unknown {
  if (depth > 6 || value === null || value === undefined) return value;

  if (Array.isArray(value)) {
    return value.slice(0, 100).map((item) => redactAuditValue(item, depth + 1));
  }

  if (typeof value === 'object') {
    if (value instanceof Date) return value;

    const out: Record<string, unknown> = {};

    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEY.test(key)
        ? '[REDACTED]'
        : redactAuditValue(entry, depth + 1);
    }

    return out;
  }

  if (typeof value === 'string' && value.length > 2000) {
    return `${value.slice(0, 2000)}…`;
  }

  return value;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectModel(AuditLog.name)
    private readonly auditModel: Model<AuditLog>,
  ) {}


  // =========================
  // CREATE AUDIT LOG
  // =========================

  async log(data: {
    userId?: string;
    action: string;
    module: string;
    targetId?: string;
    metadata?: Record<string, any>;
    ip?: string;
    userAgent?: string;
  }) {

    return this.auditModel.create({

      ...(data.userId && {
        userId: data.userId,
      }),

      action: data.action,

      module: data.module,


      ...(data.targetId && {
        targetId: data.targetId,
      }),


      // Passwords, tokens, codes and secrets are never stored.
      metadata: (redactAuditValue(data.metadata ?? {}) as Record<string, any>) ?? {},


      ...(data.ip && {
        ip: data.ip,
      }),


      ...(data.userAgent && {
        userAgent: data.userAgent,
      }),

    });
  }



  // =========================
  // GET LOGS
  // =========================

  async findAll(limit = 100) {

    return this.auditModel
      .find()
      .sort({
        createdAt: -1,
      })
      .limit(limit);

  }
}
