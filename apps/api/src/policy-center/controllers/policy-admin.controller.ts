import { BadRequestException, Body, Controller, ForbiddenException, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { IsIn, IsOptional } from "class-validator";
import type { Request } from "express";

import { Permissions } from "../../admin/rbac/permissions.decorator";
import { Permission } from "../../admin/rbac/permissions.enum";
import { RbacGuard } from "../../admin/rbac/rbac.guard";
import { actorId, hasPermission, type Actor } from "../../reports/utils/actor";
import {
  AcceptanceQueryDto,
  CreatePolicyDto,
  DataRequestsQueryDto,
  ListPoliciesQueryDto,
  ListRulesQueryDto,
  ListVersionsQueryDto,
  NoteDto,
  PolicyAuditQueryDto,
  RequiredNoteDto,
  ResolveCorrectionDto,
  RestoreVersionDto,
  SaveDraftDto,
  SaveRuleDto,
  ScheduleDto,
  UpdatePolicySettingsDto,
} from "../dto/policy.dto";
import { DataRequestsService } from "../services/data-requests.service";
import { OperationalRulesService } from "../services/operational-rules.service";
import { ActorCtx, PoliciesService } from "../services/policies.service";
import { PolicyAcceptanceService } from "../services/policy-acceptance.service";
import { PolicyAuditService } from "../services/policy-audit.service";
import { PolicyCommonService } from "../services/policy-common.service";

type AuthedRequest = Omit<Request, "user"> & { user: Actor };
const P = Permission;

class ApprovalsQueryDto {
  @IsOptional()
  @IsIn(["pending", "decided", "all"])
  view?: "pending" | "decided" | "all";

  @IsOptional()
  page?: string;
}

class RuleTransitionDto extends NoteDto {
  @IsIn(["submit", "approve", "reject", "publish", "archive", "withdraw"])
  action!: "submit" | "approve" | "reject" | "publish" | "archive" | "withdraw";
}

function ctxOf(req: AuthedRequest, common: PolicyCommonService): ActorCtx {
  const id = actorId(req.user);
  if (!id) throw new BadRequestException("Authenticated user ID was not found.");
  return { id, actor: req.user, context: common.context(req as any) };
}

/** Admin Center → Policy & Compliance → policies (one policy at a time). */
@Controller("admin/policies")
@UseGuards(RbacGuard)
export class AdminPoliciesController {
  constructor(
    private readonly policies: PoliciesService,
    private readonly common: PolicyCommonService,
  ) {}

  @Get()
  @Permissions(P.POLICY_VIEW)
  list(@Query() query: ListPoliciesQueryDto) {
    return this.policies.list(query);
  }

  @Post()
  @Permissions(P.POLICY_VIEW, P.POLICY_EDIT)
  create(@Req() req: AuthedRequest, @Body() dto: CreatePolicyDto) {
    return this.policies.create(ctxOf(req, this.common), dto);
  }

  @Get(":id")
  @Permissions(P.POLICY_VIEW)
  get(@Param("id") id: string) {
    return this.policies.get(id);
  }

  @Patch(":id/draft")
  @Permissions(P.POLICY_VIEW, P.POLICY_EDIT)
  saveDraft(@Req() req: AuthedRequest, @Param("id") id: string, @Body() dto: SaveDraftDto) {
    return this.policies.saveDraft(ctxOf(req, this.common), id, dto);
  }

  @Post(":id/submit")
  @Permissions(P.POLICY_VIEW, P.POLICY_EDIT)
  submit(@Req() req: AuthedRequest, @Param("id") id: string, @Body() dto: NoteDto) {
    return this.policies.submit(ctxOf(req, this.common), id, dto.note ?? "");
  }

  @Post(":id/withdraw")
  @Permissions(P.POLICY_VIEW, P.POLICY_EDIT)
  withdraw(@Req() req: AuthedRequest, @Param("id") id: string) {
    return this.policies.withdraw(ctxOf(req, this.common), id);
  }

  @Post(":id/approve")
  @Permissions(P.POLICY_VIEW, P.POLICY_REVIEW)
  approve(@Req() req: AuthedRequest, @Param("id") id: string, @Body() dto: NoteDto) {
    return this.policies.approve(ctxOf(req, this.common), id, dto.note ?? "");
  }

  @Post(":id/reject")
  @Permissions(P.POLICY_VIEW, P.POLICY_REVIEW)
  reject(@Req() req: AuthedRequest, @Param("id") id: string, @Body() dto: RequiredNoteDto) {
    return this.policies.reject(ctxOf(req, this.common), id, dto.note, false);
  }

  @Post(":id/request-changes")
  @Permissions(P.POLICY_VIEW, P.POLICY_REVIEW)
  requestChanges(@Req() req: AuthedRequest, @Param("id") id: string, @Body() dto: RequiredNoteDto) {
    return this.policies.reject(ctxOf(req, this.common), id, dto.note, true);
  }

  @Post(":id/schedule")
  @Permissions(P.POLICY_VIEW, P.POLICY_PUBLISH)
  schedule(@Req() req: AuthedRequest, @Param("id") id: string, @Body() dto: ScheduleDto) {
    return this.policies.schedule(ctxOf(req, this.common), id, dto.publishAt);
  }

  @Post(":id/publish")
  @Permissions(P.POLICY_VIEW, P.POLICY_PUBLISH)
  publish(@Req() req: AuthedRequest, @Param("id") id: string) {
    return this.policies.publish(ctxOf(req, this.common), id);
  }

  @Post(":id/archive")
  @Permissions(P.POLICY_VIEW, P.POLICY_PUBLISH)
  archive(@Req() req: AuthedRequest, @Param("id") id: string, @Body() dto: RequiredNoteDto) {
    return this.policies.archive(ctxOf(req, this.common), id, dto.note);
  }

  @Post(":id/unarchive")
  @Permissions(P.POLICY_VIEW, P.POLICY_PUBLISH)
  unarchive(@Req() req: AuthedRequest, @Param("id") id: string) {
    return this.policies.unarchive(ctxOf(req, this.common), id);
  }
}

/** Admin Center → Policy & Compliance → everything else (stats, versions, approvals, records, audit, settings, rules). */
@Controller("admin/policy-compliance")
@UseGuards(RbacGuard)
export class AdminPolicyComplianceController {
  constructor(
    private readonly policies: PoliciesService,
    private readonly acceptance: PolicyAcceptanceService,
    private readonly audit: PolicyAuditService,
    private readonly rules: OperationalRulesService,
    private readonly dataRequests: DataRequestsService,
    private readonly common: PolicyCommonService,
  ) {}

  @Get("stats")
  @Permissions(P.POLICY_VIEW)
  stats() {
    return this.policies.stats();
  }

  /** Recent non-sensitive policy activity for the overview panel. */
  @Get("activity")
  @Permissions(P.POLICY_VIEW)
  activity() {
    return this.audit.list({ includeSensitive: false, limit: 6 });
  }

  @Get("versions")
  @Permissions(P.POLICY_VIEW)
  versions(@Query() query: ListVersionsQueryDto) {
    return this.policies.listVersions(query);
  }

  @Get("versions/:id")
  @Permissions(P.POLICY_VIEW)
  version(@Param("id") id: string) {
    return this.policies.getVersion(id);
  }

  @Post("versions/:id/restore")
  @Permissions(P.POLICY_VIEW, P.POLICY_EDIT)
  restore(@Req() req: AuthedRequest, @Param("id") id: string, @Body() dto: RestoreVersionDto) {
    return this.policies.restoreVersion(ctxOf(req, this.common), id, dto);
  }

  @Get("approvals")
  @Permissions(P.POLICY_VIEW)
  approvals(@Query() query: ApprovalsQueryDto) {
    return this.policies.approvals(query.view ?? "pending", Math.max(1, Number(query.page) || 1));
  }

  @Get("acceptances")
  @Permissions(P.POLICY_ACCEPTANCE_VIEW)
  acceptances(@Query() query: AcceptanceQueryDto) {
    return this.acceptance.list(query);
  }

  @Get("acceptances/export")
  @Permissions(P.POLICY_ACCEPTANCE_VIEW)
  exportAcceptances(@Req() req: AuthedRequest, @Query() query: AcceptanceQueryDto) {
    const ctx = ctxOf(req, this.common);
    return this.acceptance.exportCsv(ctx.id, this.common.actorRole(req.user), query, ctx.context ?? {});
  }

  @Get("audit")
  @Permissions(P.POLICY_AUDIT_VIEW)
  auditLog(@Req() req: AuthedRequest, @Query() query: PolicyAuditQueryDto) {
    // Sensitive entries (exports, data-request handling) also need acceptance-record access.
    return this.audit.list({ ...query, includeSensitive: hasPermission(req.user, P.POLICY_ACCEPTANCE_VIEW) });
  }

  @Get("audit/verify")
  @Permissions(P.POLICY_AUDIT_VIEW)
  verify() {
    return this.audit.verify();
  }

  @Get("settings")
  @Permissions(P.POLICY_VIEW)
  settings() {
    return this.policies.settings();
  }

  @Patch("settings")
  @Permissions(P.POLICY_VIEW, P.POLICY_SETTINGS)
  updateSettings(@Req() req: AuthedRequest, @Body() dto: UpdatePolicySettingsDto) {
    return this.policies.updateSettings(ctxOf(req, this.common), { ...dto });
  }

  /* ---------------- operational rules ---------------- */

  @Get("rules")
  @Permissions(P.POLICY_VIEW)
  listRules(@Query() query: ListRulesQueryDto) {
    return this.rules.list(query);
  }

  @Get("rules/:id")
  @Permissions(P.POLICY_VIEW)
  getRule(@Param("id") id: string) {
    return this.rules.get(id);
  }

  @Post("rules")
  @Permissions(P.POLICY_VIEW, P.POLICY_RULES_MANAGE)
  createRule(@Req() req: AuthedRequest, @Body() dto: SaveRuleDto) {
    return this.rules.create(ctxOf(req, this.common), dto);
  }

  @Patch("rules/:id")
  @Permissions(P.POLICY_VIEW, P.POLICY_RULES_MANAGE)
  updateRule(@Req() req: AuthedRequest, @Param("id") id: string, @Body() dto: SaveRuleDto) {
    return this.rules.update(ctxOf(req, this.common), id, dto);
  }

  @Post("rules/:id/transition")
  @Permissions(P.POLICY_VIEW)
  transitionRule(@Req() req: AuthedRequest, @Param("id") id: string, @Body() dto: RuleTransitionDto) {
    // Each step needs its own permission, checked here on the server.
    const needs: Record<string, string> = { submit: P.POLICY_RULES_MANAGE, withdraw: P.POLICY_RULES_MANAGE, approve: P.POLICY_REVIEW, reject: P.POLICY_REVIEW, publish: P.POLICY_PUBLISH, archive: P.POLICY_PUBLISH };
    if (!hasPermission(req.user, needs[dto.action])) throw new ForbiddenException("Your role can't do that.");
    return this.rules.transition(ctxOf(req, this.common), id, dto.action, dto.note ?? "");
  }

  /* ---------------- privacy requests ---------------- */

  @Get("data-requests")
  @Permissions(P.POLICY_ACCEPTANCE_VIEW)
  dataRequestsList(@Query() query: DataRequestsQueryDto) {
    return this.dataRequests.adminList(query);
  }

  @Post("data-requests/:id/resolve")
  @Permissions(P.POLICY_ACCEPTANCE_VIEW)
  resolve(@Req() req: AuthedRequest, @Param("id") id: string, @Body() dto: ResolveCorrectionDto) {
    const ctx = ctxOf(req, this.common);
    return this.dataRequests.resolveCorrection(ctx.id, this.common.actorRole(req.user), id, dto, ctx.context ?? {});
  }
}
