import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import {
  Follow,
  FollowDocument,
} from "./schemas/follow.schema";

@Injectable()
export class FollowsService {
  constructor(
    @InjectModel(Follow.name)
    private readonly followModel: Model<FollowDocument>,
  ) {}

  private toObjectId(id: string): Types.ObjectId {
    if (!id || !Types.ObjectId.isValid(id)) {
      throw new BadRequestException("Invalid user ID");
    }

    return new Types.ObjectId(id);
  }

  async follow(currentUserId: string, targetUserId: string) {
    const followerId = this.toObjectId(currentUserId);
    const followingId = this.toObjectId(targetUserId);

    console.log("========================================");
    console.log("[FOCKIS FOLLOW] FOLLOW REQUEST");
    console.log("[FOCKIS FOLLOW] follower:", String(followerId));
    console.log("[FOCKIS FOLLOW] following:", String(followingId));
    console.log("========================================");

    if (followerId.equals(followingId)) {
      throw new BadRequestException(
        "You cannot follow yourself",
      );
    }

    const existing = await this.followModel.findOne({
      followerId,
      followingId,
    }).exec();

    if (existing) {
      return {
        success: true,
        message: "Already following this user",
        alreadyFollowing: true,
        followId: String(existing._id),
        isFollowing: true,
      };
    }

    /*
     * IMPORTANT:
     *
     * A follow is directional.
     *
     * A -> B and B -> A are TWO valid records.
     *
     * Never query the reverse direction here as a duplicate.
     */
    try {
      const created = await this.followModel.create({
        followerId,
        followingId,
      });

      console.log("[FOCKIS FOLLOW] CREATED", {
        followId: String(created._id),
        followerId: String(created.followerId),
        followingId: String(created.followingId),
      });

      const reverseExists = await this.followModel.exists({
        followerId: followingId,
        followingId: followerId,
      });

      return {
        success: true,
        message: "User followed successfully",
        alreadyFollowing: false,
        followId: String(created._id),
        isFollowing: true,
        isFollowedBy: Boolean(reverseExists),
      };
    } catch (error: any) {
      /*
       * The unique index is:
       * { followerId: 1, followingId: 1 }
       *
       * Therefore A -> B does NOT conflict with B -> A.
       */
      if (error?.code === 11000) {
        const existing = await this.followModel.findOne({
          followerId,
          followingId,
        }).exec();

        if (existing) {
          return {
            success: true,
            message: "Already following this user",
            alreadyFollowing: true,
            followId: String(existing._id),
            isFollowing: true,
          };
        }
      }

      console.error(
        "[FOCKIS FOLLOW] FOLLOW ERROR",
        error,
      );

      throw error;
    }
  }

  async unfollow(
    currentUserId: string,
    targetUserId: string,
  ) {
    const followerId = this.toObjectId(currentUserId);
    const followingId = this.toObjectId(targetUserId);

    const result = await this.followModel.deleteOne({
      followerId,
      followingId,
    }).exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException(
        "You are not following this user",
      );
    }

    return {
      success: true,
      message: "User unfollowed successfully",
    };
  }

  async isFollowing(
    currentUserId: string,
    targetUserId: string,
  ) {
    const followerId = this.toObjectId(currentUserId);
    const followingId = this.toObjectId(targetUserId);

    const exists = await this.followModel.exists({
      followerId,
      followingId,
    });

    return {
      isFollowing: Boolean(exists),
    };
  }

  async getStatus(
    currentUserId: string,
    targetUserId: string,
  ) {
    const currentId = this.toObjectId(currentUserId);
    const targetId = this.toObjectId(targetUserId);

    const [following, followedBy] = await Promise.all([
      this.followModel.exists({
        followerId: currentId,
        followingId: targetId,
      }),

      this.followModel.exists({
        followerId: targetId,
        followingId: currentId,
      }),
    ]);

    return {
      isFollowing: Boolean(following),
      isFollowedBy: Boolean(followedBy),
    };
  }

  async getFollowers(
    userId: string,
    page = 1,
    limit = 30,
  ) {
    const targetId = this.toObjectId(userId);

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(
      Math.max(1, Number(limit) || 30),
      100,
    );

    const skip = (safePage - 1) * safeLimit;

    const [items, total] = await Promise.all([
      this.followModel
        .find({ followingId: targetId })
        .populate(
          "followerId",
          "name username avatar profileImage firstName lastName",
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean()
        .exec(),

      this.followModel.countDocuments({
        followingId: targetId,
      }),
    ]);

    return {
      items,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        pages: Math.ceil(total / safeLimit),
      },
    };
  }

  async getFollowing(
    userId: string,
    page = 1,
    limit = 30,
  ) {
    const targetId = this.toObjectId(userId);

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(
      Math.max(1, Number(limit) || 30),
      100,
    );

    const skip = (safePage - 1) * safeLimit;

    const [items, total] = await Promise.all([
      this.followModel
        .find({ followerId: targetId })
        .populate(
          "followingId",
          "name username avatar profileImage firstName lastName",
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean()
        .exec(),

      this.followModel.countDocuments({
        followerId: targetId,
      }),
    ]);

    return {
      items,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        pages: Math.ceil(total / safeLimit),
      },
    };
  }

  async getCounts(userId: string) {
    const id = this.toObjectId(userId);

    const [followers, following] = await Promise.all([
      this.followModel.countDocuments({
        followingId: id,
      }),

      this.followModel.countDocuments({
        followerId: id,
      }),
    ]);

    return {
      followers,
      following,
    };
  }
}
