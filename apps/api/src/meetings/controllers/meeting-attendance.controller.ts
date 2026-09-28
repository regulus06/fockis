import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
} from "@nestjs/common";

import type { Request } from "express";

import {
  MeetingAttendanceService,
} from "../services/meeting-attendance.service";

@Controller("meetings")
export class MeetingAttendanceController {
  constructor(
    private readonly attendanceService: MeetingAttendanceService,
  ) {}

  // ==========================================================================
  // GET ATTENDANCE
  // GET /meetings/:meetingId/attendance
  // ==========================================================================

  @Get(":meetingId/attendance")
  getAttendance(
    @Req() req: Request,
    @Param("meetingId") meetingId: string,
  ) {
    const user = (req as any).user;

    const userId =
      user?.id ||
      user?.userId ||
      user?.sub;

    return this.attendanceService.getAttendance(
      meetingId,
      userId,
    );
  }

  // ==========================================================================
  // MARK USER AS JOINED
  // POST /meetings/:meetingId/attendance/join
  // ==========================================================================

  @Post(":meetingId/attendance/join")
  join(
    @Req() req: Request,
    @Param("meetingId") meetingId: string,
  ) {
    const user = (req as any).user;

    const userId =
      user?.id ||
      user?.userId ||
      user?.sub;

    const displayName =
      user?.username ||
      user?.displayName ||
      "Fockis User";

    return this.attendanceService.markJoined(
      meetingId,
      userId,
      displayName,
    );
  }

  // ==========================================================================
  // MARK USER AS LEFT
  // POST /meetings/:meetingId/attendance/leave
  // ==========================================================================

  @Post(":meetingId/attendance/leave")
  leave(
    @Req() req: Request,
    @Param("meetingId") meetingId: string,
  ) {
    const user = (req as any).user;

    const userId =
      user?.id ||
      user?.userId ||
      user?.sub;

    return this.attendanceService.markLeft(
      meetingId,
      userId,
    );
  }

  // ==========================================================================
  // SUBMIT LATE NOTICE
  // POST /meetings/:meetingId/attendance/late
  // ==========================================================================

  @Post(":meetingId/attendance/late")
  late(
    @Req() req: Request,
    @Param("meetingId") meetingId: string,
    @Body()
    body: {
      minutes: number;
      message: string;
    },
  ) {
    const user = (req as any).user;

    const userId =
      user?.id ||
      user?.userId ||
      user?.sub;

    return this.attendanceService.submitLateNotice(
      meetingId,
      userId,
      body.minutes,
      body.message,
    );
  }
}