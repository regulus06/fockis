import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../../users/user.schema';
import { AuditService } from '../../audit/audit.service';
import { normalizeUser, setIfPresent } from '../user-admin-utils';

@Injectable()
export class UserProfileService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>, private readonly audit: AuditService) {}

  async update(id: string, body: any, actor: any, req: any) {
    const allowed = ['firstName','lastName','name','displayName','username','email','phone','bio','location','website','gender','birthDate','countryCode','callingCode','profilePicture','coverPhoto','isPrivate'];
    const update: any = {};
    for (const key of allowed) setIfPresent(this.userModel, update, key, body?.[key]);
    const user = await this.userModel.findByIdAndUpdate(id, { $set: update }, { new: true }).select('-password -passwordHash').lean().exec();
    if (!user) throw new NotFoundException('User not found');
    await this.audit.log({ userId: String(actor?._id ?? actor?.id), action: 'USER_PROFILE_UPDATED', module: 'users', targetId: id, metadata: { fields: Object.keys(update) }, ip: req?.ip, userAgent: req?.headers?.['user-agent'] });
    return normalizeUser(user);
  }
}
