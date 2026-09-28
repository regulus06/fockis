import {
  IsEnum,
} from "class-validator";

import {
  BillingInterval,
  SubscriptionPlan,
} from "../schemas/subscription.schema";

/* ============================================================
   CREATE CHECKOUT DTO

   FOCKIS ACCOUNT LEVELS

   BASIC   = FREE
   BRONZE  = PAID
   SILVER  = PAID
   GOLDEN  = PAID
   DIAMOND = PAID

   BASIC does not require Stripe checkout.
   Only paid plans can be purchased through checkout.
============================================================ */

export class CreateCheckoutDto {

  @IsEnum([
    SubscriptionPlan.BRONZE,
    SubscriptionPlan.SILVER,
    SubscriptionPlan.GOLDEN,
    SubscriptionPlan.DIAMOND,
  ])
  plan!: SubscriptionPlan;

  @IsEnum(BillingInterval)
  billingInterval!: BillingInterval;
}