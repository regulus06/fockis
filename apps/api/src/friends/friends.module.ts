import { Module } from "@nestjs/common";

import { MongooseModule } from "@nestjs/mongoose";

import { FriendsController } from "./controllers/friends.controller";

import { FriendsService } from "./services/friends.service";

import { BlockVisibilityService } from "./services/block-visibility.service";

import {
  Friendship,
  FriendshipSchema,
} from "./schemas/friendship.schema";

import {
  User,
  UserSchema,
} from "../users/user.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Friendship.name,
        schema: FriendshipSchema,
      },
      {
        name: User.name,
        schema: UserSchema,
      },
    ]),
  ],

  controllers: [
    FriendsController,
  ],

  providers: [
    FriendsService,
    BlockVisibilityService,
  ],

  exports: [
    FriendsService,
    BlockVisibilityService,
  ],
})
export class FriendsModule {}