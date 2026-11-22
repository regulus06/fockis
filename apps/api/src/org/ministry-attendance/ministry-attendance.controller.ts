/**
 * ministry-attendance.controller.ts
 * -----------------------------------------------------------------------------
 * Ministry attendance API (signed-in users; the global JwtAuthGuard applies).
 * Base: /church/organizations/:organizationId/ministries/:ministryId/attendance
 *
 *   GET    /access                         what the viewer may do
 *   GET    /dashboard?date=&trend=          dashboard for a local date
 *   GET    /sessions?status=&from=&to=&search=&page=&pageSize=
 *   POST   /sessions                        one-time session (not on schedule)
 *   GET    /sessions/:sessionId             full record of ONE meeting date
 *   POST   /sessions/:sessionId/records     manual / bulk / correction
 *   POST   /sessions/:sessionId/finalize
 *   POST   /sessions/:sessionId/reopen
 *   POST   /sessions/:sessionId/cancel
 *   POST   /sessions/:sessionId/restore
 *   POST   /sessions/:sessionId/window      open / close check-in now
 *   GET    /sessions/:sessionId/qr          QR token (managers)
 *   GET    /sessions/:sessionId/check-in    what a member sees before checking in
 *   POST   /sessions/:sessionId/check-in    member QR / self check-in
 *   GET    /members/:membershipId           member history ("me" for yourself)
 *   GET    /report?from=&to=
 *   GET    /export.csv?sessionId= | from=&to=
 *   PATCH  /settings
 * -----------------------------------------------------------------------------
 */

import { Body, Controller, Get, Param, Patch, Post, Query, Req, Res, UnauthorizedException } from "@nestjs/common";
import type { Request, Response } from "express";

import {
  AttendanceSettingsBodyDto,
  CheckInBodyDto,
  CreateSessionBodyDto,
  FinalizeBodyDto,
  ReasonBodyDto,
  RecordAttendanceBodyDto,
  WindowBodyDto,
} from "./ministry-attendance.dto";
import { MinistryAttendanceService } from "./ministry-attendance.service";

function userIdOf(req: Request): string {
  const user = req.user as { id?: string; _id?: string; userId?: string } | undefined;
  const id = user?.id ?? user?.userId ?? user?._id;
  if (!id || String(id).trim() === "") throw new UnauthorizedException("Please sign in.");
  return String(id);
}

@Controller("organizations/:organizationId/ministries/:ministryId/attendance")
export class MinistryAttendanceController {
  constructor(private readonly attendance: MinistryAttendanceService) {}

  @Get("access")
  access(@Param("organizationId") o: string, @Param("ministryId") m: string, @Req() req: Request) {
    return this.attendance.access(o, m, userIdOf(req));
  }

  @Get("dashboard")
  dashboard(@Param("organizationId") o: string, @Param("ministryId") m: string, @Req() req: Request, @Query("date") date?: string, @Query("trend") trend?: string) {
    return this.attendance.dashboard(o, m, userIdOf(req), { date, trend });
  }

  @Get("sessions")
  sessions(
    @Param("organizationId") o: string,
    @Param("ministryId") m: string,
    @Req() req: Request,
    @Query("status") status?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.attendance.listSessions(o, m, userIdOf(req), { status, from, to, search, page: Number(page) || 1, pageSize: Number(pageSize) || 20 });
  }

  @Post("sessions")
  createSession(@Param("organizationId") o: string, @Param("ministryId") m: string, @Req() req: Request, @Body() body: CreateSessionBodyDto) {
    return this.attendance.createManualSession(o, m, userIdOf(req), body);
  }

  @Get("sessions/:sessionId")
  session(@Param("organizationId") o: string, @Param("ministryId") m: string, @Param("sessionId") s: string, @Req() req: Request) {
    return this.attendance.sessionDetail(o, m, userIdOf(req), s);
  }

  @Post("sessions/:sessionId/records")
  record(@Param("organizationId") o: string, @Param("ministryId") m: string, @Param("sessionId") s: string, @Req() req: Request, @Body() body: RecordAttendanceBodyDto) {
    return this.attendance.record(o, m, userIdOf(req), s, body);
  }

  @Post("sessions/:sessionId/finalize")
  finalize(@Param("organizationId") o: string, @Param("ministryId") m: string, @Param("sessionId") s: string, @Req() req: Request, @Body() body: FinalizeBodyDto) {
    return this.attendance.finalize(o, m, userIdOf(req), s, body.unrecorded);
  }

  @Post("sessions/:sessionId/reopen")
  reopen(@Param("organizationId") o: string, @Param("ministryId") m: string, @Param("sessionId") s: string, @Req() req: Request, @Body() body: ReasonBodyDto) {
    return this.attendance.reopen(o, m, userIdOf(req), s, body.reason ?? "");
  }

  @Post("sessions/:sessionId/cancel")
  cancel(@Param("organizationId") o: string, @Param("ministryId") m: string, @Param("sessionId") s: string, @Req() req: Request, @Body() body: ReasonBodyDto) {
    return this.attendance.cancel(o, m, userIdOf(req), s, body.reason ?? "");
  }

  @Post("sessions/:sessionId/restore")
  restore(@Param("organizationId") o: string, @Param("ministryId") m: string, @Param("sessionId") s: string, @Req() req: Request) {
    return this.attendance.restore(o, m, userIdOf(req), s);
  }

  @Post("sessions/:sessionId/window")
  window(@Param("organizationId") o: string, @Param("ministryId") m: string, @Param("sessionId") s: string, @Req() req: Request, @Body() body: WindowBodyDto) {
    return this.attendance.setWindow(o, m, userIdOf(req), s, body.action);
  }

  @Get("sessions/:sessionId/qr")
  qr(@Param("organizationId") o: string, @Param("ministryId") m: string, @Param("sessionId") s: string, @Req() req: Request) {
    return this.attendance.qr(o, m, userIdOf(req), s);
  }

  @Get("sessions/:sessionId/check-in")
  checkInInfo(@Param("organizationId") o: string, @Param("ministryId") m: string, @Param("sessionId") s: string, @Req() req: Request) {
    return this.attendance.checkInInfo(o, m, userIdOf(req), s);
  }

  @Post("sessions/:sessionId/check-in")
  checkIn(@Param("organizationId") o: string, @Param("ministryId") m: string, @Param("sessionId") s: string, @Req() req: Request, @Body() body: CheckInBodyDto) {
    return this.attendance.checkIn(o, m, userIdOf(req), s, body.token);
  }

  @Get("members/:membershipId")
  member(@Param("organizationId") o: string, @Param("ministryId") m: string, @Param("membershipId") id: string, @Req() req: Request) {
    return this.attendance.memberHistory(o, m, userIdOf(req), id === "me" ? "me" : id);
  }

  @Get("report")
  report(@Param("organizationId") o: string, @Param("ministryId") m: string, @Req() req: Request, @Query("from") from?: string, @Query("to") to?: string) {
    return this.attendance.report(o, m, userIdOf(req), { from, to });
  }

  @Get("export.csv")
  async export(
    @Param("organizationId") o: string,
    @Param("ministryId") m: string,
    @Req() req: Request,
    @Res() res: Response,
    @Query("sessionId") sessionId?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    const { filename, csv } = await this.attendance.exportCsv(o, m, userIdOf(req), { sessionId, from, to });
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
  }

  @Patch("settings")
  settings(@Param("organizationId") o: string, @Param("ministryId") m: string, @Req() req: Request, @Body() body: AttendanceSettingsBodyDto) {
    return this.attendance.updateSettings(o, m, userIdOf(req), body);
  }
}
