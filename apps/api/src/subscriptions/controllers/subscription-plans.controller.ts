import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
} from "@nestjs/common";

import {
  JwtAuthGuard,
} from "../../auth/jwt-auth.guard";

import {
  SubscriptionPlan,
} from "../schemas/subscription.schema";

import {
  SubscriptionPlanService,
} from "../services/subscription-plan.service";

import {
  UpdateSubscriptionPlanDto,
} from "../dto/update-subscription-plan.dto";

/* ============================================================
   ADMIN SUBSCRIPTION PLAN CONTROLLER

   ADMIN ENDPOINTS

   GET   /admin/subscription-plans
   GET   /admin/subscription-plans/:plan
   PATCH /admin/subscription-plans/:plan
============================================================ */

@Controller("admin/subscription-plans")
@UseGuards(JwtAuthGuard)
export class SubscriptionPlanController {

  constructor(
    private readonly planService: SubscriptionPlanService,
  ) {}

  /* ============================================================
     GET ALL PLANS

     GET /admin/subscription-plans
  ============================================================ */

  @Get()
  async getPlans() {
    return this.planService.findAll(true);
  }

  /* ============================================================
     GET ONE PLAN

     GET /admin/subscription-plans/:plan
  ============================================================ */

  @Get(":plan")
  async getPlan(
    @Param("plan")
    plan: SubscriptionPlan,
  ) {
    return this.planService.findByPlan(plan);
  }

  /* ============================================================
     UPDATE PLAN

     PATCH /admin/subscription-plans/:plan
  ============================================================ */

  @Patch(":plan")
  async updatePlan(
    @Param("plan")
    plan: SubscriptionPlan,

    @Body()
    dto: UpdateSubscriptionPlanDto,
  ) {
    return this.planService.update(
      plan,
      dto,
    );
  }
}