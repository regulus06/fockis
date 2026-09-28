import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { JwtModule } from "@nestjs/jwt";

import { MessagesController } from "./messages.controller";
import { ConversationsController } from "./conversations.controller";
import { ConversationMessagesController } from "./conversation-messages.controller";
import { UploadsController } from "./uploads.controller";

import { MessagesService } from "./messages.service";
import { ConversationsService } from "./conversations.service";
import { UploadsService } from "./uploads.service";

import { MessagesGateway } from "./gateway/messages.gateway";

import {
  Message,
  MessageSchema,
} from "./schemas/message.schema";

import {
  Conversation,
  ConversationSchema,
} from "./schemas/conversation.schema";

import {
  User,
  UserSchema,
} from "../users/user.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Message.name,
        schema: MessageSchema,
      },
      {
        name: Conversation.name,
        schema: ConversationSchema,
      },
      {
        name: User.name,
        schema: UserSchema,
      },
    ]),

    JwtModule.register({
      secret:
        process.env.JWT_SECRET ||
        "secretKey123",
    }),
  ],

  controllers: [
    MessagesController,
    ConversationsController,
    ConversationMessagesController,
    UploadsController,
  ],

  providers: [
    MessagesService,
    ConversationsService,
    UploadsService,
    MessagesGateway,
  ],

  exports: [
    MessagesService,
    ConversationsService,
    UploadsService,
  ],
})
export class MessagesModule {}