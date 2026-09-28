import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../../users/user.schema';
import { AuditService } from '../../audit/audit.service';
import { normalizeUser, setIfPresent } from '../user-admin-utils';

@Injectable()
export class FockisIdAccessService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>, private readonly audit: AuditService) {}
  async update(id: string, body: any, actor: any, req: any) {
    const paid = Boolean(body?.fockisIdAccessPaid); const update: any = {};
    setIfPresent(this.userModel, update, 'fockisIdAccessPaid', paid);
    if (paid) setIfPresent(this.userModel, update, 'fockisIdAccessPaidAt', new Date());
    else setIfPresent(this.userModel, update, 'fockisIdAccessPaidAt', null);
    const user = await this.userModel.findByIdAndUpdate(id, { $set: update }, { new: true }).select('-password -passwordHash').lean().exec();
    if (!user) throw new NotFoundException('User not found');
    await this.audit.log({ userId: String(actor?._id ?? actor?.id), action: paid ? 'FOCKIS_ID_ACCESS_GRANTED' : 'FOCKIS_ID_ACCESS_REVOKED', module: 'users', targetId: id, metadata: { reason: body?.reason ?? null }, ip: req?.ip, userAgent: req?.headers?.['user-agent'] });
    return normalizeUser(user);
  }
}
