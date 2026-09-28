import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../../users/user.schema';
import { AuditService } from '../../audit/audit.service';
import { normalizeUser, setIfPresent } from '../user-admin-utils';

@Injectable()
export class UserVerificationService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>, private readonly audit: AuditService) {}
  async update(id: string, body: any, actor: any, req: any) {
    const verified = Boolean(body?.verified);
    const update: any = {};
    if (this.userModel.schema.path('verified')) update.verified = verified;
    if (this.userModel.schema.path('isVerified')) update.isVerified = verified;
    if (this.userModel.schema.path('verifiedAt')) update.verifiedAt = verified ? new Date() : null;
    const user = await this.userModel.findByIdAndUpdate(id, { $set: update }, { new: true }).select('-password -passwordHash').lean().exec();
    if (!user) throw new NotFoundException('User not found');
    await this.audit.log({ userId: String(actor?._id ?? actor?.id), action: verified ? 'USER_VERIFIED' : 'USER_UNVERIFIED', module: 'users', targetId: id, metadata: { reason: body?.reason ?? null }, ip: req?.ip, userAgent: req?.headers?.['user-agent'] });
    return normalizeUser(user);
  }
}
