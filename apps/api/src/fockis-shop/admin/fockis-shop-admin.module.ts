import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import {
  Product,
  ProductSchema,
} from "../products/schemas/product.schema";

import {
  Seller,
  SellerSchema,
} from "../../seller/schemas/seller.schema";

import {
  SellerProfile,
  SellerProfileSchema,
} from "../../seller/seller-profile.schema";

import {
  Store,
  StoreSchema,
} from "../../stores/schemas/store.schema";

import {
  FockisShopAdminController,
} from "./controllers/fockis-shop-admin.controller";

import {
  FockisShopAdminService,
} from "./services/fockis-shop-admin.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Product.name,
        schema: ProductSchema,
      },
      {
        name: Seller.name,
        schema: SellerSchema,
      },
      {
        name: SellerProfile.name,
        schema: SellerProfileSchema,
      },
      {
        name: Store.name,
        schema: StoreSchema,
      },
    ]),
  ],

  controllers: [FockisShopAdminController],

  providers: [FockisShopAdminService],

  exports: [FockisShopAdminService],
})
export class FockisShopAdminModule {}