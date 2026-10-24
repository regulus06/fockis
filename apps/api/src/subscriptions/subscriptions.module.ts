
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  Subscription,
  SubscriptionSchema,
} from './schemas/subscription.schema';

import {
  SubscriptionPlanConfig,
  SubscriptionPlanConfigSchema,
} from './schemas/subscription-plan.schema';

import {
  StripeWebhookEvent,
  StripeWebhookEventSchema,
} from './schemas/stripe-webhook-event.schema';

import { SubscriptionsController } from './controllers/subscriptions.controller';
import { SubscriptionPlanController } from './controllers/subscription-plans.controller';
import { SubscriptionPlansController } from './controllers/public-subscription-plans.controller';
import { StripeWebhookController } from './webhooks/stripe-webhook.controller';

import { SubscriptionsService } from './services/subscription.service';
import { SubscriptionPlanService } from './services/subscription-plan.service';

import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Subscription.name,
        schema: SubscriptionSchema,
      },
      {
        name: SubscriptionPlanConfig.name,
        schema: SubscriptionPlanConfigSchema,
      },
      {
        name: StripeWebhookEvent.name,
        schema: StripeWebhookEventSchema,
      },
    ]),
    PaymentsModule,
  ],

  controllers: [
    SubscriptionsController,
    SubscriptionPlansController,
    SubscriptionPlanController,
    StripeWebhookController,
  ],

  providers: [
    SubscriptionsService,
    SubscriptionPlanService,
  ],

  exports: [
    SubscriptionsService,
    SubscriptionPlanService,
  ],
})
export class SubscriptionsModule {}
