import { SetMetadata } from "@nestjs/common";

import {
  SubscriptionPlan,
} from "../schemas/subscription.schema";

/* ============================================================
   SUBSCRIPTION PLAN METADATA KEY
============================================================ */

export const REQUIRED_SUBSCRIPTION_PLAN =
  "required_subscription_plan";

/* ============================================================
   REQUIRE PLAN DECORATOR

   Example:

   @RequirePlan(SubscriptionPlan.SILVER)
   @Get("advanced-feature")
============================================================ */

export const RequirePlan = (
  plan: SubscriptionPlan,
) =>
  SetMetadata(
    REQUIRED_SUBSCRIPTION_PLAN,
    plan,
  );