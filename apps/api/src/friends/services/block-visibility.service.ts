
import {
  Injectable,
} from "@nestjs/common";

import {
  InjectModel,
} from "@nestjs/mongoose";

import {
  Model,
  Types,
} from "mongoose";

import {
  Friendship,
  FriendshipDocument,
} from "../schemas/friendship.schema";

import {
  User,
  UserDocument,
} from "../../users/user.schema";

@Injectable()
export class BlockVisibilityService {
  constructor(
    @InjectModel(Friendship.name)
    private readonly friendshipModel: Model<FriendshipDocument>,

    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  private normalizeId(value: unknown): string {
    if (value === null || value === undefined) {
      return "";
    }

    if (typeof value === "object") {
      const objectValue = value as any;

      if (objectValue._id) {
        return String(objectValue._id);
      }

      if (objectValue.id) {
        return String(objectValue.id);
      }
    }

    return String(value);
  }

  private isValidId(value: string): boolean {
    return Types.ObjectId.isValid(value);
  }

  /**
   * Returns true if either user has blocked the other.
   */
  async isBlocked(
    firstUserId: string,
    secondUserId: string,
  ): Promise<boolean> {
    const first = this.normalizeId(firstUserId);
    const second = this.normalizeId(secondUserId);

    if (
      !first ||
      !second ||
      first === second ||
      !this.isValidId(first) ||
      !this.isValidId(second)
    ) {
      return false;
    }

    const relationship = await this.friendshipModel
      .findOne({
        status: "blocked",
        $or: [
          {
            requester: new Types.ObjectId(first),
            receiver: new Types.ObjectId(second),
          },
          {
            requester: new Types.ObjectId(second),
            receiver: new Types.ObjectId(first),
          },
        ],
      })
      .select("_id requester receiver blockedBy status")
      .lean()
      .exec();

    return Boolean(relationship);
  }

  /**
   * Returns the blocking relationship, if one exists.
   */
  async getBlock(
    firstUserId: string,
    secondUserId: string,
  ) {
    const first = this.normalizeId(firstUserId);
    const second = this.normalizeId(secondUserId);

    if (
      !first ||
      !second ||
      first === second ||
      !this.isValidId(first) ||
      !this.isValidId(second)
    ) {
      return null;
    }

    return this.friendshipModel
      .findOne({
        status: "blocked",
        $or: [
          {
            requester: new Types.ObjectId(first),
            receiver: new Types.ObjectId(second),
          },
          {
            requester: new Types.ObjectId(second),
            receiver: new Types.ObjectId(first),
          },
        ],
      })
      .select("_id requester receiver blockedBy status")
      .lean()
      .exec();
  }

  /**
   * Only the user who created the block may remove it.
   */
  async canUnblock(
    currentUserId: string,
    otherUserId: string,
  ): Promise<boolean> {
    const current = this.normalizeId(currentUserId);
    const other = this.normalizeId(otherUserId);

    if (!current || !other || current === other) {
      return false;
    }

    const block = await this.getBlock(current, other);

    if (!block) {
      return false;
    }

    return (
      this.normalizeId((block as any).blockedBy) === current
    );
  }

  /**
   * Checks whether the authenticated viewer can view a profile.
   *
   * Rules:
   * - The owner can view their own profile.
   * - Invalid or missing viewer IDs are denied.
   * - Either user blocking the other denies access.
   * - Public profiles are viewable by authenticated, non-blocked users.
   * - Private profiles require an accepted friendship.
   */
  async canView(
    currentUserId: string,
    targetUserId: string,
  ): Promise<boolean> {
    const current = this.normalizeId(currentUserId);
    const target = this.normalizeId(targetUserId);

    if (!target || !this.isValidId(target)) {
      return false;
    }

    if (
      !current ||
      !this.isValidId(current)
    ) {
      return false;
    }

    // The owner can view their own profile.
    if (current === target) {
      return true;
    }

    // Blocking takes precedence over friendship or privacy settings.
    if (await this.isBlocked(current, target)) {
      return false;
    }

    const targetUser = await this.userModel
      .findById(target)
      .select("_id isPrivate")
      .lean()
      .exec();

    if (!targetUser) {
      return false;
    }

    // Public profiles are available to authenticated, non-blocked users.
    if (targetUser.isPrivate !== true) {
      return true;
    }

    // Private profiles require an accepted friendship.
    const acceptedFriendship = await this.friendshipModel
      .findOne({
        status: "accepted",
        $or: [
          {
            requester: new Types.ObjectId(current),
            receiver: new Types.ObjectId(target),
          },
          {
            requester: new Types.ObjectId(target),
            receiver: new Types.ObjectId(current),
          },
        ],
      })
      .select("_id")
      .lean()
      .exec();

    return Boolean(acceptedFriendship);
  }
}
