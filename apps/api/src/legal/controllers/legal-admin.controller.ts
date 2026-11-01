import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { IsString, MaxLength } from "class-validator";
import type { Request } from "express";
import { memoryStorage } from "multer";

import { Permissions } from "../../admin/rbac/permissions.decorator";
import { Permission } from "../../admin/rbac/permissions.enum";
import { RbacGuard } from "../../admin/rbac/rbac.guard";
import { actorId, hasPermission, type Actor } from "../../reports/utils/actor";
import {
  ApproveRequestDto,
  AuditQueryDto,
  CreateExportDto,
  CreateHoldDto,
  CreateRequestDto,
  DeletionsQueryDto,
  ListEvidenceQueryDto,
  ListHoldsQueryDto,
  ListRequestsQueryDto,
  PageQueryDto,
  PreserveDto,
  ReasonDto,
  CreateJurisdictionRuleDto,
  RetentionRuleQuery,
  RetentionTypeParam,
  UpdateHoldDto,
  UpdatePolicyDto,
  UpdateRequestDto,
  VerifyRequestDto,
} from "../dto/legal.dto";
import { LEGAL_DOC_MAX_BYTES } from "../legal.constants";
import { AccountDeletionService } from "../services/account-deletion.service";
import { EvidenceExportService } from "../services/evidence-export.service";
import { EvidenceService } from "../services/evidence.service";
import { LegalAuditService } from "../services/legal-audit.service";
import { LegalCommonService, type UploadedLegalFile } from "../services/legal-common.service";
import { LegalDashboardService } from "../services/legal-dashboard.service";
import { LegalHoldsService } from "../services/legal-holds.service";
import { LegalRequestsService } from "../services/legal-requests.service";
import { RetentionService } from "../services/retention.service";

type AuthedRequest = Omit<Request, "user"> & { user: Actor };
const P = Permission;

class FileReasonDto extends ReasonDto {
  @IsString()
  @MaxLength(300)
  key!: string;
}

const upload = FileInterceptor("file", { storage: memoryStorage(), limits: { fileSize: LEGAL_DOC_MAX_BYTES } });

/**
 * Admin Center → Legal & Evidence. Restricted: the legal.* permissions are
 * not part of the ordinary admin or moderator roles. Every action and every
 * read of preserved content is written to the evidence access log.
 */
@Controller("admin/legal")
@UseGuards(RbacGuard)
export class LegalAdminController {
  constructor(
    private readonly dashboard: LegalDashboardService,
    private readonly holds: LegalHoldsService,
    private readonly requests: LegalRequestsService,
    private readonly evidence: EvidenceService,
    private readonly exportsService: EvidenceExportService,
    private readonly audit: LegalAuditService,
    private readonly retention: RetentionService,
    private readonly deletions: AccountDeletionService,
    private readonly common: LegalCommonService,
  ) {}

  private me(req: AuthedRequest) {
    const id = actorId(req.user);
    if (!id) throw new BadRequestException("Authenticated user ID was not found.");
    return id;
  }

  /* ---------------- overview ---------------- */

  @Get("dashboard")
  @Permissions(P.LEGAL_VIEW)
  overview(@Req() req: AuthedRequest) {
    return this.dashboard.overview(hasPermission(req.user, P.LEGAL_AUDIT_VIEW));
  }

  @Get("staff")
  @Permissions(P.LEGAL_VIEW)
  async staff() {
    return { items: await this.common.staff() };
  }

  /* ---------------- holds ---------------- */

  @Get("holds")
  @Permissions(P.LEGAL_VIEW)
  listHolds(@Query() query: ListHoldsQueryDto) {
    return this.holds.list(query);
  }

  @Get("holds/:id")
  @Permissions(P.LEGAL_VIEW)
  getHold(@Param("id") id: string) {
    return this.holds.get(id);
  }

  @Post("holds")
  @Permissions(P.LEGAL_VIEW, P.LEGAL_HOLDS_MANAGE)
  createHold(@Req() req: AuthedRequest, @Body() dto: CreateHoldDto) {
    return this.holds.create(this.me(req), dto);
  }

  @Patch("holds/:id")
  @Permissions(P.LEGAL_VIEW, P.LEGAL_HOLDS_MANAGE)
  updateHold(@Req() req: AuthedRequest, @Param("id") id: string, @Body() dto: UpdateHoldDto) {
    return this.holds.update(this.me(req), id, dto);
  }

  @Post("holds/:id/release")
  @Permissions(P.LEGAL_VIEW, P.LEGAL_HOLDS_MANAGE)
  releaseHold(@Req() req: AuthedRequest, @Param("id") id: string, @Body() dto: ReasonDto) {
    return this.holds.release(this.me(req), id, dto.reason);
  }

  @Post("holds/:id/documents")
  @Permissions(P.LEGAL_VIEW, P.LEGAL_HOLDS_MANAGE)
  @UseInterceptors(upload)
  holdDocument(@Req() req: AuthedRequest, @Param("id") id: string, @UploadedFile() file: UploadedLegalFile) {
    return this.holds.addDocument(this.me(req), id, file);
  }

  @Post("holds/:id/documents/open")
  @Permissions(P.LEGAL_VIEW)
  holdDocumentLink(@Req() req: AuthedRequest, @Param("id") id: string, @Body() dto: FileReasonDto) {
    return this.holds.documentLink(this.me(req), id, dto.key, dto.reason);
  }

  /* ---------------- requests ---------------- */

  @Get("requests")
  @Permissions(P.LEGAL_VIEW)
  listRequests(@Query() query: ListRequestsQueryDto) {
    return this.requests.list(query);
  }

  @Get("requests/:id")
  @Permissions(P.LEGAL_VIEW)
  getRequest(@Param("id") id: string) {
    return this.requests.get(id);
  }

  @Post("requests")
  @Permissions(P.LEGAL_VIEW, P.LEGAL_REQUESTS_MANAGE)
  createRequest(@Req() req: AuthedRequest, @Body() dto: CreateRequestDto) {
    return this.requests.create(this.me(req), dto);
  }

  @Patch("requests/:id")
  @Permissions(P.LEGAL_VIEW, P.LEGAL_REQUESTS_MANAGE)
  updateRequest(@Req() req: AuthedRequest, @Param("id") id: string, @Body() dto: UpdateRequestDto) {
    return this.requests.update(this.me(req), id, dto);
  }

  @Post("requests/:id/verify")
  @Permissions(P.LEGAL_VIEW, P.LEGAL_REQUESTS_MANAGE)
  verifyRequest(@Req() req: AuthedRequest, @Param("id") id: string, @Body() dto: VerifyRequestDto) {
    return this.requests.verify(this.me(req), id, dto);
  }

  @Post("requests/:id/decision")
  @Permissions(P.LEGAL_VIEW, P.LEGAL_REQUESTS_APPROVE)
  decideRequest(@Req() req: AuthedRequest, @Param("id") id: string, @Body() dto: ApproveRequestDto) {
    return this.requests.approve(this.me(req), id, dto);
  }

  @Post("requests/:id/documents")
  @Permissions(P.LEGAL_VIEW, P.LEGAL_REQUESTS_MANAGE)
  @UseInterceptors(upload)
  requestDocument(@Req() req: AuthedRequest, @Param("id") id: string, @UploadedFile() file: UploadedLegalFile) {
    return this.requests.addDocument(this.me(req), id, file);
  }

  @Post("requests/:id/documents/open")
  @Permissions(P.LEGAL_VIEW)
  requestDocumentLink(@Req() req: AuthedRequest, @Param("id") id: string, @Body() dto: FileReasonDto) {
    return this.requests.documentLink(this.me(req), id, dto.key, dto.reason);
  }

  /* ---------------- evidence ---------------- */

  @Get("evidence")
  @Permissions(P.LEGAL_VIEW)
  async listEvidence(@Req() req: AuthedRequest, @Query() query: ListEvidenceQueryDto) {
    if (query.search) {
      await this.audit.record({ actorId: this.me(req), action: "archive_searched", targetType: "evidence_archive", targetLabel: query.search.slice(0, 100) });
    }
    return this.evidence.list(query);
  }

  @Post("evidence")
  @Permissions(P.LEGAL_VIEW, P.LEGAL_EVIDENCE_PRESERVE)
  preserve(@Req() req: AuthedRequest, @Body() dto: PreserveDto) {
    return this.evidence.preserve(this.me(req), dto);
  }

  /** POST so the access reason travels in the body and is logged. */
  @Post("evidence/:id/open")
  @Permissions(P.LEGAL_VIEW, P.LEGAL_EVIDENCE_VIEW)
  openEvidence(@Req() req: AuthedRequest, @Param("id") id: string, @Body() dto: ReasonDto) {
    return this.evidence.open(this.me(req), id, dto.reason);
  }

  @Post("evidence/:id/file")
  @Permissions(P.LEGAL_VIEW, P.LEGAL_EVIDENCE_VIEW)
  evidenceFile(@Req() req: AuthedRequest, @Param("id") id: string, @Body() dto: FileReasonDto) {
    return this.evidence.fileLink(this.me(req), id, dto.key, dto.reason);
  }

  /* ---------------- exports ---------------- */

  @Get("exports")
  @Permissions(P.LEGAL_VIEW)
  listExports(@Query() query: PageQueryDto) {
    return this.exportsService.list(query);
  }

  @Post("exports")
  @Permissions(P.LEGAL_VIEW, P.LEGAL_EVIDENCE_EXPORT)
  createExport(@Req() req: AuthedRequest, @Body() dto: CreateExportDto) {
    return this.exportsService.create(this.me(req), dto);
  }

  @Post("exports/:id/download")
  @Permissions(P.LEGAL_VIEW, P.LEGAL_EVIDENCE_EXPORT)
  downloadExport(@Req() req: AuthedRequest, @Param("id") id: string, @Body() dto: ReasonDto) {
    return this.exportsService.download(this.me(req), id, dto.reason);
  }

  /* ---------------- access log ---------------- */

  @Get("audit")
  @Permissions(P.LEGAL_AUDIT_VIEW)
  auditLog(@Query() query: AuditQueryDto) {
    return this.audit.list(query);
  }

  @Get("audit/verify")
  @Permissions(P.LEGAL_AUDIT_VIEW)
  verifyAudit() {
    return this.audit.verify();
  }

  /* ---------------- retention ---------------- */

  @Get("retention")
  @Permissions(P.LEGAL_VIEW)
  async policies() {
    return { items: await this.retention.list() };
  }

  @Patch("retention/:recordType")
  @Permissions(P.LEGAL_VIEW, P.LEGAL_RETENTION_MANAGE)
  updatePolicy(@Req() req: AuthedRequest, @Param() params: RetentionTypeParam, @Query() query: RetentionRuleQuery, @Body() dto: UpdatePolicyDto) {
    const j = query.jurisdiction && query.jurisdiction.toLowerCase() !== "global" ? query.jurisdiction.toUpperCase() : "global";
    return this.retention.update(this.me(req), params.recordType, dto, j);
  }

  @Post("retention/rules")
  @Permissions(P.LEGAL_VIEW, P.LEGAL_RETENTION_MANAGE)
  createRetentionRule(@Req() req: AuthedRequest, @Body() dto: CreateJurisdictionRuleDto) {
    return this.retention.createJurisdictionRule(this.me(req), dto);
  }

  @Post("retention/run")
  @Permissions(P.LEGAL_VIEW, P.LEGAL_RETENTION_MANAGE)
  runRetention(@Req() req: AuthedRequest) {
    return this.retention.run(this.me(req));
  }

  /* ---------------- deleted accounts ---------------- */

  @Get("deletions")
  @Permissions(P.LEGAL_DELETIONS_VIEW)
  listDeletions(@Query() query: DeletionsQueryDto) {
    return this.deletions.list(query);
  }
}
