import {
  Module,
} from "@nestjs/common";

import {
  MongooseModule,
} from "@nestjs/mongoose";

import {
  LiveController,
} from "./controllers/live.controller";

import {
  LiveGateway,
} from "./gateways/live.gateway";

import {
  LiveStream,
  LiveStreamSchema,
} from "./schemas/live-stream.schema";

import {
  LiveComment,
  LiveCommentSchema,
} from "./schemas/live-comment.schema";

import {
  LiveView,
  LiveViewSchema,
} from "./schemas/live-view.schema";

import {
  LiveGuest,
  LiveGuestSchema,
} from "./schemas/live-guest.schema";

import {
  User,
  UserSchema,
} from "../users/user.schema";

import {
  LiveService,
} from "./services/live.service";

import {
  LiveTokenService,
} from "./services/live-token.service";

import {
  LiveCommentService,
} from "./services/live-comment.service";

import {
  LiveDiscoveryService,
} from "./services/live-discovery.service";

import {
  LiveLikeService,
} from "./services/live-like.service";

import {
  LiveViewerService,
} from "./services/live-viewer.service";

import {
  LiveGuestService,
} from "./services/live-guest.service";

import {
  AuthModule,
} from "../auth/auth.module";


@Module({
  imports: [

    AuthModule,

    MongooseModule.forFeature([
      {
        name: LiveStream.name,
        schema: LiveStreamSchema,
      },

      {
        name: LiveComment.name,
        schema: LiveCommentSchema,
      },

      {
        name: LiveView.name,
        schema: LiveViewSchema,
      },

      {
        name: LiveGuest.name,
        schema: LiveGuestSchema,
      },

      {
        name: User.name,
        schema: UserSchema,
      },
    ]),

  ],

  controllers: [
    LiveController,
  ],

  providers: [
    LiveService,
    LiveTokenService,
    LiveCommentService,
    LiveDiscoveryService,
    LiveLikeService,
    LiveViewerService,

    LiveGuestService,

    LiveGateway,
  ],

  exports: [
    LiveService,
    LiveTokenService,
    LiveLikeService,
    LiveViewerService,
    LiveGuestService,
  ],
})
export class LiveModule {}