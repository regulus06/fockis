import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../../users/user.schema';
import { AuditService } from '../../audit/audit.service';
import { normalizeUser, setIfPresent } from '../user-admin-utils';
import { randomBytes } from 'crypto';

@Injectable()
export class UserSecurityService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>, private readonly audit: AuditService) {}

  async lock(id: string, body: any, actor: any, req: any) {
    const minutes = Math.min(60 * 24 * 30, Math.max(1, Number(body?.minutes ?? 60)));
    const until = new Date(Date.now() + minutes * 60_000);
    const update: any = {};
    setIfPresent(this.userModel, update, 'lockedUntil', until);
    setIfPresent(this.userModel, update, 'status', 'locked');
    setIfPresent(this.userModel, update, 'isActive', false);
    let query = this.userModel.findByIdAndUpdate(id, { $set: update }, { new: true });
    // Mongoose update pipelines are unnecessary for the counter; use a second increment if supported.
    if (this.userModel.schema.path('lockoutCount')) await this.userModel.updateOne({ _id: id }, { $inc: { lockoutCount: 1 } }).exec();
    const user = await query.select('-password -passwordHash').lean().exec();
    if (!user) throw new NotFoundException('User not found');
    await this.audit.log({ userId: String(actor?._id ?? actor?.id), action: 'USER_LOCKED', module: 'users', targetId: id, metadata: { reason: body?.reason ?? null, minutes }, ip: req?.ip, userAgent: req?.headers?.['user-agent'] });
    return normalizeUser(user);
  }

  async unlock(id: string, actor: any, req: any) {
    const update: any = {};
    setIfPresent(this.userModel, update, 'lockedUntil', null);
    setIfPresent(this.userModel, update, 'status', 'active');
    setIfPresent(this.userModel, update, 'isActive', true);
    setIfPresent(this.userModel, update, 'failedLoginAttempts', 0);
    const user = await this.userModel.findByIdAndUpdate(id, { $set: update }, { new: true }).select('-password -passwordHash').lean().exec();
    if (!user) throw new NotFoundException('User not found');
    await this.audit.log({ userId: String(actor?._id ?? actor?.id), action: 'USER_UNLOCKED', module: 'users', targetId: id, ip: req?.ip, userAgent: req?.headers?.['user-agent'] });
    return normalizeUser(user);
  }

  async forcePasswordChange(id: string, actor: any, req: any) {
    const update: any = {};
    setIfPresent(this.userModel, update, 'mustChangePassword', true);
    const user = await this.userModel.findByIdAndUpdate(id, { $set: update }, { new: true }).select('-password -passwordHash').lean().exec();
    if (!user) throw new NotFoundException('User not found');
    await this.audit.log({ userId: String(actor?._id ?? actor?.id), action: 'USER_FORCE_PASSWORD_CHANGE', module: 'users', targetId: id, ip: req?.ip, userAgent: req?.headers?.['user-agent'] });
    return normalizeUser(user);
  }

  async resetPassword(id: string, actor: any, req: any) {
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException('User not found');
    // Generate a one-time temporary secret and store a bcrypt-compatible hash only when bcrypt is available.
    // The actual plaintext is never logged. Applications can replace this with their auth service's password reset flow.
    const temporaryPassword = randomBytes(12).toString('base64url');
    const update: any = {};
    const passwordField = this.userModel.schema.path('password') ? 'password' : (this.userModel.schema.path('passwordHash') ? 'passwordHash' : null);
    if (passwordField) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const bcrypt = require('bcrypt');
        update[passwordField] = await bcrypt.hash(temporaryPassword, 12);
      } catch {
        // Do not write an incompatible hash. Fall back to forcing the normal password-reset flow.
      }
    }
    setIfPresent(this.userModel, update, 'mustChangePassword', true);
    setIfPresent(this.userModel, update, 'passwordResetByAdmin', true);
    setIfPresent(this.userModel, update, 'passwordChangedAt', new Date());
    await this.userModel.updateOne({ _id: id }, { $set: update }).exec();
    await this.audit.log({ userId: String(actor?._id ?? actor?.id), action: 'USER_PASSWORD_RESET', module: 'users', targetId: id, metadata: { hashWritten: Boolean(update[passwordField as any]) }, ip: req?.ip, userAgent: req?.headers?.['user-agent'] });
    return { success: true, message: update[passwordField as any] ? 'Password reset and change required at next login.' : 'Password reset workflow flagged; connect this action to the application password-reset service.' };
  }
}
