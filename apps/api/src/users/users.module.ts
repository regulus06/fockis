import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

import {
  User,
  UserSchema,
} from "./user.schema";

import {
  FockisIdSettings,
  FockisIdSettingsSchema,
} from "../message-admin/schemas/fockis-id-settings.schema";

import {
  FockisIdService,
} from "./services/fockis-id.service";

import {
  UserSecurityService,
} from "./services/user-security.service";

import {
  UserSearchService,
} from "./services/user-search.service";

import {
  UserProfileService,
} from "./services/user-profile.service";

import { FriendsModule } from "../friends/friends.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
      },
      {
        name: FockisIdSettings.name,
        schema: FockisIdSettingsSchema,
      },
    ]),

    FriendsModule,
  ],

  controllers: [
    UsersController,
  ],

  providers: [
    UsersService,

    FockisIdService,

    UserSecurityService,

    UserSearchService,

    UserProfileService,
  ],

  exports: [
    UsersService,

    FockisIdService,

    UserSecurityService,

    UserSearchService,

    UserProfileService,

    MongooseModule,
  ],
})
export class UsersModule {}
