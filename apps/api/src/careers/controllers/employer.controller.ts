import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UnauthorizedException,
} from "@nestjs/common";

import type { Request } from "express";

import { EmployerActor, EmployerService } from "../services/employer.service";

import {
  AddApplicantNoteDto,
  InterviewFeedbackDto,
  InviteTeamMemberDto,
  RescheduleInterviewDto,
  ScheduleInterviewDto,
  SetJobActiveDto,
  SubmitVerificationDto,
  UpdateCompanyProfileDto,
  UpdateEmployerSettingsDto,
  UpdateTeamMemberDto,
  UpgradeRequestDto,
} from "../dto/employer.dto";

type AuthenticatedRequest = Request & {
  user?: {
    id?: string;
    _id?: string;
    userId?: string;
    sub?: string;
    email?: string;
    username?: string;
  };
};

/**
 * EMPLOYER CENTER API
 *
 * Authentication comes from the global JwtAuthGuard.
 * Every query is scoped to the employer account resolved from the JWT.
 *
 * Job create / edit / delete stay on the existing endpoints:
 *   POST /careers, PATCH /careers/:id, DELETE /careers/:id
 * Application status changes stay on:
 *   PATCH /careers/applications/:id/status
 */
@Controller("employer")
export class EmployerController {
  constructor(private readonly employerService: EmployerService) {}

  /* ---------------- account ---------------- */

  @Get("me")
  me(@Req() req: AuthenticatedRequest) {
    return this.employerService.getMe(this.actor(req));
  }

  @Post("invitations/:companyId/accept")
  acceptInvitation(@Req() req: AuthenticatedRequest, @Param("companyId") companyId: string) {
    return this.employerService.acceptInvitation(this.actor(req), companyId);
  }

  /* ---------------- dashboard ---------------- */

  @Get("dashboard")
  dashboard(@Req() req: AuthenticatedRequest, @Query("days") days?: string) {
    return this.employerService.getDashboard(this.actor(req), Number(days ?? 30));
  }

  /* ---------------- jobs ---------------- */

  @Get("jobs")
  listJobs(
    @Req() req: AuthenticatedRequest,
    @Query("search") search?: string,
    @Query("type") type?: string,
    @Query("status") status?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.employerService.listJobs(this.actor(req), {
      search,
      type,
      status,
      page: Number(page ?? 1),
      limit: Number(limit ?? 10),
    });
  }

  @Get("jobs/:id")
  getJob(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.employerService.getJob(this.actor(req), id);
  }

  @Patch("jobs/:id/status")
  setJobActive(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() dto: SetJobActiveDto) {
    return this.employerService.setJobActive(this.actor(req), id, dto.isActive);
  }

  /* ---------------- applicants ---------------- */

  @Get("applicants")
  listApplicants(
    @Req() req: AuthenticatedRequest,
    @Query("search") search?: string,
    @Query("jobId") jobId?: string,
    @Query("status") status?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.employerService.listApplicants(this.actor(req), {
      search,
      jobId,
      status,
      page: Number(page ?? 1),
      limit: Number(limit ?? 10),
    });
  }

  @Get("applicants/:id")
  getApplicant(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.employerService.getApplicant(this.actor(req), id);
  }

  @Post("applicants/:id/notes")
  addNote(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() dto: AddApplicantNoteDto) {
    return this.employerService.addApplicantNote(this.actor(req), id, dto.body);
  }

  /* ---------------- candidates ---------------- */

  @Get("candidates")
  listCandidates(
    @Req() req: AuthenticatedRequest,
    @Query("search") search?: string,
    @Query("location") location?: string,
    @Query("experience") experience?: string,
    @Query("education") education?: string,
    @Query("availability") availability?: string,
    @Query("saved") saved?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.employerService.listCandidates(this.actor(req), {
      search,
      location,
      experience,
      education,
      availability,
      saved,
      page: Number(page ?? 1),
      limit: Number(limit ?? 12),
    });
  }

  @Post("candidates/:userId/save")
  saveCandidate(@Req() req: AuthenticatedRequest, @Param("userId") userId: string) {
    return this.employerService.setCandidateSaved(this.actor(req), userId, true);
  }

  @Delete("candidates/:userId/save")
  unsaveCandidate(@Req() req: AuthenticatedRequest, @Param("userId") userId: string) {
    return this.employerService.setCandidateSaved(this.actor(req), userId, false);
  }

  /* ---------------- interviews ---------------- */

  @Get("interviews")
  listInterviews(@Req() req: AuthenticatedRequest, @Query("view") view?: string) {
    return this.employerService.listInterviews(this.actor(req), { view });
  }

  @Post("interviews")
  scheduleInterview(@Req() req: AuthenticatedRequest, @Body() dto: ScheduleInterviewDto) {
    return this.employerService.scheduleInterview(this.actor(req), dto);
  }

  @Patch("interviews/:id")
  rescheduleInterview(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() dto: RescheduleInterviewDto,
  ) {
    return this.employerService.rescheduleInterview(this.actor(req), id, dto);
  }

  @Patch("interviews/:id/cancel")
  cancelInterview(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.employerService.cancelInterview(this.actor(req), id);
  }

  @Patch("interviews/:id/feedback")
  interviewFeedback(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() dto: InterviewFeedbackDto,
  ) {
    return this.employerService.submitInterviewFeedback(this.actor(req), id, dto);
  }

  /* ---------------- company ---------------- */

  @Get("profile")
  getProfile(@Req() req: AuthenticatedRequest) {
    return this.employerService.getProfile(this.actor(req));
  }

  @Put("profile")
  updateProfile(@Req() req: AuthenticatedRequest, @Body() dto: UpdateCompanyProfileDto) {
    return this.employerService.updateProfile(this.actor(req), dto);
  }

  @Get("verification")
  getVerification(@Req() req: AuthenticatedRequest) {
    return this.employerService.getVerification(this.actor(req));
  }

  @Post("verification")
  submitVerification(@Req() req: AuthenticatedRequest, @Body() dto: SubmitVerificationDto) {
    return this.employerService.submitVerification(this.actor(req), dto);
  }

  /* ---------------- team ---------------- */

  @Get("team")
  getTeam(@Req() req: AuthenticatedRequest) {
    return this.employerService.getTeam(this.actor(req));
  }

  @Post("team")
  inviteMember(@Req() req: AuthenticatedRequest, @Body() dto: InviteTeamMemberDto) {
    return this.employerService.inviteTeamMember(this.actor(req), dto);
  }

  @Patch("team/:memberId")
  updateMember(
    @Req() req: AuthenticatedRequest,
    @Param("memberId") memberId: string,
    @Body() dto: UpdateTeamMemberDto,
  ) {
    return this.employerService.updateTeamMember(this.actor(req), memberId, dto);
  }

  @Delete("team/:memberId")
  removeMember(@Req() req: AuthenticatedRequest, @Param("memberId") memberId: string) {
    return this.employerService.removeTeamMember(this.actor(req), memberId);
  }

  /* ---------------- analytics ---------------- */

  @Get("analytics")
  analytics(@Req() req: AuthenticatedRequest, @Query("from") from?: string, @Query("to") to?: string) {
    return this.employerService.getAnalytics(this.actor(req), { from, to });
  }

  /* ---------------- billing ---------------- */

  @Get("billing")
  billing(@Req() req: AuthenticatedRequest) {
    return this.employerService.getBilling(this.actor(req));
  }

  @Post("billing/upgrade-requests")
  requestUpgrade(@Req() req: AuthenticatedRequest, @Body() dto: UpgradeRequestDto) {
    return this.employerService.requestUpgrade(this.actor(req), dto);
  }

  @Delete("billing/upgrade-requests/pending")
  cancelUpgrade(@Req() req: AuthenticatedRequest) {
    return this.employerService.cancelUpgradeRequest(this.actor(req));
  }

  /* ---------------- settings ---------------- */

  @Get("settings")
  settings(@Req() req: AuthenticatedRequest) {
    return this.employerService.getSettings(this.actor(req));
  }

  @Put("settings")
  updateSettings(@Req() req: AuthenticatedRequest, @Body() dto: UpdateEmployerSettingsDto) {
    return this.employerService.updateSettings(this.actor(req), dto);
  }

  /* ---------------- helpers ---------------- */

  private actor(req: AuthenticatedRequest): EmployerActor {
    const user = req.user;
    const id = user?.id ?? user?._id ?? user?.userId ?? user?.sub;

    if (typeof id !== "string" || !id.trim()) {
      throw new UnauthorizedException("You must be logged in to use the Employer Center.");
    }

    return {
      userId: id.trim(),
      email: typeof user?.email === "string" ? user.email : undefined,
      username: typeof user?.username === "string" ? user.username : undefined,
    };
  }
}
