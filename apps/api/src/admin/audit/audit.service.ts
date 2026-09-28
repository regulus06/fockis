import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog } from './audit-log.schema';

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


      metadata: data.metadata ?? {},


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