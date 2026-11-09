import { Body, Controller, Get, Param, Post, Put, Query, Req, UseGuards } from "@nestjs/common";
import { IsArray, IsBoolean, IsDateString, IsIn, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

import { Permissions } from "../../admin/rbac/permissions.decorator";
import { Permission } from "../../admin/rbac/permissions.enum";
import { RbacGuard } from "../../admin/rbac/rbac.guard";
import { EmployerAccessService } from "../services/employer-access.service";

type Req = { user?: Record<string, unknown> };

function adminNameOf(req: Req) {
  const u = req.user ?? {};
  return `${String(u.name ?? ([u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || u.email || "Fockis admin"))} (Fockis admin)`;
}

class EmployerActionBody {
  @IsIn(["approve", "reject", "block", "unblock", "set_plan", "exempt", "unexempt", "clear_paid"])
  action!: "approve" | "reject" | "block" | "unblock" | "set_plan" | "exempt" | "unexempt" | "clear_paid";
  @IsOptional() @IsString() @MaxLength(2000) reason?: string;
  @IsOptional() @IsString() @MaxLength(50) plan?: string;
  @IsOptional() @IsDateString() until?: string;
  @IsOptional() @IsNumber() @Min(0) amount?: number;
}

class JobActionBody {
  @IsIn(["take_down", "restore", "delete"]) action!: "take_down" | "restore" | "delete";
  @IsOptional() @IsString() @MaxLength(2000) reason?: string;
}

class PlanInput {
  @IsString() @MaxLength(50) id!: string;
  @IsOptional() @IsString() @MaxLength(60) name?: string;
  @IsOptional() @IsString() @MaxLength(300) description?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) features?: string[];
  @IsOptional() @IsNumber() @Min(0) price?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(60) periodMonths?: number;
  @IsOptional() @IsNumber() @Min(0) maxActiveJobs?: number;
}

class PlanSettingsBody {
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsString() @Matches(/^[A-Za-z]{3}$/) currency?: string;
  @IsOptional() @IsNumber() @Min(0) @Max(180) graceDays?: number;
  @IsOptional() @IsString() @MaxLength(600) note?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => PlanInput) plans?: PlanInput[];
}

/**
 * Fockis Careers in the Admin Center. careers.view to look, careers.manage to act.
 *
 *   GET  /admin/careers/overview
 *   GET  /admin/careers/employers?status=&search=&page=
 *   GET  /admin/careers/employers/:id                      (:id = employer owner user id)
 *   POST /admin/careers/employers/:id/action               { action, reason?, plan?, until?, amount? }
 *   GET  /admin/careers/jobs?status=&search=&page=
 *   POST /admin/careers/jobs/:id/action                    { action: take_down|restore|delete, reason? }
 *   GET  /admin/careers/plans
 *   PUT  /admin/careers/plans
 */
@Controller("admin/careers")
@UseGuards(RbacGuard)
export class CareersAdminController {
  constructor(private readonly access: EmployerAccessService) {}

  @Get("overview")
  @Permissions(Permission.CAREERS_VIEW)
  overview() {
    return this.access.adminOverview();
  }

  @Get("employers")
  @Permissions(Permission.CAREERS_VIEW)
  employers(@Query("status") status?: string, @Query("search") search?: string, @Query("page") page?: string) {
    return this.access.adminEmployers({ status, search, page: Number(page) || 1 });
  }

  @Get("employers/:id")
  @Permissions(Permission.CAREERS_VIEW)
  employer(@Param("id") id: string) {
    return this.access.adminEmployer(id);
  }

  @Post("employers/:id/action")
  @Permissions(Permission.CAREERS_MANAGE)
  employerAction(@Req() req: Req, @Param("id") id: string, @Body() body: EmployerActionBody) {
    return this.access.adminEmployerAction(id, body, adminNameOf(req));
  }

  @Get("jobs")
  @Permissions(Permission.CAREERS_VIEW)
  jobs(@Query("status") status?: string, @Query("search") search?: string, @Query("page") page?: string) {
    return this.access.adminJobs({ status, search, page: Number(page) || 1 });
  }

  @Post("jobs/:id/action")
  @Permissions(Permission.CAREERS_MANAGE)
  jobAction(@Req() req: Req, @Param("id") id: string, @Body() body: JobActionBody) {
    return this.access.adminJobAction(id, body, adminNameOf(req));
  }

  @Get("plans")
  @Permissions(Permission.CAREERS_VIEW)
  plans() {
    return this.access.settingsView();
  }

  @Put("plans")
  @Permissions(Permission.CAREERS_MANAGE)
  savePlans(@Req() req: Req, @Body() body: PlanSettingsBody) {
    return this.access.saveSettings(body, adminNameOf(req));
  }
}
