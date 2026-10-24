
import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  UseGuards,
} from "@nestjs/common";

import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { RbacGuard } from "../../admin/rbac/rbac.guard";
import { SuperAdminGuard } from "../../admin/safety/super-admin.guard";

import { SubscriptionPlan } from "../schemas/subscription.schema";
import { SubscriptionPlanService } from "../services/subscription-plan.service";
import { UpdateSubscriptionPlanDto } from "../dto/update-subscription-plan.dto";

@Controller("admin/subscription-plans")
@UseGuards(
  JwtAuthGuard,
  RbacGuard,
  SuperAdminGuard,
)
export class SubscriptionPlanController {
  constructor(
    private readonly planService: SubscriptionPlanService,
  ) {}

  private validatePlan(plan: string): SubscriptionPlan {
    const allowedPlans = Object.values(SubscriptionPlan);

    if (!allowedPlans.includes(plan as SubscriptionPlan)) {
      throw new NotFoundException("Subscription plan not found.");
    }

    return plan as SubscriptionPlan;
  }

  @Get()
  async getPlans() {
    return this.planService.findAll(true);
  }

  @Get(":plan")
  async getPlan(
    @Param("plan") plan: string,
  ) {
    const validPlan = this.validatePlan(plan);
    const result = await this.planService.findByPlan(validPlan);

    if (!result) {
      throw new NotFoundException("Subscription plan not found.");
    }

    return result;
  }

  @Patch(":plan")
  async updatePlan(
    @Param("plan") plan: string,
    @Body() dto: UpdateSubscriptionPlanDto,
  ) {
    const validPlan = this.validatePlan(plan);

    const existingPlan =
      await this.planService.findByPlan(validPlan);

    if (!existingPlan) {
      throw new NotFoundException("Subscription plan not found.");
    }

    return this.planService.update(validPlan, dto);
  }
}
