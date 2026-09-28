import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import {
  Product,
  ProductSchema,
} from "./schemas/product.schema";

import {
  Store,
  StoreSchema,
} from "../../stores/schemas/store.schema";

import { ProductsService } from "./services/products.service";

import { ProductsController } from "./controllers/products.controller";

import { InventoryModule } from "../inventory/inventory.module";


@Module({

  imports: [

    MongooseModule.forFeature([

      {
        name: Product.name,
        schema: ProductSchema,
      },

      {
        name: Store.name,
        schema: StoreSchema,
      },

    ]),


    InventoryModule,

  ],


  controllers: [

    ProductsController,

  ],


  providers: [

    ProductsService,

  ],


  exports: [

    ProductsService,

    // IMPORTANT
    // Allows OrdersModule to inject ProductModel
    MongooseModule,

  ],

})


export class ProductsModule {}