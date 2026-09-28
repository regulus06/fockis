import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { CartController } from "./controllers/cart.controller";
import { CartService } from "./services/cart.service";

import {
Cart,
CartSchema,
} from "./schemas/cart.schema";

import { ProductsModule } from "../products/products.module";

@Module({
imports: [
ProductsModule,

MongooseModule.forFeature([
  {
    name: Cart.name,
    schema: CartSchema,
  },
]),

],

controllers: [
CartController,
],

providers: [
CartService,
],

exports: [
CartService,
],
})
export class CartModule {}
