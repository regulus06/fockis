import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../../users/user.schema';
import { AuditLog, AuditLogDocument } from '../../audit/audit-log.schema';
import { limitValue, pageValue, userIdString } from '../user-admin-utils';

@Injectable()
export class UserActivityService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(AuditLog.name) private readonly auditModel: Model<AuditLogDocument>,
  ) {}

  async list(id: string, q: any) {
    const page = pageValue(q.page, Math.floor(Number(q.skip ?? 0) / limitValue(q.limit)) + 1);
    const limit = limitValue(q.limit);
    const filter: any = { $or: [{ userId: id }, { targetId: id }] };
    if (q.type) filter.action = new RegExp(String(q.type).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const [logs, total] = await Promise.all([this.auditModel.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean().exec(), this.auditModel.countDocuments(filter)]);
    const items = logs.map((log: any) => ({ id: String(log._id), userId: id, type: this.mapType(log.action), description: log.action, ip: log.ip, userAgent: log.userAgent, metadata: log.metadata ?? {}, createdAt: log.createdAt }));
    return { items, activities: items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  private mapType(action: string): string {
    const a = String(action ?? '').toLowerCase();
    if (a.includes('login')) return 'login'; if (a.includes('logout')) return 'logout'; if (a.includes('profile')) return 'profile_update'; if (a.includes('password')) return 'password_reset'; if (a.includes('suspend')) return 'account_suspended'; if (a.includes('lock')) return 'account_locked'; if (a.includes('unlock')) return 'account_unlocked'; if (a.includes('created')) return 'account_created'; return 'admin_action';
  }
}
