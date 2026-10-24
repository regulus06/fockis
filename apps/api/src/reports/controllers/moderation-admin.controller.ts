import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";

import { RbacGuard } from "../../admin/rbac/rbac.guard";
import { Permissions } from "../../admin/rbac/permissions.decorator";
import { Permission } from "../../admin/rbac/permissions.enum";
import {
  AddNoteDto,
  AppealDecisionDto,
  AssignCaseDto,
  CaseActionDto,
  ListCasesQueryDto,
  SetReportEligibilityDto,
  UpdateModerationSettingsDto,
} from "../dto/moderation.dto";
import { AppealStatus } from "../reports.constants";
import { ModerationService } from "../services/moderation.service";
import type { Actor } from "../utils/actor";

/**
 * Request type for authenticated moderation endpoints.
 * Uses an intersection type to avoid the conflicting Express
 * Request.user declaration.
 */
type AuthenticatedRequest = Omit<Request, "user"> & {
  user: Actor;
};

/**
 * Moderation center API. RbacGuard enforces route permissions;
 * the service also checks permissions for individual actions.
 */
@Controller("admin/moderation")
@UseGuards(RbacGuard)
export class ModerationAdminController {
  constructor(private readonly moderation: ModerationService) {}

  @Get("stats")
  @Permissions(Permission.MODERATION_VIEW)
  stats(@Req() req: AuthenticatedRequest) {
    return this.moderation.stats(req.user);
  }

  @Get("cases")
  @Permissions(Permission.MODERATION_VIEW)
  list(
    @Req() req: AuthenticatedRequest,
    @Query() query: ListCasesQueryDto,
  ) {
    return this.moderation.list(req.user, query);
  }

  @Get("appeals")
  @Permissions(Permission.MODERATION_VIEW, Permission.MODERATION_APPEALS)
  appeals(
    @Req() req: AuthenticatedRequest,
    @Query() query: ListCasesQueryDto,
  ) {
    return this.moderation.list(req.user, {
      ...query,
      status: query.status ?? "all",
      appealStatus: query.appealStatus ?? AppealStatus.PENDING,
      sort: query.sort ?? "newest",
    });
  }

  @Get("staff")
  @Permissions(Permission.MODERATION_VIEW, Permission.MODERATION_ASSIGN)
  staff(@Req() req: AuthenticatedRequest) {
    return this.moderation.staff(req.user);
  }

  @Get("settings")
  @Permissions(Permission.MODERATION_VIEW)
  settings(@Req() req: AuthenticatedRequest) {
    return this.moderation.getSettings(req.user);
  }

  @Patch("settings")
  @Permissions(Permission.MODERATION_SETTINGS)
  updateSettings(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateModerationSettingsDto,
  ) {
    return this.moderation.updateSettings(req.user, dto);
  }

  @Get("cases/:id")
  @Permissions(Permission.MODERATION_VIEW)
  details(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
  ) {
    return this.moderation.details(req.user, id);
  }

  @Patch("cases/:id/assign")
  @Permissions(Permission.MODERATION_VIEW, Permission.MODERATION_ASSIGN)
  assign(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() dto: AssignCaseDto,
  ) {
    return this.moderation.assign(req.user, id, dto);
  }

  @Post("cases/:id/notes")
  @Permissions(Permission.MODERATION_VIEW, Permission.MODERATION_REVIEW)
  addNote(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() dto: AddNoteDto,
  ) {
    return this.moderation.addNote(req.user, id, dto.body);
  }

  @Post("cases/:id/actions")
  @Permissions(Permission.MODERATION_VIEW)
  act(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() dto: CaseActionDto,
  ) {
    return this.moderation.act(req.user, id, dto);
  }

  @Post("cases/:id/appeal-decision")
  @Permissions(Permission.MODERATION_VIEW, Permission.MODERATION_APPEALS)
  decideAppeal(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() dto: AppealDecisionDto,
  ) {
    return this.moderation.decideAppeal(req.user, id, dto);
  }

  @Patch("reports/:id/eligibility")
  @Permissions(Permission.MODERATION_VIEW, Permission.MODERATION_REVIEW)
  eligibility(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() dto: SetReportEligibilityDto,
  ) {
    return this.moderation.setReportEligibility(req.user, id, dto);
  }
}