import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../../users/user.schema';
import { AuditService } from '../../audit/audit.service';
import { normalizeUser, setIfPresent } from '../user-admin-utils';

@Injectable()
export class UserAccountService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>, private readonly audit: AuditService) {}

  async updateStatus(id: string, body: any, actor: any, req: any) {
    const status = String(body?.status ?? '').toLowerCase();
    if (!['active','inactive','suspended','locked','deleted'].includes(status)) throw new Error('Invalid user status');
    const update: any = {};
    setIfPresent(this.userModel, update, 'status', status);
    setIfPresent(this.userModel, update, 'isActive', status === 'active');
    if (status === 'locked') setIfPresent(this.userModel, update, 'lockedUntil', new Date(Date.now() + 60 * 60_000));
    else setIfPresent(this.userModel, update, 'lockedUntil', null);
    const user = await this.userModel.findByIdAndUpdate(id, { $set: update }, { new: true }).select('-password -passwordHash').lean().exec();
    if (!user) throw new NotFoundException('User not found');
    await this.audit.log({ userId: String(actor?._id ?? actor?.id), action: `USER_STATUS_${status.toUpperCase()}`, module: 'users', targetId: id, metadata: { reason: body?.reason ?? null }, ip: req?.ip, userAgent: req?.headers?.['user-agent'] });
    return normalizeUser(user);
  }

  async delete(id: string, actor: any, req: any, permanent = false) {
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException('User not found');
    if (permanent) { await this.userModel.deleteOne({ _id: id }).exec(); }
    else {
      const update: any = {};
      setIfPresent(this.userModel, update, 'status', 'deleted');
      setIfPresent(this.userModel, update, 'isActive', false);
      await this.userModel.updateOne({ _id: id }, { $set: update }).exec();
    }
    await this.audit.log({ userId: String(actor?._id ?? actor?.id), action: permanent ? 'USER_PERMANENTLY_DELETED' : 'USER_DELETED', module: 'users', targetId: id, ip: req?.ip, userAgent: req?.headers?.['user-agent'] });
    return { success: true, message: permanent ? 'User permanently deleted' : 'User deleted', userId: id };
  }
}
