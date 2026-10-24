
import { IsEnum, IsIn } from "class-validator";

import {
  BillingInterval,
  SubscriptionPlan,
} from "../schemas/subscription.schema";

/**
 * Fockis subscription checkout DTO.
 *
 * BASIC is free and must not use Stripe checkout.
 * Only paid plans are allowed.
 */
export class CreateCheckoutDto {
  @IsIn([
    SubscriptionPlan.BRONZE,
    SubscriptionPlan.SILVER,
    SubscriptionPlan.GOLDEN,
    SubscriptionPlan.DIAMOND,
  ])
  plan!: SubscriptionPlan;

  @IsEnum(BillingInterval)
  billingInterval!: BillingInterval;
}
