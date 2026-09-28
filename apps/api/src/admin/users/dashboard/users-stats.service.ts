import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../../users/user.schema';
import { bool } from '../user-admin-utils';

@Injectable()
export class UserAdminDashboardService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  async getStats() {
    const now = new Date();
    const day = new Date(now); day.setHours(0, 0, 0, 0);
    const week = new Date(now); week.setDate(week.getDate() - 7);
    const month = new Date(now); month.setMonth(month.getMonth() - 1);
    const [totalUsers, activeUsers, inactiveUsers, suspendedUsers, lockedUsers, onlineUsers, verifiedUsers, premiumUsers, sellers, businesses, admins, moderators, fockisIdsAssigned, fockisIdAccessPaid, newUsersToday, newUsersThisWeek, newUsersThisMonth] = await Promise.all([
      this.userModel.countDocuments({}),
      this.userModel.countDocuments({ $or: [{ isActive: true }, { status: 'active' }] }),
      this.userModel.countDocuments({ $or: [{ isActive: false }, { status: 'inactive' }] }),
      this.userModel.countDocuments({ status: 'suspended' }),
      this.userModel.countDocuments({ $or: [{ status: 'locked' }, { lockedUntil: { $gt: now } }] }),
      this.userModel.countDocuments({ online: true }),
      this.userModel.countDocuments({ $or: [{ verified: true }, { isVerified: true }] }),
      this.userModel.countDocuments({ $or: [{ premium: true }, { isPremium: true }] }),
      this.userModel.countDocuments({ $or: [{ accountType: 'seller' }, { sellerApproved: true }] }),
      this.userModel.countDocuments({ accountType: 'business' }),
      this.userModel.countDocuments({ role: { $in: ['admin', 'super_admin', 'superadmin'] } }),
      this.userModel.countDocuments({ role: 'moderator' }),
      this.userModel.countDocuments({ fockisId: { $exists: true, $nin: [null, ''] } }),
      this.userModel.countDocuments({ fockisIdAccessPaid: true }),
      this.userModel.countDocuments({ createdAt: { $gte: day } }),
      this.userModel.countDocuments({ createdAt: { $gte: week } }),
      this.userModel.countDocuments({ createdAt: { $gte: month } }),
    ]);
    return { totalUsers, activeUsers, inactiveUsers, suspendedUsers, lockedUsers, onlineUsers, verifiedUsers, unverifiedUsers: Math.max(0, totalUsers - verifiedUsers), premiumUsers, sellers, businesses, admins, moderators, fockisIdsAssigned, fockisIdAccessPaid, newUsersToday, newUsersThisWeek, newUsersThisMonth };
  }
}
