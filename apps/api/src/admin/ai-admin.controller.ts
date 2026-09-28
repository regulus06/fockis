import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";

import { AiAdminService } from "./ai-admin.service";
import { UpdateAiSettingsDto } from "./dto/update-ai-settings.dto";
import { UpdateAiPlanDto } from "./dto/update-ai-plan.dto";
import { UpdateAiUserAccessDto } from "./dto/update-ai-user-access.dto";
import { UpdateAiToolDto } from "./dto/update-ai-tool.dto";
import { UpdateAiConversationDto } from "./dto/update-ai-conversation.dto";
import { EmergencyDisableDto } from "./dto/emergency-disable.dto";

@Controller("admin/ai")
export class AiAdminController {
  constructor(private readonly service: AiAdminService) {}

  @Get("dashboard")
  getDashboard() {
    return this.service.getDashboard();
  }

  @Get("plans")
  getPlans() {
    return this.service.getPlans();
  }

  @Post("plans")
  createPlan(@Body() body: UpdateAiPlanDto) {
    return this.service.createPlan(body);
  }

  @Patch("plans/:id")
  updatePlan(@Param("id") id: string, @Body() body: UpdateAiPlanDto) {
    return this.service.updatePlan(id, body);
  }

  @Get("users")
  getUsers(
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.service.getUsers({
      search,
      page: Number(page) || 1,
      limit: Math.min(Number(limit) || 25, 100),
    });
  }

  @Get("users/:userId/access")
  getUserAccess(@Param("userId") userId: string) {
    return this.service.getUserAccess(userId);
  }

  @Patch("users/:userId/access")
  updateUserAccess(
    @Param("userId") userId: string,
    @Body() body: UpdateAiUserAccessDto,
  ) {
    return this.service.updateUserAccess(userId, body);
  }

  @Get("conversations")
  getConversations(
    @Query("search") search?: string,
    @Query("status") status?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.service.getConversations({
      search,
      status,
      page: Number(page) || 1,
      limit: Math.min(Number(limit) || 25, 100),
    });
  }

  @Patch("conversations/:id")
  updateConversation(
    @Param("id") id: string,
    @Body() body: UpdateAiConversationDto,
  ) {
    return this.service.updateConversation(id, body);
  }

  @Get("tools")
  getTools() {
    return this.service.getTools();
  }

  @Post("tools")
  createTool(@Body() body: UpdateAiToolDto) {
    return this.service.createTool(body);
  }

  @Patch("tools/:id")
  updateTool(@Param("id") id: string, @Body() body: UpdateAiToolDto) {
    return this.service.updateTool(id, body);
  }

  @Get("recommendations")
  getRecommendations() {
    return this.service.getRecommendations();
  }

  @Get("special-ads")
  getSpecialAds() {
    return this.service.getSpecialAds();
  }

  @Get("usage")
  getUsage(
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.service.getUsage(from, to);
  }

  @Get("settings")
  getSettings() {
    return this.service.getSettings();
  }

  @Patch("settings")
  updateSettings(@Body() body: UpdateAiSettingsDto) {
    return this.service.updateSettings(body);
  }

  @Post("emergency-disable")
  emergencyDisable(@Body() body: EmergencyDisableDto) {
    return this.service.emergencyDisable(body);
  }
}
