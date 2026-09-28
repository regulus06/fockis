import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import {
  Seller,
  SellerSchema,
} from "./schemas/seller.schema";

import {
  SellerProfile,
  SellerProfileSchema,
} from "./seller-profile.schema";

import {
  User,
  UserSchema,
} from "../users/user.schema";

import {
  Follow,
  FollowSchema,
} from "../follows/schemas/follow.schema";

import {
  Message,
  MessageSchema,
} from "../messages/schemas/message.schema";

import {
  SellerController,
} from "./controllers/seller.controller";

import {
  SellerService,
} from "./services/seller.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Seller.name,
        schema: SellerSchema,
      },

      {
        name: SellerProfile.name,
        schema: SellerProfileSchema,
      },

      {
        name: User.name,
        schema: UserSchema,
      },

      {
        name: Follow.name,
        schema: FollowSchema,
      },

      {
        name: Message.name,
        schema: MessageSchema,
      },
    ]),
  ],

  controllers: [
    SellerController,
  ],

  providers: [
    SellerService,
  ],

  exports: [
    SellerService,
  ],
})
export class SellerModule {}