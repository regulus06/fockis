import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import {
  InjectModel,
} from "@nestjs/mongoose";

import {
  Model,
  Types,
} from "mongoose";

import {
  Conversation,
  ConversationDocument,
} from "./schemas/conversation.schema";

import {
  Message,
  MessageDocument,
} from "./schemas/message.schema";

import {
  User,
  UserDocument,
} from "../users/user.schema";

import {
  CreateConversationDto,
} from "./dto/create-conversation.dto";

import {
  mapConversation,
} from "./mappers/conversation.mapper";
import { assertInteractionAllowed } from "../policy-center/privacy-enforcement";

@Injectable()
export class ConversationsService {
  constructor(
    @InjectModel(Conversation.name)
    private readonly conversationModel:
      Model<ConversationDocument>,

    @InjectModel(Message.name)
    private readonly messageModel:
      Model<MessageDocument>,

    @InjectModel(User.name)
    private readonly userModel:
      Model<UserDocument>,
  ) {}

  /* ==========================================================================
     OBJECT ID VALIDATION
  ========================================================================== */

  private objectId(
    id: string,
  ): Types.ObjectId {
    if (
      !id ||
      !Types.ObjectId.isValid(id)
    ) {
      throw new BadRequestException(
        "Invalid user or conversation ID",
      );
    }

    return new Types.ObjectId(id);
  }

  /* ==========================================================================
     USER PROFILE FIELDS

     IMPORTANT:

     _id
       Internal MongoDB user ID.
       Used internally by the backend.

     fockisId
       Public Fockis identity.
       Example:
         FK3FUK3L
         FKECB2EV

     The frontend can display fockisId, while the backend continues
     using _id for database/socket authorization.
  ========================================================================== */

  private readonly userSelect =
    "_id fockisId username firstName lastName profilePicture online lastSeen";

  /** Fields needed for the conversation-list preview of the last message. */
  private readonly lastMessageSelect =
    "senderId type text attachments.kind deletedForEveryone deletedForMeBy systemLabel status readBy deliveredTo createdAt";

  /* ==========================================================================
     LIST USER CONVERSATIONS
  ========================================================================== */

  async list(
    userId: string,
  ) {
    const uid =
      this.objectId(userId);

    const conversations =
      await this.conversationModel
        .find({
          participantIds: uid,
        })
        .populate({
          path: "participantIds",
          select: this.userSelect,
        })
        .populate({
          path: "lastMessageId",
          select: this.lastMessageSelect,
        })
        .sort({
          updatedAt: -1,
        })
        .limit(100)
        .lean();

    return this.markRequests(
      conversations,
      conversations.map(
        (conversation) =>
          mapConversation(
            conversation,
            userId,
          ),
      ),
      userId,
    );
  }

  /* ==========================================================================
     MESSAGE REQUESTS

     A direct conversation is a "request" for the user when the other person
     is not their friend, the user has never sent a message in it, and the
     user hasn't accepted it yet.
  ========================================================================== */

  private async markRequests<T extends { id: string; isGroup: boolean; otherUser?: any; lastMessage?: any }>(
    raw: any[],
    mapped: T[],
    userId: string,
  ): Promise<Array<T & { request: boolean }>> {
    const uid = String(userId);
    const accepted = new Set(
      raw
        .filter((c) => {
          const map = c.requestAcceptedBy instanceof Map ? Object.fromEntries(c.requestAcceptedBy) : c.requestAcceptedBy || {};
          return Boolean(map[uid]);
        })
        .map((c) => String(c._id)),
    );
    const candidates = mapped.filter((c) => !c.isGroup && c.otherUser?.id && !accepted.has(c.id) && c.lastMessage);
    const requestIds = new Set<string>();

    if (candidates.length) {
      const friendship = this.userModel.db?.models?.["Friendship"];
      const friends = new Set<string>();
      if (friendship && Types.ObjectId.isValid(uid)) {
        const me = new Types.ObjectId(uid);
        const rows = (await friendship
          .find({
            status: "accepted",
            $or: [
              { requester: me, receiver: { $in: candidates.map((c) => new Types.ObjectId(c.otherUser.id)) } },
              { receiver: me, requester: { $in: candidates.map((c) => new Types.ObjectId(c.otherUser.id)) } },
            ],
          })
          .select("requester receiver")
          .lean()
          .exec()
          .catch(() => [])) as any[];
        for (const row of rows) friends.add(String(row.requester) === uid ? String(row.receiver) : String(row.requester));
      }

      const strangers = candidates.filter((c) => !friends.has(String(c.otherUser.id)));
      if (strangers.length) {
        const replied = (await this.messageModel
          .find({
            conversationId: { $in: strangers.map((c) => new Types.ObjectId(c.id)) },
            senderId: new Types.ObjectId(uid),
          })
          .select("conversationId")
          .lean()
          .exec()) as any[];
        const repliedIds = new Set(replied.map((m) => String(m.conversationId)));
        for (const c of strangers) if (!repliedIds.has(c.id)) requestIds.add(c.id);
      }
    }

    return mapped.map((c) => ({ ...c, request: requestIds.has(c.id) }));
  }

  /* ==========================================================================
     GET ONE CONVERSATION

     User MUST be a participant.
  ========================================================================== */

  async getById(
    conversationId: string,
    userId: string,
  ) {
    const conversation =
      await this.conversationModel
        .findOne({
          _id:
            this.objectId(
              conversationId,
            ),

          participantIds:
            this.objectId(
              userId,
            ),
        })
        .populate({
          path: "participantIds",
          select: this.userSelect,
        })
        .populate({
          path: "lastMessageId",
          select: this.lastMessageSelect,
        })
        .lean();

    if (!conversation) {
      throw new NotFoundException(
        "Conversation not found",
      );
    }

    const [mapped] = await this.markRequests(
      [conversation],
      [mapConversation(conversation, userId)],
      userId,
    );

    return mapped;
  }

  /* ==========================================================================
     GET PARTICIPANT IDS

     Used by the WebSocket gateway.

     IMPORTANT:
     This intentionally returns INTERNAL MongoDB IDs.

     Fockis IDs are public/user-facing identifiers and should not replace
     internal IDs in database relationships or socket authorization.
  ========================================================================== */

  async getParticipantIds(
    conversationId: string,
  ): Promise<string[]> {
    const conversation =
      await this.conversationModel
        .findById(
          this.objectId(
            conversationId,
          ),
        )
        .select(
          "participantIds",
        )
        .lean();

    if (!conversation) {
      throw new NotFoundException(
        "Conversation not found",
      );
    }

    return (
      conversation.participantIds || []
    ).map(
      (participantId: any) =>
        String(
          participantId?._id ||
            participantId,
        ),
    );
  }

  /* ==========================================================================
     CREATE CONVERSATION
  ========================================================================== */

  async create(
    userId: string,
    dto: CreateConversationDto,
  ) {
    this.objectId(userId);

    const uniqueIds =
      Array.from(
        new Set([
          userId,
          ...(dto.participantIds || []),
        ]),
      );

    if (
      uniqueIds.length < 2
    ) {
      throw new BadRequestException(
        "A conversation requires at least two participants",
      );
    }

    const participantObjectIds =
      uniqueIds.map(
        (id) =>
          this.objectId(id),
      );

    /* ------------------------------------------------------------------------
       VERIFY PARTICIPANTS EXIST
    ------------------------------------------------------------------------ */

    const users =
      await this.userModel.countDocuments({
        _id: {
          $in:
            participantObjectIds,
        },
      });

    if (
      users !==
      participantObjectIds.length
    ) {
      throw new BadRequestException(
        "One or more participants do not exist",
      );
    }

    const isGroup =
      dto.isGroup === true;

    /* ------------------------------------------------------------------------
       PRIVACY: "who can message me" (Policy Center)
    ------------------------------------------------------------------------ */

    if (
      !isGroup &&
      uniqueIds.length === 2
    ) {
      const otherId =
        uniqueIds.find(
          (id) => id !== userId,
        ) as string;

      await assertInteractionAllowed(
        this.userModel.db,
        "messaging",
        userId,
        otherId,
      );
    }

    /* ------------------------------------------------------------------------
       DIRECT CONVERSATION

       Do not create duplicate 1-to-1 conversations.
    ------------------------------------------------------------------------ */

    if (
      !isGroup &&
      participantObjectIds.length === 2
    ) {
      const existing =
        await this.conversationModel
          .findOne({
            isGroup: false,

            participantIds: {
              $all:
                participantObjectIds,
            },
          })
          .populate({
            path: "participantIds",
            select: this.userSelect,
          })
          .populate({
            path: "lastMessageId",
            select: this.lastMessageSelect,
          })
          .lean();

      if (existing) {
        return mapConversation(
          existing,
          userId,
        );
      }
    }

    /* ------------------------------------------------------------------------
       CREATE CONVERSATION
    ------------------------------------------------------------------------ */

    const conversation =
      await this.conversationModel.create({
        participantIds:
          participantObjectIds,

        isGroup,

        groupName:
          isGroup
            ? dto.groupName?.trim()
            : undefined,

        groupAvatar:
          isGroup
            ? dto.groupAvatar
            : undefined,

        unreadCounts:
          Object.fromEntries(
            uniqueIds.map(
              (id) => [
                id,
                0,
              ],
            ),
          ),

        pinnedBy: {},

        mutedBy: {},
      });

    /* ------------------------------------------------------------------------
       RELOAD WITH POPULATED USERS

       This guarantees the returned conversation includes:

         _id
         fockisId
         username
         firstName
         lastName
         profilePicture
         online
         lastSeen
    ------------------------------------------------------------------------ */

    const populated =
      await this.conversationModel
        .findById(
          conversation._id,
        )
        .populate({
          path: "participantIds",
          select: this.userSelect,
        })
        .populate({
          path: "lastMessageId",
          select: this.lastMessageSelect,
        })
        .lean();

    if (!populated) {
      throw new NotFoundException(
        "Created conversation could not be loaded",
      );
    }

    return mapConversation(
      populated,
      userId,
    );
  }

  /* ==========================================================================
     CREATE DIRECT CONVERSATION
  ========================================================================== */

  async createWithParticipant(
    userId: string,
    participantId: string,
  ) {
    return this.create(
      userId,
      {
        participantIds: [
          participantId,
        ],

        isGroup: false,
      },
    );
  }

  /* ==========================================================================
     MARK CONVERSATION READ
  ========================================================================== */

  async markRead(
    conversationId: string,
    userId: string,
  ) {
    const conversation =
      await this.conversationModel.findOne({
        _id:
          this.objectId(
            conversationId,
          ),

        participantIds:
          this.objectId(
            userId,
          ),
      });

    if (!conversation) {
      throw new NotFoundException(
        "Conversation not found",
      );
    }

    conversation.unreadCounts.set(
      userId,
      0,
    );

    await conversation.save();

    await this.messageModel.updateMany(
      {
        conversationId:
          conversation._id,

        senderId: {
          $ne:
            this.objectId(
              userId,
            ),
        },

        readBy: {
          $ne:
            this.objectId(
              userId,
            ),
        },
      },
      {
        $addToSet: {
          readBy:
            this.objectId(
              userId,
            ),
        },
      },
    );

    return {
      success: true,
    };
  }

  /* ==========================================================================
     MUTE / UNMUTE
  ========================================================================== */

  async setMuted(
    conversationId: string,
    userId: string,
    muted: boolean,
  ) {
    const conversation =
      await this.conversationModel.findOne({
        _id:
          this.objectId(
            conversationId,
          ),

        participantIds:
          this.objectId(
            userId,
          ),
      });

    if (!conversation) {
      throw new NotFoundException(
        "Conversation not found",
      );
    }

    conversation.mutedBy.set(
      userId,
      muted,
    );

    await conversation.save();

    /*
     * Reload/populate before mapping so the returned conversation
     * continues to contain the public Fockis ID.
     */
    const populated =
      await this.conversationModel
        .findById(
          conversation._id,
        )
        .populate({
          path: "participantIds",
          select: this.userSelect,
        })
        .populate({
          path: "lastMessageId",
          select: this.lastMessageSelect,
        })
        .lean();

    if (!populated) {
      throw new NotFoundException(
        "Conversation could not be loaded",
      );
    }

    return mapConversation(
      populated,
      userId,
    );
  }

  /* ==========================================================================
     PER-USER FLAGS: pin, archive, mark unread
     Each flag only affects the requesting participant.
  ========================================================================== */

  async setFlag(
    conversationId: string,
    userId: string,
    flag:
      | "pinnedBy"
      | "archivedBy"
      | "markedUnreadBy"
      | "mutedBy"
      | "requestAcceptedBy",
    value: boolean,
  ) {
    const conversation =
      await this.conversationModel.findOne({
        _id: this.objectId(conversationId),
        participantIds: this.objectId(userId),
      });

    if (!conversation) {
      throw new NotFoundException(
        "Conversation not found",
      );
    }

    if (flag === "pinnedBy" && value) {
      const pinnedCount =
        await this.conversationModel.countDocuments({
          participantIds: this.objectId(userId),
          [`pinnedBy.${userId}`]: true,
          _id: { $ne: conversation._id },
        });

      if (pinnedCount >= 5) {
        throw new BadRequestException(
          "You can pin up to 5 conversations.",
        );
      }
    }

    await this.conversationModel.updateOne(
      { _id: conversation._id },
      { $set: { [`${flag}.${userId}`]: Boolean(value) } },
      { timestamps: false },
    );

    return this.getById(
      conversationId,
      userId,
    );
  }

  /* ==========================================================================
     UPDATE CONVERSATION LAST MESSAGE
  ========================================================================== */

  async touch(
    conversationId: string,
    messageId: string,
  ) {
    await this.conversationModel.updateOne(
      {
        _id:
          this.objectId(
            conversationId,
          ),
      },
      {
        $set: {
          lastMessageId:
            this.objectId(
              messageId,
            ),

          updatedAt:
            new Date(),
        },
      },
    );
  }

  /* ==========================================================================
     INCREMENT UNREAD COUNT
  ========================================================================== */

  async incrementUnread(
    conversationId: Types.ObjectId,
    senderId: Types.ObjectId,
  ) {
    const conversation =
      await this.conversationModel.findById(
        conversationId,
      );

    if (!conversation) {
      return;
    }

    for (
      const participantId of
        conversation.participantIds
    ) {
      if (
        participantId.equals(
          senderId,
        )
      ) {
        continue;
      }

      const key =
        participantId.toString();

      const current =
        conversation.unreadCounts.get(
          key,
        ) || 0;

      conversation.unreadCounts.set(
        key,
        current + 1,
      );

      // A new message brings an archived chat back to the main list,
      // unless the person also muted it.
      if (
        conversation.archivedBy?.get?.(key) &&
        !conversation.mutedBy?.get?.(key)
      ) {
        conversation.archivedBy.set(key, false);
      }
    }

    await conversation.save();
  }

  /* ==========================================================================
     CHECK PARTICIPANT
  ========================================================================== */

  async isParticipant(
    conversationId: string,
    userId: string,
  ) {
    const count =
      await this.conversationModel.countDocuments({
        _id:
          this.objectId(
            conversationId,
          ),

        participantIds:
          this.objectId(
            userId,
          ),
      });

    return count > 0;
  }
}