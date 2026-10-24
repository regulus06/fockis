
import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { BusinessesController } from "./businesses.controller";
import { BusinessesService } from "./businesses.service";

import {
  Business,
  BusinessSchema,
} from "./schemas/business.schema";

import {
  BusinessDeal,
  BusinessDealSchema,
} from "./schemas/business-deal.schema";

import {
  Store,
  StoreSchema,
} from "../stores/schemas/store.schema";

import {
  Post,
  PostSchema,
} from "../posts/post.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Business.name,
        schema: BusinessSchema,
      },
      {
        name: BusinessDeal.name,
        schema: BusinessDealSchema,
      },
      {
        name: Store.name,
        schema: StoreSchema,
      },
      {
        name: Post.name,
        schema: PostSchema,
      },
    ]),
  ],
  controllers: [BusinessesController],
  providers: [BusinessesService],
  exports: [BusinessesService],
})
export class BusinessesModule {}
