import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { AcademyJwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { Roles } from "../../auth/decorators/roles.decorator";
import { AcademyActor, InstitutionsService } from "../services/institutions.service";
import { AddStaffDto, ApplyDto, BulkStudentsDto, NewStudentDto, ReasonDto, SaveInstitutionDto, TeacherDto } from "../dto/institution.dto";

type R = { user: AcademyActor };

/**
 * /academy/institutions — schools, universities, training centers and
 * businesses on Fockis Academy.
 *   Public:  directory, slug check, school page, student application
 *   School:  register, edit, staff, applications, student logins
 * Static paths are declared before ":slug" / ":id".
 */
@Controller("academy/institutions")
export class InstitutionsController {
  constructor(private readonly service: InstitutionsService) {}

  // ---------------- public
  @Get()
  directory() {
    return this.service.directory();
  }

  @Get("check-domain")
  check(@Query("slug") slug: string) {
    return this.service.slugAvailable(slug);
  }

  // ---------------- signed-in school owners / staff
  @Get("mine")
  @UseGuards(AcademyJwtAuthGuard)
  mine(@Req() req: R) {
    return this.service.mine(req.user);
  }

  @Post()
  @UseGuards(AcademyJwtAuthGuard)
  register(@Req() req: R, @Body() dto: SaveInstitutionDto) {
    return this.service.register(dto, req.user);
  }

  @Get("manage/:id")
  @UseGuards(AcademyJwtAuthGuard)
  get(@Req() req: R, @Param("id") id: string) {
    return this.service.getForStaff(id, req.user);
  }

  @Patch("manage/:id")
  @UseGuards(AcademyJwtAuthGuard)
  update(@Req() req: R, @Param("id") id: string, @Body() dto: SaveInstitutionDto) {
    return this.service.update(id, dto, req.user);
  }

  @Post("manage/:id/resubmit")
  @UseGuards(AcademyJwtAuthGuard)
  resubmit(@Req() req: R, @Param("id") id: string) {
    return this.service.resubmit(id, req.user);
  }

  @Post("manage/:id/staff")
  @UseGuards(AcademyJwtAuthGuard)
  addStaff(@Req() req: R, @Param("id") id: string, @Body() dto: AddStaffDto) {
    return this.service.addStaff(id, dto, req.user);
  }

  @Delete("manage/:id/staff/:userId")
  @UseGuards(AcademyJwtAuthGuard)
  removeStaff(@Req() req: R, @Param("id") id: string, @Param("userId") userId: string) {
    return this.service.removeStaff(id, userId, req.user);
  }

  @Post("manage/:id/teachers")
  @UseGuards(AcademyJwtAuthGuard)
  addTeacher(@Req() req: R, @Param("id") id: string, @Body() dto: TeacherDto) {
    return this.service.addTeacher(id, dto, req.user);
  }

  @Patch("manage/:id/teachers/:key")
  @UseGuards(AcademyJwtAuthGuard)
  updateTeacher(@Req() req: R, @Param("id") id: string, @Param("key") key: string, @Body() dto: TeacherDto) {
    return this.service.updateTeacher(id, key, dto, req.user);
  }

  @Delete("manage/:id/teachers/:key")
  @UseGuards(AcademyJwtAuthGuard)
  removeTeacher(@Req() req: R, @Param("id") id: string, @Param("key") key: string) {
    return this.service.removeTeacher(id, key, req.user);
  }

  @Get("manage/:id/applications")
  @UseGuards(AcademyJwtAuthGuard)
  applications(@Req() req: R, @Param("id") id: string, @Query("status") status?: string) {
    return this.service.applications(id, status, req.user);
  }

  @Post("manage/:id/applications/:appId/approve")
  @UseGuards(AcademyJwtAuthGuard)
  approveApp(@Req() req: R, @Param("id") id: string, @Param("appId") appId: string) {
    return this.service.approveApplication(id, appId, req.user);
  }

  @Post("manage/:id/applications/:appId/reject")
  @UseGuards(AcademyJwtAuthGuard)
  rejectApp(@Req() req: R, @Param("id") id: string, @Param("appId") appId: string, @Body() dto: ReasonDto) {
    return this.service.rejectApplication(id, appId, dto.reason, req.user);
  }

  @Get("manage/:id/students")
  @UseGuards(AcademyJwtAuthGuard)
  students(@Req() req: R, @Param("id") id: string) {
    return this.service.students(id, req.user);
  }

  @Post("manage/:id/students")
  @UseGuards(AcademyJwtAuthGuard)
  addStudent(@Req() req: R, @Param("id") id: string, @Body() dto: NewStudentDto) {
    return this.service.addStudent(id, dto, req.user);
  }

  @Post("manage/:id/students/bulk")
  @UseGuards(AcademyJwtAuthGuard)
  addStudents(@Req() req: R, @Param("id") id: string, @Body() dto: BulkStudentsDto) {
    return this.service.addStudents(id, dto.students, req.user);
  }

  @Post("manage/:id/students/:userId/reset-password")
  @UseGuards(AcademyJwtAuthGuard)
  resetPassword(@Req() req: R, @Param("id") id: string, @Param("userId") userId: string) {
    return this.service.resetStudentPassword(id, userId, req.user);
  }

  @Post("manage/:id/students/:userId/suspend")
  @UseGuards(AcademyJwtAuthGuard)
  suspend(@Req() req: R, @Param("id") id: string, @Param("userId") userId: string, @Body() dto: ReasonDto) {
    return this.service.setStudentActive(id, userId, false, dto.reason, req.user);
  }

  @Post("manage/:id/students/:userId/restore")
  @UseGuards(AcademyJwtAuthGuard)
  restore(@Req() req: R, @Param("id") id: string, @Param("userId") userId: string) {
    return this.service.setStudentActive(id, userId, true, undefined, req.user);
  }

  // ---------------- public school page (declared last: ":slug" catches anything)
  @Get(":slug")
  profile(@Param("slug") slug: string) {
    return this.service.publicProfile(slug);
  }

  @Post(":slug/apply")
  apply(@Param("slug") slug: string, @Body() dto: ApplyDto) {
    return this.service.apply(slug, dto);
  }
}

/** /academy/admin/institutions — Fockis Academy administrators review schools. */
@Controller("academy/admin/institutions")
@UseGuards(AcademyJwtAuthGuard, RolesGuard)
@Roles("administrator", "staff")
export class InstitutionsAdminController {
  constructor(private readonly service: InstitutionsService) {}

  @Get()
  list(@Query("status") status?: string) {
    return this.service.adminList(status);
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.service.adminGet(id);
  }

  @Post(":id/approve")
  approve(@Req() req: R, @Param("id") id: string) {
    return this.service.adminSetStatus(id, "approve", undefined, req.user);
  }

  @Post(":id/reject")
  reject(@Req() req: R, @Param("id") id: string, @Body() dto: ReasonDto) {
    return this.service.adminSetStatus(id, "reject", dto.reason, req.user);
  }

  @Post(":id/block")
  block(@Req() req: R, @Param("id") id: string, @Body() dto: ReasonDto) {
    return this.service.adminSetStatus(id, "block", dto.reason, req.user);
  }

  @Post(":id/unblock")
  unblock(@Req() req: R, @Param("id") id: string) {
    return this.service.adminSetStatus(id, "unblock", undefined, req.user);
  }
}
