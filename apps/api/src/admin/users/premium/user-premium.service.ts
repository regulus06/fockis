import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../../users/user.schema';
import { AuditService } from '../../audit/audit.service';
import { normalizeUser, setIfPresent } from '../user-admin-utils';

@Injectable()
export class UserPremiumService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>, private readonly audit: AuditService) {}
  async update(id: string, body: any, actor: any, req: any) {
    const premium = Boolean(body?.premium); const update: any = {};
    if (this.userModel.schema.path('premium')) update.premium = premium;
    if (this.userModel.schema.path('isPremium')) update.isPremium = premium;
    setIfPresent(this.userModel, update, 'subscriptionType', body?.subscriptionType);
    setIfPresent(this.userModel, update, 'subscriptionExpiresAt', body?.subscriptionExpiresAt ? new Date(body.subscriptionExpiresAt) : (body?.subscriptionExpiresAt === null ? null : undefined));
    const user = await this.userModel.findByIdAndUpdate(id, { $set: update }, { new: true }).select('-password -passwordHash').lean().exec();
    if (!user) throw new NotFoundException('User not found');
    await this.audit.log({ userId: String(actor?._id ?? actor?.id), action: premium ? 'USER_PREMIUM_ENABLED' : 'USER_PREMIUM_DISABLED', module: 'users', targetId: id, metadata: { subscriptionType: body?.subscriptionType ?? null, reason: body?.reason ?? null }, ip: req?.ip, userAgent: req?.headers?.['user-agent'] });
    return normalizeUser(user);
  }
}
