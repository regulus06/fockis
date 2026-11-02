import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";

import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { Public } from "../../auth/public.decorator";
import { CallDeviceDto, PushCallActionDto, RegisterDeviceDto, StartCallDto } from "./calls.dto";
import { CallsService } from "./calls.service";

function userIdOf(req: Request): string {
  const user = (req as any).user ?? {};
  return String(user.id || user.userId || user.sub || "");
}

/**
 * Voice/video calls over REST (the apps and push flows use these; the web
 * client may also use the matching Socket.IO events, which call the same
 * service).
 */
@Controller("calls")
@UseGuards(JwtAuthGuard)
export class CallsController {
  constructor(private readonly calls: CallsService) {}

  @Post()
  start(@Req() req: Request, @Body() dto: StartCallDto) {
    return this.calls.start(userIdOf(req), dto.receiverId, dto.type, dto.deviceId ?? "");
  }

  @Get("history")
  history(@Req() req: Request, @Query("filter") filter?: string, @Query("before") before?: string, @Query("limit") limit?: string) {
    return this.calls.history(userIdOf(req), { filter, before, limit: Number(limit) || undefined });
  }

  @Get("missed-count")
  missedCount(@Req() req: Request) {
    return this.calls.missedCount(userIdOf(req));
  }

  @Post("missed/seen")
  markMissedSeen(@Req() req: Request) {
    return this.calls.markMissedSeen(userIdOf(req));
  }

  @Get("pending")
  pending(@Req() req: Request) {
    return this.calls.pending(userIdOf(req));
  }

  @Get(":callId")
  get(@Req() req: Request, @Param("callId") callId: string) {
    return this.calls.get(userIdOf(req), callId);
  }

  @Post(":callId/accept")
  accept(@Req() req: Request, @Param("callId") callId: string, @Body() dto: CallDeviceDto) {
    return this.calls.accept(userIdOf(req), callId, dto?.deviceId ?? "");
  }

  @Post(":callId/decline")
  decline(@Req() req: Request, @Param("callId") callId: string) {
    return this.calls.decline(userIdOf(req), callId);
  }

  @Post(":callId/end")
  end(@Req() req: Request, @Param("callId") callId: string) {
    return this.calls.end(userIdOf(req), callId);
  }

  /** Decline from the phone's call notification / CallKit (signed per-call token, no login). */
  @Public()
  @Post(":callId/push-decline")
  pushDecline(@Param("callId") callId: string, @Body() dto: PushCallActionDto) {
    return this.calls.declineFromPush(callId, dto.token);
  }

  /** A ringing phone checks whether the call is still ringing (signed per-call token). */
  @Public()
  @Post(":callId/push-status")
  pushStatus(@Param("callId") callId: string, @Body() dto: PushCallActionDto) {
    return this.calls.statusFromPush(callId, dto.token);
  }

  @Post(":callId/token")
  token(@Req() req: Request, @Param("callId") callId: string) {
    return this.calls.mediaToken(userIdOf(req), callId);
  }
}

/** Phones register their push tokens here so calls can ring them. */
@Controller("devices")
@UseGuards(JwtAuthGuard)
export class DevicesController {
  constructor(private readonly calls: CallsService) {}

  @Post("register")
  register(@Req() req: Request, @Body() dto: RegisterDeviceDto) {
    return this.calls.registerDevice(userIdOf(req), dto);
  }

  @Get()
  list(@Req() req: Request) {
    return this.calls.listDevices(userIdOf(req));
  }

  @Delete(":deviceId")
  remove(@Req() req: Request, @Param("deviceId") deviceId: string) {
    return this.calls.removeDevice(userIdOf(req), deviceId);
  }
}
