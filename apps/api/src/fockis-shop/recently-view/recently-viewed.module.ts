import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import {
  RecentlyViewed,
  RecentlyViewedSchema,
} from "../recently-view/recently-viewed.schema";

import {
  Product,
  ProductSchema,
} from "../products/schemas/product.schema";

import { RecentlyViewedController } from "./recently-viewed.controller";
import { RecentlyViewedService } from "./recently-viewed.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: RecentlyViewed.name,
        schema: RecentlyViewedSchema,
      },
      {
        name: Product.name,
        schema: ProductSchema,
      },
    ]),
  ],

  controllers: [
    RecentlyViewedController,
  ],

  providers: [
    RecentlyViewedService,
  ],

  exports: [
    RecentlyViewedService,
  ],
})
export class RecentlyViewedModule {}