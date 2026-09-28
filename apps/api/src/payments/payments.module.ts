import { Module, forwardRef } from "@nestjs/common";

import { MongooseModule } from "@nestjs/mongoose";

import { PaymentsController } from "./payments.controller";

import { UniversalPaymentService } from "./services/payment.service";

import { CurrencyService } from "./services/currency.service";

import { ExchangeRateService } from "./services/exchange-rate.service";

import { FockisStripeService } from "./services/stripe.service";

import {
  Payment,
  PaymentSchema,
} from "./schemas/payment.schema";

import { UsersModule } from "../users/users.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Payment.name,
        schema: PaymentSchema,
      },
    ]),

    forwardRef(() => UsersModule),
  ],

  controllers: [
    PaymentsController,
  ],

  providers: [
    UniversalPaymentService,
    CurrencyService,
    ExchangeRateService,
    FockisStripeService,
  ],

  exports: [
    UniversalPaymentService,
    CurrencyService,
    ExchangeRateService,
    FockisStripeService,
  ],
})
export class PaymentsModule {}