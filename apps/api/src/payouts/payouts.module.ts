import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import {
  Store,
  StoreSchema,
} from "../stores/schemas/store.schema";
import {
  Order,
  OrderSchema,
} from "../fockis-shop/orders/schemas/order.schema";
import { PaymentsModule } from "../payments/payments.module";

import {
  PayoutsController,
  PayoutsWebhookController,
} from "./payouts.controller";
import { PayoutsService } from "./payouts.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Store.name, schema: StoreSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
    PaymentsModule,
  ],
  controllers: [PayoutsController, PayoutsWebhookController],
  providers: [PayoutsService],
  exports: [PayoutsService],
})
export class PayoutsModule {}
