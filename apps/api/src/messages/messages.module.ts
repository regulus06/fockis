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

import { NotificationsModule } from "../notifications/notifications.module";
import { LiveTokenService } from "../my-live/services/live-token.service";
import {
  CallRecord,
  CallRecordSchema,
  UserDevice,
  UserDeviceSchema,
} from "./calls/call.schemas";
import { CallPushService } from "./calls/call-push.service";
import { CallsService } from "./calls/calls.service";
import { CallsController, DevicesController } from "./calls/calls.controller";

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
      {
        name: CallRecord.name,
        schema: CallRecordSchema,
      },
      {
        name: UserDevice.name,
        schema: UserDeviceSchema,
      },
    ]),

    NotificationsModule,

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
    CallsController,
    DevicesController,
  ],

  providers: [
    MessagesService,
    ConversationsService,
    UploadsService,
    MessagesGateway,
    CallPushService,
    CallsService,
    LiveTokenService,
  ],

  exports: [
    MessagesService,
    ConversationsService,
    UploadsService,
    CallsService,
  ],
})
export class MessagesModule {}