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
        .sort({
          updatedAt: -1,
        })
        .limit(100)
        .lean();

    return conversations.map(
      (conversation) =>
        mapConversation(
          conversation,
          userId,
        ),
    );
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
        .lean();

    if (!conversation) {
      throw new NotFoundException(
        "Conversation not found",
      );
    }

    return mapConversation(
      conversation,
      userId,
    );
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