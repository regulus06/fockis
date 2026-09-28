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

@Injectable()
export class BlockVisibilityService {
  constructor(
    @InjectModel(Friendship.name)
    private readonly friendshipModel: Model<FriendshipDocument>,
  ) {}

  private normalizeId(
    value: unknown,
  ): string {
    if (value === null || value === undefined) {
      return "";
    }

    if (
      typeof value === "object" &&
      value !== null
    ) {
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

  /**
   * Returns true when either user has a blocking relationship
   * with the other user.
   *
   * IMPORTANT:
   * A user can ALWAYS view their own profile.
   *
   * Example:
   *   currentUser = Elince
   *   targetUser  = Elince
   *   => true, even if Elince has blocked Regulus.
   */
  async isBlocked(
    firstUserId: string,
    secondUserId: string,
  ): Promise<boolean> {
    const first = this.normalizeId(firstUserId);
    const second = this.normalizeId(secondUserId);

    if (!first || !second) {
      return false;
    }

    if (first === second) {
      return false;
    }

    if (
      !Types.ObjectId.isValid(first) ||
      !Types.ObjectId.isValid(second)
    ) {
      return false;
    }

    const relationship =
      await this.friendshipModel
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

    if (!first || !second || first === second) {
      return null;
    }

    if (
      !Types.ObjectId.isValid(first) ||
      !Types.ObjectId.isValid(second)
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
      .select(
        "_id requester receiver blockedBy status",
      )
      .lean()
      .exec();
  }

  /**
   * Determines whether the current user may unblock the other user.
   *
   * Only the user who created the block may remove it.
   */
  async canUnblock(
    currentUserId: string,
    otherUserId: string,
  ): Promise<boolean> {
    const current = this.normalizeId(
      currentUserId,
    );
    const other = this.normalizeId(
      otherUserId,
    );

    if (
      !current ||
      !other ||
      current === other
    ) {
      return false;
    }

    const block = await this.getBlock(
      current,
      other,
    );

    if (!block) {
      return false;
    }

    return (
      this.normalizeId(
        (block as any).blockedBy,
      ) === current
    );
  }

  /**
   * Determines whether currentUserId may view targetUserId.
   *
   * Rules:
   *
   * 1. Your own profile is ALWAYS visible to you.
   * 2. If neither user has blocked the other, viewing is allowed.
   * 3. If a block exists between different users, viewing is denied.
   *
   * This means:
   *
   * Elince -> Elince   ALLOWED
   * Elince -> Regulus  DENIED if blocked
   * Regulus -> Elince  DENIED if blocked
   * Regulus -> Regulus  ALLOWED
   */
  async canView(
    currentUserId: string,
    targetUserId: string,
  ): Promise<boolean> {
    const current = this.normalizeId(
      currentUserId,
    );
    const target = this.normalizeId(
      targetUserId,
    );

    if (!target) {
      return false;
    }

    // CRITICAL: never block access to your own profile.
    if (
      current &&
      current === target
    ) {
      return true;
    }

    // If there is no authenticated viewer, preserve
    // the safe behavior used by the visibility layer.
    if (!current) {
      return true;
    }

    const blocked =
      await this.isBlocked(
        current,
        target,
      );

    return !blocked;
  }
}
