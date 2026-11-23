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

import { NotificationsModule } from "../notifications/notifications.module";

import { PaymentReceiptService } from "./services/payment-receipt.service";

import { RegistrationMailer } from "../events/registrations/registration-mailer";

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Payment.name,
        schema: PaymentSchema,
      },
    ]),

    forwardRef(() => UsersModule),

    NotificationsModule,
  ],

  controllers: [
    PaymentsController,
  ],

  providers: [
    UniversalPaymentService,
    CurrencyService,
    ExchangeRateService,
    FockisStripeService,
    PaymentReceiptService,
    RegistrationMailer,
  ],

  exports: [
    UniversalPaymentService,
    CurrencyService,
    ExchangeRateService,
    FockisStripeService,
    PaymentReceiptService,
  ],
})
export class PaymentsModule {}