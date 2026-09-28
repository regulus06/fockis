import {
Module,
} from "@nestjs/common";

import {
MongooseModule,
} from "@nestjs/mongoose";

import {
Subscription,
SubscriptionSchema,
} from "./schemas/subscription.schema";

import {
SubscriptionPlanConfig,
SubscriptionPlanConfigSchema,
} from "./schemas/subscription-plan.schema";

import {
SubscriptionsController,
} from "./controllers/subscriptions.controller";

import {
SubscriptionPlanController,
} from "./controllers/subscription-plans.controller";

import {
SubscriptionPlansController,
} from "./controllers/public-subscription-plans.controller";

import {
SubscriptionsService,
} from "./services/subscription.service";

import {
SubscriptionPlanService,
} from "./services/subscription-plan.service";

import {
PaymentsModule,
} from "../payments/payments.module";

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
]),
PaymentsModule,
],

controllers: [
SubscriptionsController,
SubscriptionPlansController,
SubscriptionPlanController,
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
