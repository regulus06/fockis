import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { CertificatesService, AcademyActor } from "../services/certificates.service";
import { IssueCertificatesDto, RevokeDto, SaveTemplateDto, UpdateTemplateDto } from "../dto/certificate.dto";
import { AcademyJwtAuthGuard } from "../../auth/guards/jwt-auth.guard";

type Req = { user: AcademyActor };

/**
 * /academy/certificates
 *   Public:      GET  verify/:code           (certificate number, verification id or enrollment number)
 *   Student:     GET  mine, GET :id
 *   Any signed-in creator (ownership enforced in the service):  templates CRUD, roster/:courseCode, POST issue, GET issued, PATCH :id/revoke|restore
 * Static paths are declared before ":id".
 */
@Controller("academy/certificates")
export class CertificatesController {
  constructor(private readonly service: CertificatesService) {}

  @Get("verify/:code")
  verify(@Param("code") code: string) {
    return this.service.verify(code);
  }

  @Get("mine")
  @UseGuards(AcademyJwtAuthGuard)
  mine(@Req() req: Req) {
    return this.service.mine(req.user);
  }

  // ---------------- templates
  @Get("templates")
  @UseGuards(AcademyJwtAuthGuard)
  listTemplates(@Req() req: Req) {
    return this.service.listTemplates(req.user);
  }

  @Get("templates/:id")
  @UseGuards(AcademyJwtAuthGuard)
  getTemplate(@Param("id") id: string, @Req() req: Req) {
    return this.service.getTemplate(id, req.user);
  }

  @Post("templates")
  @UseGuards(AcademyJwtAuthGuard)
  createTemplate(@Body() dto: SaveTemplateDto, @Req() req: Req) {
    return this.service.createTemplate(dto, req.user);
  }

  @Patch("templates/:id")
  @UseGuards(AcademyJwtAuthGuard)
  updateTemplate(@Param("id") id: string, @Body() dto: UpdateTemplateDto, @Req() req: Req) {
    return this.service.updateTemplate(id, dto, req.user);
  }

  @Post("templates/:id/duplicate")
  @UseGuards(AcademyJwtAuthGuard)
  duplicateTemplate(@Param("id") id: string, @Req() req: Req) {
    return this.service.duplicateTemplate(id, req.user);
  }

  @Delete("templates/:id")
  @UseGuards(AcademyJwtAuthGuard)
  deleteTemplate(@Param("id") id: string, @Req() req: Req) {
    return this.service.deleteTemplate(id, req.user);
  }

  // ---------------- issuing
  @Get("roster/:courseCode")
  @UseGuards(AcademyJwtAuthGuard)
  roster(@Param("courseCode") courseCode: string, @Req() req: Req) {
    return this.service.courseRoster(courseCode, req.user);
  }

  @Post("issue")
  @UseGuards(AcademyJwtAuthGuard)
  issue(@Body() dto: IssueCertificatesDto, @Req() req: Req) {
    return this.service.issue(dto, req.user);
  }

  @Get("issued")
  @UseGuards(AcademyJwtAuthGuard)
  issued(@Req() req: Req, @Query("limit") _limit?: string) {
    return this.service.issuedByMe(req.user);
  }

  @Patch(":id/revoke")
  @UseGuards(AcademyJwtAuthGuard)
  revoke(@Param("id") id: string, @Body() dto: RevokeDto, @Req() req: Req) {
    return this.service.setStatus(id, true, dto.reason, req.user);
  }

  @Patch(":id/restore")
  @UseGuards(AcademyJwtAuthGuard)
  restore(@Param("id") id: string, @Req() req: Req) {
    return this.service.setStatus(id, false, undefined, req.user);
  }

  @Get(":id")
  @UseGuards(AcademyJwtAuthGuard)
  getOne(@Param("id") id: string, @Req() req: Req) {
    return this.service.getOne(id, req.user);
  }
}
