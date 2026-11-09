import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import {
  Message,
  MessageDocument,
  MessageType,
  MessageStatus,
  MessageReaction,
} from "./schemas/message.schema";

import {
  Conversation,
  ConversationDocument,
} from "./schemas/conversation.schema";

import {
  User,
  UserDocument,
} from "../users/user.schema";

import { CreateMessageDto } from "./dto/create-message.dto";
import { QueryMessagesDto } from "./dto/query-messages.dto";
import { mapMessage } from "./mappers/message.mapper";
import { ConversationsService } from "./conversations.service";

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,

    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<ConversationDocument>,

    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    private readonly conversationsService: ConversationsService,
  ) {}

  // ============================================================
  // OBJECT ID VALIDATION
  // ============================================================

  private objectId(id: string): Types.ObjectId {
    if (!id || !Types.ObjectId.isValid(id)) {
      throw new BadRequestException("Invalid ID");
    }

    return new Types.ObjectId(id);
  }

  // ============================================================
  // REQUIRE CONVERSATION PARTICIPANT
  // ============================================================

  private async requireParticipant(
    conversationId: string | Types.ObjectId,
    userId: string,
  ): Promise<ConversationDocument> {
    const conversationObjectId =
      typeof conversationId === "string"
        ? this.objectId(conversationId)
        : conversationId;

    const userObjectId = this.objectId(userId);

    const conversation = await this.conversationModel.findOne({
      _id: conversationObjectId,
      participantIds: userObjectId,
    });

    if (!conversation) {
      throw new ForbiddenException(
        "You are not a participant in this conversation",
      );
    }

    return conversation;
  }

  // ============================================================
  // LOAD MESSAGE
  // ============================================================

  private async findMessage(
    messageId: string,
  ): Promise<MessageDocument> {
    const message = await this.messageModel.findById(
      this.objectId(messageId),
    );

    if (!message) {
      throw new NotFoundException("Message not found");
    }

    return message;
  }

  // ============================================================
  // CREATE MESSAGE
  // ============================================================

  async create(
    userId: string,
    dto: CreateMessageDto,
  ) {
    const senderObjectId = this.objectId(userId);

    const conversation = await this.conversationModel.findOne({
      _id: this.objectId(dto.conversationId),
      participantIds: senderObjectId,
    });

    if (!conversation) {
      throw new ForbiddenException(
        "You are not a participant in this conversation",
      );
    }

    if (
      dto.type === MessageType.TEXT &&
      !dto.text?.trim()
    ) {
      throw new BadRequestException(
        "Text message cannot be empty",
      );
    }

    if (
      dto.type !== MessageType.TEXT &&
      (!dto.attachments ||
        dto.attachments.length === 0)
    ) {
      throw new BadRequestException(
        "This message requires an attachment",
      );
    }

    let replyTo:
      | {
          messageId: Types.ObjectId;
          senderName: string;
          preview: string;
          type: MessageType;
        }
      | null = null;

    if (dto.replyTo) {
      const original = await this.messageModel.findOne({
        _id: this.objectId(dto.replyTo.messageId),
        conversationId: conversation._id,
      });

      if (!original) {
        throw new BadRequestException(
          "Reply message not found",
        );
      }

      if (original.deletedForEveryone) {
        throw new BadRequestException(
          "You cannot reply to a deleted message",
        );
      }

      replyTo = {
        messageId: original._id,
        senderName: dto.replyTo.senderName,
        preview: dto.replyTo.preview,
        type: dto.replyTo.type as MessageType,
      };
    }

    const message = await this.messageModel.create({
      conversationId: conversation._id,
      senderId: senderObjectId,
      type: dto.type as MessageType,
      text: dto.text?.trim(),
      attachments: dto.attachments || [],
      replyTo,

      status: MessageStatus.SENT,

      deliveredTo: [senderObjectId],
      readBy: [senderObjectId],

      reactions: [],
      starredBy: [],
      deletedForMeBy: [],

      deletedForEveryone: false,

      systemLabel: dto.systemLabel,
    });

    await this.conversationsService.touch(
      dto.conversationId,
      message._id.toString(),
    );

    await this.conversationsService.incrementUnread(
      conversation._id,
      senderObjectId,
    );

    const fresh = await this.messageModel
      .findById(message._id)
      .lean();

    if (!fresh) {
      throw new NotFoundException(
        "Created message could not be loaded",
      );
    }

    return mapMessage(
      fresh,
      userId,
    );
  }

  // ============================================================
  // LIST MESSAGES
  // ============================================================

  async list(
    conversationId: string,
    userId: string,
    query: QueryMessagesDto = {},
  ) {
    await this.requireParticipant(
      conversationId,
      userId,
    );

    const userObjectId = this.objectId(userId);
    const conversationObjectId =
      this.objectId(conversationId);

    const limit = Math.min(
      Math.max(Number(query.limit || 30), 1),
      100,
    );

    const filter: any = {
      conversationId: conversationObjectId,

      deletedForMeBy: {
        $ne: userObjectId,
      },
    };

    if (query.before) {
      const before = await this.messageModel.findOne({
        _id: this.objectId(query.before),
        conversationId: conversationObjectId,
      });

      if (before) {
        filter.createdAt = {
          $lt: before.createdAt,
        };
      }
    }

    const messages = await this.messageModel
      .find(filter)
      .sort({
        createdAt: -1,
      })
      .limit(limit)
      .lean();

    messages.reverse();

    return messages.map((message) =>
      mapMessage(
        message,
        userId,
      ),
    );
  }

  // ============================================================
  // EDIT MESSAGE
  //
  // ONLY THE ORIGINAL SENDER CAN EDIT.
  // ============================================================

  async edit(
    messageId: string,
    userId: string,
    text: string,
  ) {
    const trimmedText = text?.trim();

    if (!trimmedText) {
      throw new BadRequestException(
        "Message text cannot be empty",
      );
    }

    const userObjectId = this.objectId(userId);

    const message = await this.messageModel.findOne({
      _id: this.objectId(messageId),
      senderId: userObjectId,
    });

    if (!message) {
      throw new NotFoundException(
        "Message not found or you are not the sender",
      );
    }

    await this.requireParticipant(
      message.conversationId,
      userId,
    );

    if (message.deletedForEveryone) {
      throw new BadRequestException(
        "Deleted messages cannot be edited",
      );
    }

    if (message.type !== MessageType.TEXT) {
      throw new BadRequestException(
        "Only text messages can be edited",
      );
    }

    message.text = trimmedText;
    message.editedAt = new Date();

    await message.save();

    return mapMessage(
      message.toObject(),
      userId,
    );
  }

  // ============================================================
  // DELETE MESSAGE FOR ME
  //
  // ANY PARTICIPANT CAN DELETE A MESSAGE FROM THEIR
  // OWN VIEW.
  //
  // IMPORTANT:
  // The message itself is NOT deleted from MongoDB.
  // The user's ID is stored in deletedForMeBy.
  // ============================================================

  async deleteForMe(
    messageId: string,
    userId: string,
  ) {
    const message = await this.findMessage(
      messageId,
    );

    await this.requireParticipant(
      message.conversationId,
      userId,
    );

    const userObjectId = this.objectId(userId);

    await this.messageModel.updateOne(
      {
        _id: message._id,
      },
      {
        $addToSet: {
          deletedForMeBy: userObjectId,
        },
      },
    );

    return {
      success: true,
      messageId: message._id.toString(),
      deletedForMe: true,
    };
  }

  // ============================================================
  // DELETE MESSAGE FOR EVERYONE
  //
  // ONLY THE ORIGINAL SENDER CAN DO THIS.
  //
  // The message record remains in MongoDB so that:
  // - both users receive the deleted state;
  // - replies referencing it remain valid;
  // - conversation history remains consistent.
  // ============================================================

  async deleteForEveryone(
    messageId: string,
    userId: string,
  ) {
    const userObjectId = this.objectId(userId);

    const message = await this.messageModel.findOne({
      _id: this.objectId(messageId),
      senderId: userObjectId,
    });

    if (!message) {
      throw new NotFoundException(
        "Message not found or you are not the sender",
      );
    }

    await this.requireParticipant(
      message.conversationId,
      userId,
    );

    if (message.deletedForEveryone) {
      return mapMessage(
        message.toObject(),
        userId,
      );
    }

    message.deletedForEveryone = true;

    // Remove the original content.
    message.text = undefined;
    message.attachments = [];

    // Clear reactions because the original content
    // no longer exists.
    message.reactions = [];

    // A deleted message should not remain starred.
    message.starredBy = [];

    // We use editedAt as the existing timestamp field
    // available to the current schema.
    message.editedAt = new Date();

    await message.save();

    return mapMessage(
      message.toObject(),
      userId,
    );
  }

  // ============================================================
  // TOGGLE STAR
  // ============================================================

  async toggleStar(
    messageId: string,
    userId: string,
  ) {
    const message = await this.findMessage(
      messageId,
    );

    await this.requireParticipant(
      message.conversationId,
      userId,
    );

    if (message.deletedForEveryone) {
      throw new BadRequestException(
        "Deleted messages cannot be starred",
      );
    }

    const uid = this.objectId(userId);

    const exists = message.starredBy.some(
      (id) => id.equals(uid),
    );

    if (exists) {
      message.starredBy =
        message.starredBy.filter(
          (id) => !id.equals(uid),
        );
    } else {
      message.starredBy.push(uid);
    }

    await message.save();

    return mapMessage(
      message.toObject(),
      userId,
    );
  }

  // ============================================================
  // REACT TO MESSAGE
  // ============================================================

  async react(
    messageId: string,
    userId: string,
    emoji: string,
  ) {
    const message = await this.findMessage(
      messageId,
    );

    await this.requireParticipant(
      message.conversationId,
      userId,
    );

    if (message.deletedForEveryone) {
      throw new BadRequestException(
        "Deleted messages cannot receive reactions",
      );
    }

    const validEmojis = [
      "❤️",
      "😂",
      "👍",
      "😮",
      "😢",
      "🙏",
    ];

    if (!validEmojis.includes(emoji)) {
      throw new BadRequestException(
        "Invalid reaction",
      );
    }

    const uid = this.objectId(userId);

    let reaction:
      | MessageReaction
      | undefined =
      message.reactions.find(
        (item) =>
          item.emoji === emoji,
      );

    if (!reaction) {
      const newReaction = {
        emoji,
        userIds: [],
      } as MessageReaction;

      message.reactions.push(
        newReaction,
      );

      reaction =
        message.reactions[
          message.reactions.length - 1
        ];
    }

    if (!reaction) {
      throw new BadRequestException(
        "Unable to create reaction",
      );
    }

    const existing =
      reaction.userIds.some(
        (id) => id.equals(uid),
      );

    if (existing) {
      reaction.userIds =
        reaction.userIds.filter(
          (id) => !id.equals(uid),
        );
    } else {
      reaction.userIds.push(uid);
    }

    message.reactions =
      message.reactions.filter(
        (item) =>
          item.userIds.length > 0,
      );

    await message.save();

    return mapMessage(
      message.toObject(),
      userId,
    );
  }

  // ============================================================
  // MARK MESSAGE DELIVERED
  // ============================================================

  async markDelivered(
    messageId: string,
    userId: string,
  ) {
    const message = await this.findMessage(
      messageId,
    );

    await this.requireParticipant(
      message.conversationId,
      userId,
    );

    const uid = this.objectId(userId);

    await this.messageModel.updateOne(
      {
        _id: message._id,

        senderId: {
          $ne: uid,
        },
      },
      {
        $addToSet: {
          deliveredTo: uid,
        },
      },
    );

    return {
      success: true,
    };
  }

  // ============================================================
  // MARK CONVERSATION READ
  // ============================================================

  async markRead(
    conversationId: string,
    userId: string,
  ) {
    await this.requireParticipant(
      conversationId,
      userId,
    );

    return this.conversationsService.markRead(
      conversationId,
      userId,
    );
  }

  // ============================================================
  // SEARCH MESSAGES
  // ============================================================

  async search(
    query: string,
    userId: string,
    conversationId?: string,
  ) {
    const trimmed = query?.trim();

    if (!trimmed) {
      return [];
    }

    if (conversationId) {
      await this.requireParticipant(
        conversationId,
        userId,
      );
    }

    const userObjectId = this.objectId(userId);

    const participantFilter =
      await this.conversationModel
        .find({
          participantIds: userObjectId,
        })
        .select("_id")
        .lean();

    const conversationIds =
      participantFilter.map(
        (conversation) =>
          conversation._id,
      );

    const escapedQuery =
      trimmed.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&",
      );

    const filter: any = {
      conversationId: conversationId
        ? this.objectId(
            conversationId,
          )
        : {
            $in: conversationIds,
          },

      deletedForEveryone: false,

      deletedForMeBy: {
        $ne: userObjectId,
      },

      text: {
        $regex: escapedQuery,
        $options: "i",
      },
    };

    const messages =
      await this.messageModel
        .find(filter)
        .sort({
          createdAt: -1,
        })
        .limit(100)
        .lean();

    return messages.map(
      (message) =>
        mapMessage(
          message,
          userId,
        ),
    );
  }

  // ============================================================
  // FORWARD MESSAGE
  // ============================================================

  async forward(
    userId: string,
    messageId: string,
    conversationIds: string[],
    caption?: string,
  ) {
    if (
      !Array.isArray(conversationIds) ||
      conversationIds.length === 0
    ) {
      throw new BadRequestException(
        "At least one destination conversation is required",
      );
    }

    const source =
      await this.findMessage(
        messageId,
      );

    await this.requireParticipant(
      source.conversationId,
      userId,
    );

    if (source.deletedForEveryone) {
      throw new BadRequestException(
        "Deleted messages cannot be forwarded",
      );
    }

    const uniqueConversationIds = [
      ...new Set(
        conversationIds.filter(Boolean),
      ),
    ];

    const created: any[] = [];

    for (
      const conversationId of
        uniqueConversationIds
    ) {
      const allowed =
        await this.conversationsService.isParticipant(
          conversationId,
          userId,
        );

      if (!allowed) {
        continue;
      }

      const newMessage =
        await this.messageModel.create({
          conversationId:
            this.objectId(
              conversationId,
            ),

          senderId:
            this.objectId(userId),

          type:
            source.type,

          text:
            caption?.trim() ||
            source.text,

          attachments:
            source.attachments || [],

          replyTo: null,

          status:
            MessageStatus.SENT,

          deliveredTo: [
            this.objectId(userId),
          ],

          readBy: [
            this.objectId(userId),
          ],

          reactions: [],

          starredBy: [],

          deletedForMeBy: [],

          deletedForEveryone:
            false,
          forwarded: true,
        });

      await this.conversationsService.touch(
        conversationId,
        newMessage._id.toString(),
      );

      await this.conversationsService.incrementUnread(
        newMessage.conversationId,
        this.objectId(userId),
      );

      created.push(
        mapMessage(
          newMessage.toObject(),
          userId,
        ),
      );
    }

    return created;
  }

  // ============================================================
  // PIN / UNPIN (visible to everyone in the conversation)
  // ============================================================

  async togglePin(
    messageId: string,
    userId: string,
  ) {
    const message = await this.findMessage(messageId);

    await this.requireParticipant(
      message.conversationId,
      userId,
    );

    if (message.deletedForEveryone) {
      throw new BadRequestException(
        "Deleted messages cannot be pinned",
      );
    }

    if (message.type === MessageType.SYSTEM) {
      throw new BadRequestException(
        "This message cannot be pinned",
      );
    }

    const pin = !message.pinned;

    if (pin) {
      const pinnedCount = await this.messageModel.countDocuments({
        conversationId: message.conversationId,
        pinned: true,
        deletedForEveryone: { $ne: true },
      });

      if (pinnedCount >= 10) {
        throw new BadRequestException(
          "A conversation can have up to 10 pinned messages. Unpin one first.",
        );
      }
    }

    await this.messageModel.updateOne(
      { _id: message._id },
      {
        $set: {
          pinned: pin,
          pinnedAt: pin ? new Date() : null,
          pinnedBy: pin ? this.objectId(userId) : null,
        },
      },
      { timestamps: false },
    );

    const fresh = await this.messageModel.findById(message._id).lean();

    return mapMessage(
      fresh,
      userId,
    );
  }

  async listPinned(
    conversationId: string,
    userId: string,
  ) {
    await this.requireParticipant(
      conversationId,
      userId,
    );

    const rows = await this.messageModel
      .find({
        conversationId: this.objectId(conversationId),
        pinned: true,
        deletedForEveryone: { $ne: true },
        deletedForMeBy: { $ne: this.objectId(userId) },
      })
      .sort({ pinnedAt: -1 })
      .limit(10)
      .lean();

    return rows.map((row) => mapMessage(row, userId));
  }

  // ============================================================
  // STARRED MESSAGES (only the requesting user's stars)
  // ============================================================

  async listStarred(
    userId: string,
    limit = 100,
  ) {
    const uid = this.objectId(userId);

    const conversationIds = (
      await this.conversationModel
        .find({ participantIds: uid })
        .select("_id")
        .lean()
    ).map((c: any) => c._id);

    const rows = await this.messageModel
      .find({
        conversationId: { $in: conversationIds },
        starredBy: uid,
        deletedForEveryone: { $ne: true },
        deletedForMeBy: { $ne: uid },
      })
      .sort({ createdAt: -1 })
      .limit(Math.min(Math.max(limit, 1), 200))
      .lean();

    return rows.map((row) => mapMessage(row, userId));
  }

  // ============================================================
  // DELETE SEVERAL MESSAGES
  //
  // "me": hides any message in conversations the user belongs to.
  // "everyone": only the user's own messages; others are skipped.
  // ============================================================

  async bulkDelete(
    userId: string,
    messageIds: string[],
    scope: "me" | "everyone",
  ) {
    const unique = Array.from(new Set((messageIds || []).filter((id) => Types.ObjectId.isValid(id)))).slice(0, 100);

    if (unique.length === 0) {
      throw new BadRequestException(
        "Select at least one message",
      );
    }

    const uid = this.objectId(userId);

    const rows = await this.messageModel
      .find({ _id: { $in: unique.map((id) => new Types.ObjectId(id)) } })
      .select("_id conversationId senderId deletedForEveryone")
      .lean();

    const conversationIds = Array.from(new Set(rows.map((r: any) => String(r.conversationId))));

    const allowed = new Set(
      (
        await this.conversationModel
          .find({
            _id: { $in: conversationIds.map((id) => new Types.ObjectId(id)) },
            participantIds: uid,
          })
          .select("_id")
          .lean()
      ).map((c: any) => String(c._id)),
    );

    const permitted = rows.filter((r: any) => allowed.has(String(r.conversationId)));

    if (scope === "me") {
      await this.messageModel.updateMany(
        { _id: { $in: permitted.map((r: any) => r._id) } },
        { $addToSet: { deletedForMeBy: uid } },
      );

      return {
        scope,
        deletedIds: permitted.map((r: any) => String(r._id)),
        skippedIds: unique.filter((id) => !permitted.some((r: any) => String(r._id) === id)),
        messages: [] as any[],
      };
    }

    const own = permitted.filter((r: any) => String(r.senderId) === String(userId));
    const messages: any[] = [];

    for (const row of own) {
      messages.push(await this.deleteForEveryone(String(row._id), userId));
    }

    return {
      scope,
      deletedIds: own.map((r: any) => String(r._id)),
      skippedIds: unique.filter((id) => !own.some((r: any) => String(r._id) === id)),
      messages,
    };
  }

  // ============================================================
  // CLEAR CONVERSATION (for the requesting user only)
  // ============================================================

  async clearConversation(
    conversationId: string,
    userId: string,
  ) {
    const conversation = await this.requireParticipant(
      conversationId,
      userId,
    );

    const uid = this.objectId(userId);

    const result = await this.messageModel.updateMany(
      {
        conversationId: conversation._id,
        deletedForMeBy: { $ne: uid },
      },
      { $addToSet: { deletedForMeBy: uid } },
    );

    await this.conversationModel.updateOne(
      { _id: conversation._id },
      { $set: { [`unreadCounts.${userId}`]: 0, [`markedUnreadBy.${userId}`]: false } },
      { timestamps: false },
    );

    return {
      success: true,
      cleared: Number((result as any).modifiedCount ?? 0),
    };
  }

  // ============================================================
  // CALL LOG ENTRY
  //
  // Adds a "Missed voice call" / "Video call · 2:31" line to the
  // direct conversation between the two users (created if needed).
  // ============================================================

  async createCallLog(params: {
    callerId: string;
    receiverId: string;
    callId: string;
    label: string;
  }) {
    const conversation = await this.conversationsService.createWithParticipant(
      params.callerId,
      params.receiverId,
    );

    const conversationId = String((conversation as any)?.id ?? "");

    if (!Types.ObjectId.isValid(conversationId)) {
      return null;
    }

    const existing = await this.messageModel
      .findOne({ conversationId: new Types.ObjectId(conversationId), callId: params.callId })
      .lean();

    if (existing) {
      return mapMessage(existing, params.callerId);
    }

    const callerObjectId = this.objectId(params.callerId);

    const message = await this.messageModel.create({
      conversationId: new Types.ObjectId(conversationId),
      senderId: callerObjectId,
      type: MessageType.SYSTEM,
      text: params.label,
      systemLabel: params.label,
      callId: params.callId,
      attachments: [],
      replyTo: null,
      status: MessageStatus.SENT,
      deliveredTo: [callerObjectId],
      readBy: [callerObjectId],
      reactions: [],
      starredBy: [],
      deletedForMeBy: [],
      deletedForEveryone: false,
    });

    await this.conversationsService.touch(
      conversationId,
      message._id.toString(),
    );

    return mapMessage(message.toObject(), params.callerId);
  }
}