import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { User, UserDocument } from "../../users/user.schema";

@Injectable()
export class UserAdminService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  // ==========================================================================
  // LIST USERS
  // ==========================================================================

  async getUsers(
    page = 1,
    limit = 50,
    search?: string,
  ) {
    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.min(
      Math.max(Number(limit) || 50, 1),
      100,
    );

    const skip = (safePage - 1) * safeLimit;

    const filter: Record<string, any> = {};

    if (search?.trim()) {
      const value = search.trim();

      filter.$or = [
        {
          email: {
            $regex: value,
            $options: "i",
          },
        },
        {
          username: {
            $regex: value,
            $options: "i",
          },
        },
        {
          firstName: {
            $regex: value,
            $options: "i",
          },
        },
        {
          lastName: {
            $regex: value,
            $options: "i",
          },
        },
        {
          fockisId: {
            $regex: value,
            $options: "i",
          },
        },
      ];
    }

    const [users, total] = await Promise.all([
      this.userModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .select("-password")
        .lean()
        .exec(),

      this.userModel.countDocuments(filter),
    ]);

    return {
      users,
      data: users,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  // ==========================================================================
  // USER STATISTICS
  // ==========================================================================

  async getUserStats() {
    const [
      totalUsers,
      activeUsers,
      inactiveUsers,
      adminUsers,
      verifiedUsers,
      premiumUsers,
    ] = await Promise.all([
      this.userModel.countDocuments({}),

      this.userModel.countDocuments({
        $or: [
          { status: "active" },
          { isActive: true },
        ],
      }),

      this.userModel.countDocuments({
        $or: [
          { status: "inactive" },
          { status: "suspended" },
          { isActive: false },
        ],
      }),

      this.userModel.countDocuments({
        $or: [
          { role: "admin" },
          { role: "super_admin" },
          { role: "superadmin" },
        ],
      }),

      this.userModel.countDocuments({
        $or: [
          { isVerified: true },
          { verified: true },
        ],
      }),

      this.userModel.countDocuments({
        $or: [
          { isPremium: true },
          { premium: true },
        ],
      }),
    ]);

    return {
      totalUsers,
      activeUsers,
      inactiveUsers,
      adminUsers,
      verifiedUsers,
      premiumUsers,
    };
  }

  // ==========================================================================
  // GET ONE USER
  // ==========================================================================

  async getUserById(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select("-password")
      .lean()
      .exec();

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }

  // ==========================================================================
  // DELETE / SOFT DELETE
  // ==========================================================================

  async deleteUser(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .exec();

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const update: Record<string, any> = {};

    if (this.hasPath("status")) {
      update.status = "deleted";
    }

    if (this.hasPath("isActive")) {
      update.isActive = false;
    }

    if (Object.keys(update).length > 0) {
      await this.userModel
        .updateOne(
          { _id: userId },
          { $set: update },
        )
        .exec();
    }

    return {
      message: `User ${userId} soft-deleted`,
      userId,
    };
  }

  // ==========================================================================
  // BAN USER
  // ==========================================================================

  async banUser(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .exec();

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const update: Record<string, any> = {};

    if (this.hasPath("status")) {
      update.status = "banned";
    }

    if (this.hasPath("isActive")) {
      update.isActive = false;
    }

    if (Object.keys(update).length > 0) {
      await this.userModel
        .updateOne(
          { _id: userId },
          { $set: update },
        )
        .exec();
    }

    return {
      message: `User ${userId} banned`,
      userId,
    };
  }

  // ==========================================================================
  // SCHEMA-SAFE FIELD CHECK
  // ==========================================================================

  private hasPath(path: string): boolean {
    return Boolean(
      this.userModel.schema.path(path),
    );
  }
}