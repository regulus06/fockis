import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import {
  BusinessesController,
} from "./businesses.controller";

import {
  BusinessesService,
} from "./businesses.service";

import {
  Business,
  BusinessSchema,
} from "./schemas/business.schema";

import {
  BusinessDeal,
  BusinessDealSchema,
} from "./schemas/business-deal.schema";

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
    ]),
  ],

  controllers: [
    BusinessesController,
  ],

  providers: [
    BusinessesService,
  ],

  exports: [
    BusinessesService,
  ],
})
export class BusinessesModule {}