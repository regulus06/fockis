import {
Module,
} from "@nestjs/common";

import {
MongooseModule,
} from "@nestjs/mongoose";

import {
Order,
OrderSchema,
} from "./schemas/order.schema";

import {
Cart,
CartSchema,
} from "../cart/schemas/cart.schema";

import {
User,
UserSchema,
} from "../../users/user.schema";

import {
Store,
StoreSchema,
} from "../../stores/schemas/store.schema";

import {
OrdersController,
} from "./controllers/orders.controller";

import {
InvoiceController,
} from "./controllers/invoice.controller";

import {
OrdersService,
} from "./services/orders.service";

import {
InvoiceService,
} from "./services/invoice.service";

import {
ProductsModule,
} from "../products/products.module";

import {
InventoryModule,
} from "../inventory/inventory.module";

import {
PaymentsModule,
} from "../../payments/payments.module";

@Module({
imports: [
MongooseModule.forFeature([
{
name:
Order.name,

    schema:
      OrderSchema,
  },

  {
    name:
      Cart.name,

    schema:
      CartSchema,
  },

  {
    name:
      User.name,

    schema:
      UserSchema,
  },

  {
    name:
      Store.name,

    schema:
      StoreSchema,
  },
]),

ProductsModule,

InventoryModule,

PaymentsModule,
],

controllers: [
OrdersController,


InvoiceController,

],

providers: [
OrdersService,

InvoiceService,

],

exports: [
OrdersService,
],
})
export class OrdersModule {}
