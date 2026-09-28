import {
  Controller,
  Get,
  Param,
  Query,
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

   Customers can view subscription plans and pricing.

   Admin management is handled separately by:

   /admin/subscription-plans
============================================================ */

@Controller("subscription-plans")
export class SubscriptionPlansController {

  constructor(
    private readonly planService: SubscriptionPlanService,
  ) {}

  /* ============================================================
     GET ALL PUBLIC PLANS

     GET /subscription-plans
     GET /subscription-plans?includeInactive=false
  ============================================================ */

  @Get()
  async getPlans(
    @Query("includeInactive")
    includeInactive?: string,
  ) {
    const showInactive =
      includeInactive === "true";

    return this.planService.findAll(
      showInactive,
    );
  }

  /* ============================================================
     GET ONE PUBLIC PLAN

     GET /subscription-plans/:plan
  ============================================================ */

  @Get(":plan")
  async getPlan(
    @Param("plan")
    plan: SubscriptionPlan,
  ) {
    return this.planService.findByPlan(
      plan,
    );
  }
}