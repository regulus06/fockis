import {
IsEnum,
IsOptional,
IsString,
} from "class-validator";

import {
BillingInterval,
SubscriptionPlan,
} from "../schemas/subscription.schema";

/* ============================================================
CHANGE PLAN DTO
============================================================ */

export class ChangePlanDto {

/* ============================================================
PLAN
============================================================ */

@IsEnum(SubscriptionPlan)
plan!: SubscriptionPlan;

/* ============================================================
BILLING INTERVAL
============================================================ */

@IsOptional()
@IsEnum(BillingInterval)
billingInterval?: BillingInterval;

/* ============================================================
STRIPE CUSTOMER
============================================================ */

@IsOptional()
@IsString()
stripeCustomerId?: string;

/* ============================================================
STRIPE SUBSCRIPTION
============================================================ */

@IsOptional()
@IsString()
stripeSubscriptionId?: string;

/* ============================================================
STRIPE PRICE
============================================================ */

@IsOptional()
@IsString()
stripePriceId?: string;
}
