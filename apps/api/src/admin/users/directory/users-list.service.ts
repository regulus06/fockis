import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../../users/user.schema';
import { bool, escapeRegex, limitValue, normalizeUser, pageValue } from '../user-admin-utils';

@Injectable()
export class UserDirectoryService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  async list(q: any) {
    const page = pageValue(q.page); const limit = limitValue(q.limit); const skip = (page - 1) * limit;
    const filter: any = {};
    const and: any[] = [];
    const search = String(q.search ?? '').trim();
    if (search) {
      const r = new RegExp(escapeRegex(search), 'i');
      and.push({ $or: [{ email: r }, { username: r }, { firstName: r }, { lastName: r }, { name: r }, { fockisId: r }] });
    }
    if (q.status && q.status !== 'all') filter.status = q.status;
    if (q.role && q.role !== 'all') filter.role = q.role;
    if (q.accountType && q.accountType !== 'all') filter.accountType = q.accountType;
    for (const [key, field] of [['verified','verified'],['premium','premium'],['fockisIdAccessPaid','fockisIdAccessPaid'],['sellerApproved','sellerApproved'],['online','online'],['locked','locked']]) {
      const v = bool(q[key]); if (v !== undefined) {
        if (field === 'locked') and.push({ $or: [{ status: 'locked' }, { lockedUntil: { $gt: new Date() } }] });
        else and.push({ [field]: v });
      }
    }
    if (q.countryCode) filter.countryCode = String(q.countryCode).toUpperCase();
    if (q.createdFrom || q.createdTo) filter.createdAt = { ...(q.createdFrom ? { $gte: new Date(q.createdFrom) } : {}), ...(q.createdTo ? { $lte: new Date(q.createdTo) } : {}) };
    if (q.lastActiveFrom || q.lastActiveTo) {
      const range = { ...(q.lastActiveFrom ? { $gte: new Date(q.lastActiveFrom) } : {}), ...(q.lastActiveTo ? { $lte: new Date(q.lastActiveTo) } : {}) };
      and.push({ $or: [{ lastActiveAt: range }, { lastSeen: range }] });
    }
    if (and.length) filter.$and = and;
    const allowed = new Set(['createdAt','updatedAt','lastActiveAt','lastLoginAt','username','email','followersCount','postsCount']);
    const sortBy = allowed.has(q.sortBy) ? q.sortBy : 'createdAt';
    const sortDirection = q.sortDirection === 'asc' ? 1 : -1;
    const [users, total] = await Promise.all([
      this.userModel.find(filter).select('-password -passwordHash').sort({ [sortBy]: sortDirection }).skip(skip).limit(limit).lean().exec(),
      this.userModel.countDocuments(filter),
    ]);
    const items = users.map(normalizeUser);
    return { items, users: items, total, page, limit, skip, pages: Math.ceil(total / limit) };
  }

  async getById(id: string) {
    const user = await this.userModel.findById(id).select('-password -passwordHash').lean().exec();
    if (!user) throw new NotFoundException('User not found');
    return normalizeUser(user);
  }
}
