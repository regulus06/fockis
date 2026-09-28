import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { InjectModel } from "@nestjs/mongoose";

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

/* ============================================================================
   FRIENDS SERVICE
============================================================================ */

@Injectable()
export class FriendsService {
  constructor(
    @InjectModel(Friendship.name)
    private readonly friendshipModel: Model<FriendshipDocument>,

    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  /* ==========================================================================
     HELPERS
  ========================================================================== */

  private validateObjectId(
    value: string,
    fieldName: string,
  ): Types.ObjectId {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(
        `Invalid ${fieldName}`,
      );
    }

    return new Types.ObjectId(value);
  }

  private async ensureUserExists(
    userId: string,
    fieldName = "user",
  ): Promise<UserDocument> {
    const objectId =
      this.validateObjectId(
        userId,
        `${fieldName} id`,
      );

    const user =
      await this.userModel.findById(
        objectId,
      );

    if (!user) {
      throw new NotFoundException(
        `${fieldName} not found`,
      );
    }

    return user;
  }

  private relationshipQuery(
    userId: string,
    otherUserId: string,
  ) {
    return {
      $or: [
        {
          requester: userId,
          receiver: otherUserId,
        },
        {
          requester: otherUserId,
          receiver: userId,
        },
      ],
    };
  }

  /**
   * Returns a deterministic key for an unordered user pair.
   *
   * Pending requests remain directional through requester/receiver, while
   * pairKey makes it possible to enforce one friendship relationship per pair.
   */
  private getPairKey(
    firstUserId: string,
    secondUserId: string,
  ): string {
    return [String(firstUserId), String(secondUserId)]
      .sort()
      .join(":");
  }

  /* ==========================================================================
     SEND FRIEND REQUEST
  ========================================================================== */

  async sendRequest(
    requesterId: string,
    receiverId: string,
  ) {
    this.validateObjectId(
      requesterId,
      "requester",
    );

    this.validateObjectId(
      receiverId,
      "receiver",
    );

    if (
      requesterId ===
      receiverId
    ) {
      throw new BadRequestException(
        "You cannot send a friend request to yourself",
      );
    }

    await this.ensureUserExists(
      requesterId,
      "Requester",
    );

    await this.ensureUserExists(
      receiverId,
      "Receiver",
    );

    /*
     * IMPORTANT:
     * A friendship relationship is directional for pending requests,
     * but the pair of users is not. We must inspect BOTH directions
     * before creating a new request.
     *
     * Without this check:
     *   A -> B (pending)
     *   B -> A (pending)
     *
     * can both exist at the same time.
     */
    const requesterObjectId =
      new Types.ObjectId(requesterId);

    const receiverObjectId =
      new Types.ObjectId(receiverId);

    const pairKey = this.getPairKey(
      requesterId,
      receiverId,
    );

    const existingRelationships =
      await this.friendshipModel
        .find({
          $or: [
            {
              requester: requesterObjectId,
              receiver: receiverObjectId,
            },
            {
              requester: receiverObjectId,
              receiver: requesterObjectId,
            },
          ],
        })
        .sort({
          createdAt: -1,
        })
        .exec();

    /*
     * Prefer an accepted relationship, then blocked,
     * then pending, then rejected.
     *
     * This also makes the behavior deterministic if old
     * duplicate records already exist in the database.
     */
    const existing =
      existingRelationships.find(
        (relationship) =>
          relationship.status === "accepted",
      ) ??
      existingRelationships.find(
        (relationship) =>
          relationship.status === "blocked",
      ) ??
      existingRelationships.find(
        (relationship) =>
          relationship.status === "pending",
      ) ??
      existingRelationships.find(
        (relationship) =>
          relationship.status === "rejected",
      );

    if (existing) {
      const existingRequesterId =
        existing.requester.toString();

      const existingReceiverId =
        existing.receiver.toString();

      if (
        existing.status ===
        "accepted"
      ) {
        throw new BadRequestException(
          "You are already friends",
        );
      }

      if (
        existing.status ===
        "blocked"
      ) {
        throw new BadRequestException(
          "This user relationship is blocked",
        );
      }

      if (
        existing.status ===
        "pending"
      ) {
        /*
         * Same-direction pending request:
         * do not create another record.
         */
        if (
          existingRequesterId ===
            requesterId &&
          existingReceiverId ===
            receiverId
        ) {
          throw new BadRequestException(
            "Friend request already exists",
          );
        }

        /*
         * Opposite-direction pending request:
         * the other user already requested the
         * current user. Do not create a reciprocal
         * pending request. The UI can load the status
         * endpoint and show the incoming request.
         */
        throw new BadRequestException(
          "This user has already sent you a friend request",
        );
      }

      /*
       * A rejected relationship can be requested again.
       *
       * If the old rejected record is in the opposite
       * direction, reverse it so there is still only one
       * relationship record for this pair.
       */
      if (
        existing.status ===
        "rejected"
      ) {
        existing.requester =
          requesterObjectId;

        existing.receiver =
          receiverObjectId;

        existing.status =
          "pending";

        (existing as any).pairKey =
          pairKey;

        existing.blockedBy =
          undefined;

        await existing.save();

        return {
          success: true,
          id: existing._id.toString(),
          status: "pending",
          direction: "outgoing",
          requestId: existing._id.toString(),
          requester: requesterId,
          receiver: receiverId,
        };
      }
    }

    /*
     * The database unique pairKey index is the final protection against
     * concurrent duplicate requests. Two simultaneous requests can both
     * pass the read-before-create check, but only one insert can win.
     */
    try {
      const friendship =
        await this.friendshipModel.create({
          requester:
            new Types.ObjectId(
              requesterId,
            ),

          receiver:
            new Types.ObjectId(
              receiverId,
            ),

          pairKey,

          status: "pending",
        });

      return {
        success: true,
        id: friendship._id.toString(),
        status: friendship.status,
        direction: "outgoing",
        requestId: friendship._id.toString(),
        requester: requesterId,
        receiver: receiverId,
      };
    } catch (error: any) {
      /*
       * MongoDB duplicate-key error.
       * Another request won the race for this pair.
       */
      if (
        error?.code === 11000 &&
        (
          error?.keyPattern?.pairKey ||
          error?.keyValue?.pairKey
        )
      ) {
        throw new BadRequestException(
          "Friend request already exists",
        );
      }

      throw error;
    }
  }

  /**
   * Returns all friendship records for an unordered pair.
   * Kept private so it can be used for diagnostics and future cleanup logic.
   */
  private async findPairRelationships(
    firstUserId: string,
    secondUserId: string,
  ) {
    const firstObjectId =
      this.validateObjectId(firstUserId, "first user");

    const secondObjectId =
      this.validateObjectId(secondUserId, "second user");

    return this.friendshipModel
      .find({
        $or: [
          {
            requester: firstObjectId,
            receiver: secondObjectId,
          },
          {
            requester: secondObjectId,
            receiver: firstObjectId,
          },
        ],
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  /* ==========================================================================
     ACCEPT / REJECT
  ========================================================================== */

  async respondRequest(
    friendshipId: string,
    userId: string,
    accept: boolean,
  ) {
    this.validateObjectId(
      friendshipId,
      "friendship",
    );

    this.validateObjectId(
      userId,
      "user",
    );

    const friendship =
      await this.friendshipModel.findById(
        friendshipId,
      );

    if (!friendship) {
      throw new NotFoundException(
        "Friend request not found",
      );
    }

    if (
      friendship.status !==
      "pending"
    ) {
      throw new BadRequestException(
        "This friend request is no longer pending",
      );
    }

    if (
      friendship.receiver.toString() !==
      userId
    ) {
      throw new BadRequestException(
        "You cannot respond to this friend request",
      );
    }

    friendship.status =
      accept
        ? "accepted"
        : "rejected";

    const saved =
      await friendship.save();

    if (accept) {
      await this.syncAcceptedFriends(
        friendship.requester.toString(),
        friendship.receiver.toString(),
      );
    }

    return {
      success: true,
      id: saved._id.toString(),
      status: saved.status,
      requester:
        friendship.requester.toString(),
      receiver:
        friendship.receiver.toString(),
    };
  }

  async acceptRequest(
    friendshipId: string,
    userId: string,
  ) {
    return this.respondRequest(
      friendshipId,
      userId,
      true,
    );
  }

  async rejectRequest(
    friendshipId: string,
    userId: string,
  ) {
    return this.respondRequest(
      friendshipId,
      userId,
      false,
    );
  }

  /* ==========================================================================
     CANCEL SENT REQUEST
  ========================================================================== */

  async cancelRequest(
    friendshipId: string,
    userId: string,
  ) {
    this.validateObjectId(
      friendshipId,
      "friendship",
    );

    this.validateObjectId(
      userId,
      "user",
    );

    const friendship =
      await this.friendshipModel.findById(
        friendshipId,
      );

    if (!friendship) {
      throw new NotFoundException(
        "Friend request not found",
      );
    }

    if (
      friendship.status !==
      "pending"
    ) {
      throw new BadRequestException(
        "This friend request is no longer pending",
      );
    }

    if (
      friendship.requester.toString() !==
      userId
    ) {
      throw new BadRequestException(
        "You can only cancel a request you sent",
      );
    }

    await friendship.deleteOne();

    return {
      success: true,
      id: friendshipId,
      status: "none",
      message:
        "Friend request cancelled",
    };
  }

  /* ==========================================================================
     REMOVE FRIEND

     IMPORTANT:
     The friendship status endpoint already proves that the accepted
     relationship exists. This method therefore uses explicit ObjectIds
     instead of relying on Mongoose string casting.

     It also checks pairKey as a fallback because the duplicate-protection
     version of the Friendship schema stores a deterministic pair key.
  ========================================================================== */

  async removeFriend(
    userId: string,
    friendId: string,
  ) {
    const userObjectId =
      this.validateObjectId(
        userId,
        "user",
      );

    const friendObjectId =
      this.validateObjectId(
        friendId,
        "friend",
      );

    if (
      userObjectId.equals(
        friendObjectId,
      )
    ) {
      throw new BadRequestException(
        "You cannot remove yourself as a friend",
      );
    }

    console.log(
      "[FOCKIS FRIENDS] REMOVE FRIEND START",
      {
        userId,
        friendId,
        pairKey:
          this.getPairKey(
            userId,
            friendId,
          ),
      },
    );

    /*
     * PRIMARY LOOKUP
     *
     * Use ObjectId values explicitly and check both directions.
     */
    let friendship =
      await this.friendshipModel
        .findOne({
          status: "accepted",
          $or: [
            {
              requester:
                userObjectId,
              receiver:
                friendObjectId,
            },
            {
              requester:
                friendObjectId,
              receiver:
                userObjectId,
            },
          ],
        })
        .exec();

    /*
     * FALLBACK LOOKUP
     *
     * If pairKey exists in the current schema, use it as an additional
     * deterministic lookup for the same two users.
     */
    if (!friendship) {
      const pairKey =
        this.getPairKey(
          userId,
          friendId,
        );

      friendship =
        await this.friendshipModel
          .findOne({
            pairKey,
            status: "accepted",
          })
          .exec();
    }

    /*
     * DIAGNOSTIC LOOKUP
     *
     * Before returning 404, inspect every relationship between these two
     * users. This prevents the service from hiding a direction/status/data
     * mismatch.
     */
    if (!friendship) {
      const relationships =
        await this.friendshipModel
          .find({
            $or: [
              {
                requester:
                  userObjectId,
                receiver:
                  friendObjectId,
              },
              {
                requester:
                  friendObjectId,
                receiver:
                  userObjectId,
              },
            ],
          })
          .sort({
            createdAt: -1,
          })
          .exec();

      console.error(
        "[FOCKIS FRIENDS] REMOVE FRIEND NOT FOUND",
        {
          userId,
          friendId,
          relationshipCount:
            relationships.length,
          relationships:
            relationships.map(
              (item) => ({
                id:
                  item._id?.toString() ??
                  null,
                requester:
                  item.requester?.toString() ??
                  null,
                receiver:
                  item.receiver?.toString() ??
                  null,
                status:
                  item.status,
                pairKey:
                  (item as any).pairKey ??
                  null,
              }),
            ),
        },
      );

      throw new NotFoundException(
        "Friendship not found",
      );
    }

    const friendshipId =
      friendship._id.toString();

    const storedRequester =
      friendship.requester.toString();

    const storedReceiver =
      friendship.receiver.toString();

    console.log(
      "[FOCKIS FRIENDS] REMOVE FRIEND FOUND",
      {
        friendshipId,
        storedRequester,
        storedReceiver,
        status:
          friendship.status,
      },
    );

    await friendship.deleteOne();

    await this.removeFriendFromUserArrays(
      userId,
      friendId,
    );

    console.log(
      "[FOCKIS FRIENDS] REMOVE FRIEND SUCCESS",
      {
        friendshipId,
        userId,
        friendId,
      },
    );

    return {
      success: true,
      id: friendshipId,
      status: "none",
      message: "Friend removed",
    };
  }

  /* ==========================================================================
     BLOCK USER

     Reuse the existing relationship document when one exists. This avoids
     unique pairKey conflicts and guarantees one relationship per user pair.
  ========================================================================== */

  async blockUser(
    userId: string,
    blockedUserId: string,
  ) {
    const userObjectId =
      this.validateObjectId(userId, "user");

    const blockedUserObjectId =
      this.validateObjectId(blockedUserId, "blocked user");

    if (userObjectId.equals(blockedUserObjectId)) {
      throw new BadRequestException(
        "You cannot block yourself",
      );
    }

    await this.ensureUserExists(userId, "User");
    await this.ensureUserExists(blockedUserId, "Blocked user");

    const pairKey = this.getPairKey(
      userId,
      blockedUserId,
    );

    console.log(
      "[FOCKIS FRIENDS] BLOCK USER START",
      {
        userId,
        blockedUserId,
        pairKey,
      },
    );

    const relationships =
      await this.friendshipModel
        .find({
          $or: [
            {
              requester: userObjectId,
              receiver: blockedUserObjectId,
            },
            {
              requester: blockedUserObjectId,
              receiver: userObjectId,
            },
          ],
        })
        .sort({ createdAt: -1 })
        .exec();

    const existing =
      relationships.find(
        (item) => item.status === "blocked",
      ) ??
      relationships.find(
        (item) => item.status === "accepted",
      ) ??
      relationships.find(
        (item) => item.status === "pending",
      ) ??
      relationships.find(
        (item) => item.status === "rejected",
      ) ??
      null;

    if (existing) {
      if (
        existing.status === "blocked" &&
        existing.blockedBy?.toString() !== userId
      ) {
        throw new BadRequestException(
          "This user has blocked you",
        );
      }

      /*
       * Convert the existing relationship into the block instead of
       * deleting/recreating it. This is safe with a unique pairKey index.
       */
      existing.requester = userObjectId;
      existing.receiver = blockedUserObjectId;
      existing.pairKey = pairKey;
      existing.status = "blocked";
      existing.blockedBy = userObjectId;

      await existing.save();

      /*
       * Remove stale duplicate records, if any, while keeping the block.
       */
      const duplicateIds =
        relationships
          .filter(
            (item) =>
              item._id.toString() !==
              existing._id.toString(),
          )
          .map((item) => item._id);

      if (duplicateIds.length > 0) {
        await this.friendshipModel.deleteMany({
          _id: { $in: duplicateIds },
        });
      }

      await this.removeFriendFromUserArrays(
        userId,
        blockedUserId,
      );

      console.log(
        "[FOCKIS FRIENDS] BLOCK USER SUCCESS",
        {
          friendshipId: existing._id.toString(),
          userId,
          blockedUserId,
        },
      );

      return {
        success: true,
        id: existing._id.toString(),
        status: "blocked",
        blockedBy: userId,
        userId,
        blockedUserId,
      };
    }

    try {
      const blocked =
        await this.friendshipModel.create({
          requester: userObjectId,
          receiver: blockedUserObjectId,
          pairKey,
          status: "blocked",
          blockedBy: userObjectId,
        });

      await this.removeFriendFromUserArrays(
        userId,
        blockedUserId,
      );

      console.log(
        "[FOCKIS FRIENDS] BLOCK USER SUCCESS",
        {
          friendshipId: blocked._id.toString(),
          userId,
          blockedUserId,
        },
      );

      return {
        success: true,
        id: blocked._id.toString(),
        status: "blocked",
        blockedBy: userId,
        userId,
        blockedUserId,
      };
    } catch (error: any) {
      console.error(
        "[FOCKIS FRIENDS] BLOCK USER FAILED",
        {
          userId,
          blockedUserId,
          pairKey,
          error,
        },
      );

      throw error;
    }
  }

  /* ==========================================================================
     UNBLOCK USER

     Only the user who created the block can remove it.
  ========================================================================== */

  async unblockUser(
    userId: string,
    blockedUserId: string,
  ) {
    const userObjectId =
      this.validateObjectId(userId, "user");

    const blockedUserObjectId =
      this.validateObjectId(blockedUserId, "blocked user");

    const friendship =
      await this.friendshipModel
        .findOne({
          $or: [
            {
              requester: userObjectId,
              receiver: blockedUserObjectId,
            },
            {
              requester: blockedUserObjectId,
              receiver: userObjectId,
            },
          ],
          status: "blocked",
          blockedBy: userObjectId,
        })
        .exec();

    if (!friendship) {
      console.error(
        "[FOCKIS FRIENDS] UNBLOCK USER NOT FOUND",
        {
          userId,
          blockedUserId,
        },
      );

      throw new NotFoundException(
        "Blocked user relationship not found",
      );
    }

    const friendshipId =
      friendship._id.toString();

    await friendship.deleteOne();

    console.log(
      "[FOCKIS FRIENDS] UNBLOCK USER SUCCESS",
      {
        friendshipId,
        userId,
        blockedUserId,
      },
    );

    return {
      success: true,
      id: friendshipId,
      status: "none",
      message: "User unblocked",
    };
  }

  /* ==========================================================================
     GET MY FRIENDS
  ========================================================================== */

  async getFriends(
    userId: string,
  ) {
    this.validateObjectId(
      userId,
      "user",
    );

    const userObjectId =
      this.validateObjectId(
        userId,
        "user",
      );

    const friendships =
      await this.friendshipModel
        .find({
          $or: [
            {
              requester: userObjectId,
              status: "accepted",
            },
            {
              receiver: userObjectId,
              status: "accepted",
            },
          ],
        })
        .populate(
          "requester receiver",
          "-password",
        )
        .exec();

    console.log(
      "[FOCKIS FRIENDS] MY FRIENDS QUERY",
      {
        userId,
        userObjectId: userObjectId.toString(),
        count: friendships.length,
      },
    );

    return friendships
      .map((friendship: any) => {
        const requester =
          friendship.requester;

        const receiver =
          friendship.receiver;

        if (
          !requester ||
          !receiver
        ) {
          return null;
        }

        return requester._id.toString() ===
          userId
          ? receiver
          : requester;
      })
      .filter(Boolean);
  }

  /* ==========================================================================
     INCOMING REQUESTS
  ========================================================================== */

  async getPendingRequests(
    userId: string,
  ) {
    const userObjectId =
      this.validateObjectId(
        userId,
        "user",
      );

    /*
     * Incoming requests MUST be records where the current user is the
     * receiver. Use an explicit ObjectId so this query behaves exactly like
     * getFriendStatus().
     */
    const query = {
      receiver: userObjectId,
      status: "pending" as const,
    };

    const requests =
      await this.friendshipModel
        .find(query)
        .populate(
          "requester",
          "-password",
        )
        .sort({
          createdAt: -1,
        })
        .exec();

    console.log(
      "[FOCKIS FRIENDS] INCOMING REQUEST QUERY",
      {
        userId,
        userObjectId: userObjectId.toString(),
        query,
        count: requests.length,
        requests: requests.map((request: any) => ({
          id: request._id?.toString() ?? null,
          requester:
            request.requester?._id?.toString?.() ??
            request.requester?.toString?.() ??
            null,
          receiver:
            request.receiver?.toString?.() ??
            null,
          status: request.status,
        })),
      },
    );

    return requests;
  }

  /* ==========================================================================
     SENT REQUESTS
  ========================================================================== */

  async getSentRequests(
    userId: string,
  ) {
    const userObjectId =
      this.validateObjectId(
        userId,
        "user",
      );

    /*
     * Outgoing requests MUST be records where the current user is the
     * requester. Use an explicit ObjectId so this query matches the status
     * lookup semantics.
     */
    const query = {
      requester: userObjectId,
      status: "pending" as const,
    };

    const requests =
      await this.friendshipModel
        .find(query)
        .populate(
          "receiver",
          "-password",
        )
        .sort({
          createdAt: -1,
        })
        .exec();

    console.log(
      "[FOCKIS FRIENDS] OUTGOING REQUEST QUERY",
      {
        userId,
        userObjectId: userObjectId.toString(),
        query,
        count: requests.length,
        requests: requests.map((request: any) => ({
          id: request._id?.toString() ?? null,
          requester:
            request.requester?.toString?.() ??
            null,
          receiver:
            request.receiver?._id?.toString?.() ??
            request.receiver?.toString?.() ??
            null,
          status: request.status,
        })),
      },
    );

    return requests;
  }

  /* ==========================================================================
     ALL REQUESTS
  ========================================================================== */

  async getRequests(
    userId: string,
  ) {
    const userObjectId =
      this.validateObjectId(
        userId,
        "user",
      );

    const query = {
      $or: [
        {
          receiver: userObjectId,
          status: "pending" as const,
        },
        {
          requester: userObjectId,
          status: "pending" as const,
        },
      ],
    };

    const requests =
      await this.friendshipModel
        .find(query)
        .populate(
          "requester receiver",
          "-password",
        )
        .sort({
          createdAt: -1,
        })
        .exec();

    console.log(
      "[FOCKIS FRIENDS] ALL REQUESTS QUERY",
      {
        userId,
        userObjectId: userObjectId.toString(),
        count: requests.length,
        requests: requests.map((request: any) => ({
          id: request._id?.toString() ?? null,
          requester:
            request.requester?._id?.toString?.() ??
            request.requester?.toString?.() ??
            null,
          receiver:
            request.receiver?._id?.toString?.() ??
            request.receiver?.toString?.() ??
            null,
          status: request.status,
        })),
      },
    );

    return requests;
  }

  /* ==========================================================================
     BLOCKED USERS
  ========================================================================== */

  async getBlockedUsers(
    userId: string,
  ) {
    this.validateObjectId(
      userId,
      "user",
    );

    const userObjectId = this.validateObjectId(
      userId,
      "user",
    );

    /*
     * A block is owned by `blockedBy`. The blocked user can be stored
     * in either requester or receiver depending on how the relationship
     * was created/converted into a block.
     *
     * Therefore we must NOT assume that `receiver` is always the blocked
     * user. Find blocks created by the current user and determine the
     * other side of the relationship.
     */
    const relationships = await this.friendshipModel
      .find({
        status: "blocked",
        blockedBy: userObjectId,
        $or: [
          { requester: userObjectId },
          { receiver: userObjectId },
        ],
      })
      .sort({
        createdAt: -1,
      })
      .exec();

    const blockedUserIds = relationships
      .map((relationship) => {
        const requesterId =
          relationship.requester?.toString();

        const receiverId =
          relationship.receiver?.toString();

        if (
          requesterId &&
          requesterId !== userId
        ) {
          return requesterId;
        }

        if (
          receiverId &&
          receiverId !== userId
        ) {
          return receiverId;
        }

        return null;
      })
      .filter(
        (id): id is string => Boolean(id),
      );

    if (blockedUserIds.length === 0) {
      console.log(
        "[FOCKIS FRIENDS] BLOCKED USERS QUERY",
        {
          userId,
          relationshipCount: relationships.length,
          blockedUserCount: 0,
        },
      );

      return [];
    }

    const users = await this.userModel
      .find({
        _id: {
          $in: blockedUserIds,
        },
      })
      .select("-password")
      .exec();

    /*
     * Preserve the block relationship order rather than Mongo's
     * user query order.
     */
    const usersById = new Map(
      users.map((user) => [
        user._id.toString(),
        user,
      ]),
    );

    const result = blockedUserIds
      .map((id) => usersById.get(id))
      .filter(Boolean) as UserDocument[];

    console.log(
      "[FOCKIS FRIENDS] BLOCKED USERS QUERY",
      {
        userId,
        relationshipCount: relationships.length,
        blockedUserCount: result.length,
        blockedUserIds,
      },
    );

    return result;
  }

  /* ==========================================================================
     FRIEND STATUS
  ========================================================================== */

  async getFriendStatus(
    userId: string,
    otherUserId: string,
  ) {
    const userObjectId =
      this.validateObjectId(
        userId,
        "user",
      );

    const otherUserObjectId =
      this.validateObjectId(
        otherUserId,
        "other user",
      );

    if (userId === otherUserId) {
      return {
        status: "self",
        direction: null,
        id: null,
        requestId: null,
        friendship: null,
      };
    }

    /*
     * IMPORTANT:
     * Use ObjectId values explicitly here.
     *
     * The friendship schema stores requester/receiver
     * as MongoDB ObjectId references. Using strings normally
     * works through Mongoose casting, but explicit ObjectIds
     * make this lookup deterministic and easier to diagnose.
     */
    const relationshipQuery = {
      $or: [
        {
          requester: userObjectId,
          receiver: otherUserObjectId,
        },
        {
          requester: otherUserObjectId,
          receiver: userObjectId,
        },
      ],
    };

    console.log(
      "[FOCKIS FRIEND STATUS] LOOKING UP RELATIONSHIP",
      {
        userId,
        otherUserId,
        relationshipQuery,
      },
    );

    const relationships =
      await this.friendshipModel
        .find(relationshipQuery)
        .sort({
          createdAt: -1,
        })
        .exec();

    /*
     * BLOCKED MUST HAVE HIGHEST PRIORITY.
     *
     * A user can have legacy/duplicate relationship records from before
     * duplicate cleanup. If an accepted record and a blocked record both
     * exist for the same pair, returning "accepted" would hide the Unblock
     * action in the profile UI and would incorrectly make the relationship
     * look active.
     *
     * Priority:
     * blocked -> accepted -> pending -> rejected.
     */
    const friendship =
      relationships.find(
        (item) => item.status === "blocked",
      ) ??
      relationships.find(
        (item) => item.status === "accepted",
      ) ??
      relationships.find(
        (item) => item.status === "pending",
      ) ??
      relationships.find(
        (item) => item.status === "rejected",
      ) ??
      null;

    console.log(
      "[FOCKIS FRIEND STATUS] DATABASE RESULT",
      {
        userId,
        otherUserId,
        found: Boolean(friendship),
        relationshipCount:
          relationships.length,
        friendshipId:
          friendship?._id?.toString() ?? null,
        requester:
          friendship?.requester?.toString() ?? null,
        receiver:
          friendship?.receiver?.toString() ?? null,
        status:
          friendship?.status ?? null,
        relationships:
          relationships.map((item) => ({
            id: item._id?.toString() ?? null,
            requester:
              item.requester?.toString() ?? null,
            receiver:
              item.receiver?.toString() ?? null,
            status: item.status,
          })),
      },
    );

    if (!friendship) {
      /*
       * Diagnostic fallback.
       *
       * If the exact relationship was not found, look for
       * pending records involving either user. This helps
       * detect an incorrectly stored requester/receiver pair
       * without changing application behavior.
       */
      const relatedPending =
        await this.friendshipModel
          .find({
            status: "pending",
            $or: [
              {
                requester: userObjectId,
              },
              {
                receiver: userObjectId,
              },
              {
                requester: otherUserObjectId,
              },
              {
                receiver: otherUserObjectId,
              },
            ],
          })
          .exec();

      console.log(
        "[FOCKIS FRIEND STATUS] RELATED PENDING RECORDS",
        {
          userId,
          otherUserId,
          count:
            relatedPending.length,
          records:
            relatedPending.map(
              (item) => ({
                id:
                  item._id?.toString() ??
                  null,
                requester:
                  item.requester?.toString() ??
                  null,
                receiver:
                  item.receiver?.toString() ??
                  null,
                status:
                  item.status,
              }),
            ),
        },
      );

      return {
        status: "none",
        direction: null,
        id: null,
        requestId: null,
        friendship: null,
      };
    }

    const requesterId =
      friendship.requester.toString();

    const receiverId =
      friendship.receiver.toString();

    let direction:
      | "incoming"
      | "outgoing"
      | null = null;

    if (
      friendship.status ===
      "pending"
    ) {
      if (
        requesterId ===
        String(userId)
      ) {
        direction = "outgoing";
      } else if (
        receiverId ===
        String(userId)
      ) {
        direction = "incoming";
      }
    }

    return {
      status:
        friendship.status,

      direction,

      id:
        friendship._id.toString(),

      requestId:
        friendship._id.toString(),

      friendship: {
        id:
          friendship._id.toString(),

        requester:
          requesterId,

        receiver:
          receiverId,

        status:
          friendship.status,

        blockedBy:
          friendship.blockedBy?.toString() ??
          null,
      },
    };
  }

  /* ==========================================================================
     CONTROLLER COMPATIBILITY ALIASES

     Keep these aliases because the existing FriendsController uses the
     older method names while the canonical service methods use the newer
     names. These wrappers do not change behavior.
  ========================================================================== */

  async respondToRequest(
    friendshipId: string,
    userId: string,
    accept: boolean,
  ) {
    return this.respondRequest(
      friendshipId,
      userId,
      accept,
    );
  }

  async getMyFriends(
    userId: string,
  ) {
    return this.getFriends(
      userId,
    );
  }

  async getIncomingRequests(
    userId: string,
  ) {
    return this.getPendingRequests(
      userId,
    );
  }

  async getOutgoingRequests(
    userId: string,
  ) {
    return this.getSentRequests(
      userId,
    );
  }

  async getUserFriends(
    userId: string,
  ) {
    return this.getFriends(
      userId,
    );
  }

  async getSuggestions(
    userId: string,
  ) {
    return this.suggestions(
      userId,
    );
  }

  /* ==========================================================================
     SEARCH
  ========================================================================== */

  async searchFriends(
    query: string,
    _currentUserId?: string,
  ) {
    const trimmed =
      String(query || "").trim();

    if (!trimmed) {
      return [];
    }

    return this.userModel
      .find({
        $or: [
          {
            username: {
              $regex: trimmed,
              $options: "i",
            },
          },
          {
            email: {
              $regex: trimmed,
              $options: "i",
            },
          },
          {
            firstName: {
              $regex: trimmed,
              $options: "i",
            },
          },
          {
            lastName: {
              $regex: trimmed,
              $options: "i",
            },
          },
        ],
      })
      .select("-password")
      .limit(20);
  }

  async searchUsers(
    query: string,
  ) {
    return this.searchFriends(
      query,
    );
  }

  /* ==========================================================================
     PEOPLE YOU MAY KNOW
  ========================================================================== */

  async suggestions(
    userId: string,
  ) {
    this.validateObjectId(
      userId,
      "user",
    );

    const userObjectId =
      this.validateObjectId(
        userId,
        "user",
      );

    /*
     * ==========================================================================
     * PEOPLE YOU MAY KNOW - EXCLUSIONS
     * ==========================================================================
     *
     * Suggestions must never contain:
     *
     *   - the current user
     *   - existing friends
     *   - pending requests
     *   - rejected relationships
     *   - users blocked by the current user
     *   - users who have blocked the current user
     *
     * A block is intentionally treated as a mutual visibility exclusion.
     * This matches the rest of the Fockis block system: once either side has
     * blocked the other, they should not be recommended to one another.
     */

    const related =
      await this.friendshipModel
        .find({
          $or: [
            {
              requester: userObjectId,
            },
            {
              receiver: userObjectId,
            },
          ],
        })
        .select(
          "requester receiver status blockedBy",
        )
        .exec();

    const excludedIds =
      new Set<string>([
        userId,
      ]);

    for (const relationship of related) {
      const requesterId =
        relationship.requester?.toString();

      const receiverId =
        relationship.receiver?.toString();

      if (requesterId) {
        excludedIds.add(requesterId);
      }

      if (receiverId) {
        excludedIds.add(receiverId);
      }
    }

    /*
     * Explicitly collect blocked relationships as an additional safety
     * layer. This is intentionally separate from the general relationship
     * exclusion above so the block rule remains correct even if relationship
     * data is later changed or other relationship statuses are introduced.
     */
    const blockedRelationships =
      await this.friendshipModel
        .find({
          status: "blocked",
          $or: [
            {
              requester: userObjectId,
            },
            {
              receiver: userObjectId,
            },
            {
              blockedBy: userObjectId,
            },
          ],
        })
        .select(
          "requester receiver blockedBy",
        )
        .exec();

    for (const relationship of blockedRelationships) {
      const requesterId =
        relationship.requester?.toString();

      const receiverId =
        relationship.receiver?.toString();

      const blockedById =
        relationship.blockedBy?.toString();

      if (requesterId) {
        excludedIds.add(requesterId);
      }

      if (receiverId) {
        excludedIds.add(receiverId);
      }

      if (blockedById) {
        excludedIds.add(blockedById);
      }
    }

    const suggestions =
      await this.userModel
        .find({
          _id: {
            $nin: Array.from(
              excludedIds,
            ),
          },
          isActive: {
            $ne: false,
          },
        })
        .select("-password")
        .limit(20)
        .exec();

    console.log(
      "[FOCKIS FRIENDS] SUGGESTIONS FILTERED",
      {
        userId,
        excludedCount: excludedIds.size,
        suggestionCount: suggestions.length,
        blockedExcluded: blockedRelationships.length,
      },
    );

    return suggestions;
  }

  /* ==========================================================================
     USER FRIEND ARRAY SYNC

     User schema contains:
       friends: string[]
       friendsCount: number

     We use $addToSet/$pull so duplicate friend IDs cannot be introduced.
  ========================================================================== */

  private async syncAcceptedFriends(
    firstUserId: string,
    secondUserId: string,
  ) {
    await this.userModel.updateOne(
      {
        _id: firstUserId,
      },
      {
        $addToSet: {
          friends: secondUserId,
        },
      },
    );

    await this.userModel.updateOne(
      {
        _id: secondUserId,
      },
      {
        $addToSet: {
          friends: firstUserId,
        },
      },
    );

    await this.refreshFriendCount(
      firstUserId,
    );

    await this.refreshFriendCount(
      secondUserId,
    );
  }

  private async removeFriendFromUserArrays(
    firstUserId: string,
    secondUserId: string,
  ) {
    await this.userModel.updateOne(
      {
        _id: firstUserId,
      },
      {
        $pull: {
          friends: secondUserId,
        },
      },
    );

    await this.userModel.updateOne(
      {
        _id: secondUserId,
      },
      {
        $pull: {
          friends: firstUserId,
        },
      },
    );

    await this.refreshFriendCount(
      firstUserId,
    );

    await this.refreshFriendCount(
      secondUserId,
    );
  }

  private async refreshFriendCount(
    userId: string,
  ) {
    const user =
      await this.userModel
        .findById(userId)
        .select("friends");

    if (!user) {
      return;
    }

    const count =
      Array.isArray(user.friends)
        ? user.friends.length
        : 0;

    await this.userModel.updateOne(
      {
        _id: userId,
      },
      {
        $set: {
          friendsCount: count,
        },
      },
    );
  }
}
