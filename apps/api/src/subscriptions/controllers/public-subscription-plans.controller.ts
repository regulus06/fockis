
import {
  Controller,
  Get,
  NotFoundException,
  Param,
} from "@nestjs/common";

import {
  SubscriptionPlan,
} from "../schemas/subscription.schema";

import {
  SubscriptionPlanService,
} from "../services/subscription-plan.service";

/* ============================================================
   PUBLIC SUBSCRIPTION PLANS CONTROLLER

   PUBLIC ENDPOINTS

   GET /subscription-plans
   GET /subscription-plans/:plan

   Customers can view active subscription plans and pricing.

   Admin management is handled separately by:
   /admin/subscription-plans
============================================================ */

@Controller("subscription-plans")
export class SubscriptionPlansController {
  constructor(
    private readonly planService: SubscriptionPlanService,
  ) {}

  /* ============================================================
     GET ALL ACTIVE PUBLIC PLANS

     GET /subscription-plans

     Inactive plans are never exposed through this endpoint.
  ============================================================ */

  @Get()
  async getPlans() {
    return this.planService.findAll(false);
  }

  /* ============================================================
     GET ONE ACTIVE PUBLIC PLAN

     GET /subscription-plans/:plan
  ============================================================ */

  @Get(":plan")
  async getPlan(
    @Param("plan") plan: string,
  ) {
    const allowedPlans = Object.values(SubscriptionPlan);

    if (!allowedPlans.includes(plan as SubscriptionPlan)) {
      throw new NotFoundException(
        "Subscription plan not found.",
      );
    }

    return this.planService.findActivePlan(
      plan as SubscriptionPlan,
    );
  }
}
