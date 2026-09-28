import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../../users/user.schema';
import { AuditService } from '../../audit/audit.service';
import { normalizeUser, setIfPresent } from '../user-admin-utils';

@Injectable()
export class UserPermissionService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>, private readonly audit: AuditService) {}
  async update(id: string, body: any, actor: any, req: any) {
    const permissions = Array.isArray(body?.permissions) ? [...new Set(body.permissions.map(String))] : [];
    const update: any = {}; setIfPresent(this.userModel, update, 'permissions', permissions);
    const user = await this.userModel.findByIdAndUpdate(id, { $set: update }, { new: true }).select('-password -passwordHash').lean().exec();
    if (!user) throw new NotFoundException('User not found');
    await this.audit.log({ userId: String(actor?._id ?? actor?.id), action: 'USER_PERMISSIONS_UPDATED', module: 'users', targetId: id, metadata: { permissions }, ip: req?.ip, userAgent: req?.headers?.['user-agent'] });
    return normalizeUser(user);
  }
}
