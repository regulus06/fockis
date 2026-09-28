import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../../users/user.schema';
import { AuditService } from '../../audit/audit.service';
import { normalizeUser, setIfPresent } from '../user-admin-utils';

@Injectable()
export class UserRoleService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>, private readonly audit: AuditService) {}
  async update(id: string, body: any, actor: any, req: any) {
    const role = String(body?.role ?? '');
    if (!['user','moderator','admin','super_admin'].includes(role)) throw new ForbiddenException('Invalid user role');
    if (role === 'super_admin' && !actor?.isSuperAdmin && actor?.role !== 'super_admin') throw new ForbiddenException('Super admin required');
    const update: any = {}; setIfPresent(this.userModel, update, 'role', role);
    const user = await this.userModel.findByIdAndUpdate(id, { $set: update }, { new: true }).select('-password -passwordHash').lean().exec();
    if (!user) throw new NotFoundException('User not found');
    await this.audit.log({ userId: String(actor?._id ?? actor?.id), action: 'USER_ROLE_UPDATED', module: 'users', targetId: id, metadata: { role, reason: body?.reason ?? null }, ip: req?.ip, userAgent: req?.headers?.['user-agent'] });
    return normalizeUser(user);
  }
}
