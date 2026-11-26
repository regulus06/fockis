/**
 * event-registrations.controller.ts
 * -----------------------------------------------------------------------------
 * Event registration API (under the existing /events prefix):
 *
 *   GET    /events/:eventId/registration-settings    page data (guests: public events)
 *   POST   /events/:eventId/register                 register (rate limited)
 *   GET    /events/:eventId/join                     meeting link, when authorized
 *
 *   GET    /events/registrations/my                  my registrations
 *   GET    /events/registrations/:id                 one registration (owner, guest key, staff)
 *   GET    /events/registrations/:id/admission       live entry QR (ticket holder only, short-lived)
 *   POST   /events/registrations/:id/cancel          cancel my registration
 *   POST   /events/registrations/:id/payment         resume payment (client secret)
 *   POST   /events/registrations/:id/confirm-payment verify payment and confirm
 *
 *   GET    /events/:eventId/registrations            organizer table + stats
 *   GET    /events/:eventId/registrations/export     ?format=csv|xlsx
 *   PATCH  /events/registrations/:id/status          approve | reject | cancel | promote
 *   POST   /events/:eventId/check-in                 QR / manual check-in
 *
 * All permission checks happen in EventRegistrationsService.
 * -----------------------------------------------------------------------------
 */

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";

import { Public } from "../../auth/public.decorator";
import { OptionalJwtAuthGuard } from "../../auth/optional-jwt-auth.guard";
import {
  CancelRegistrationDto,
  CheckInDto,
  ConfirmRegistrationPaymentDto,
  RegisterForEventDto,
  RegistrationStatusDto,
} from "./event-registration.dto";
import { EventRegistrationsService } from "./event-registrations.service";

type AuthUser = { id?: string; _id?: string; userId?: string; sub?: string } | undefined;

function optionalUserId(req: Request): string | undefined {
  const u = (req as Request & { user?: AuthUser }).user;
  const id = u?.id ?? u?._id ?? u?.userId ?? u?.sub;
  return id ? String(id) : undefined;
}

function userId(req: Request): string {
  const id = optionalUserId(req);
  if (!id) throw new UnauthorizedException("Please sign in.");
  return id;
}

@Controller("events")
export class EventRegistrationsController {
  constructor(private readonly registrations: EventRegistrationsService) {}

  /* ------------------------------------------------------------ registrant */

  @Get("registrations/my")
  @Header("Cache-Control", "no-store")
  mine(@Req() req: Request) {
    return this.registrations.mine(userId(req));
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get("registrations/:registrationId")
  @Header("Cache-Control", "no-store")
  one(@Param("registrationId") id: string, @Req() req: Request, @Query("key") key?: string) {
    return this.registrations.getOne(id, optionalUserId(req), key);
  }

  /** Live admission code: holder only; refreshed by the ticket page every few seconds. */
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({ default: { limit: 90, ttl: 60_000 } })
  @Get("registrations/:registrationId/admission")
  @Header("Cache-Control", "no-store")
  admission(@Param("registrationId") id: string, @Req() req: Request, @Query("key") key?: string) {
    return this.registrations.admission(id, optionalUserId(req), key);
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Post("registrations/:registrationId/cancel")
  cancel(@Param("registrationId") id: string, @Req() req: Request, @Body() body: CancelRegistrationDto, @Query("key") key?: string) {
    return this.registrations.cancelOwn(id, optionalUserId(req), key, body);
  }

  @Post("registrations/:registrationId/payment")
  resumePayment(@Param("registrationId") id: string, @Req() req: Request, @Body() body: { country?: string }) {
    return this.registrations.resumePayment(id, userId(req), typeof body?.country === "string" ? body.country : undefined);
  }

  @Post("registrations/:registrationId/confirm-payment")
  confirmPayment(@Param("registrationId") id: string, @Req() req: Request, @Body() body: ConfirmRegistrationPaymentDto) {
    return this.registrations.confirmPayment(id, userId(req), body.paymentIntentId);
  }

  @Patch("registrations/:registrationId/status")
  setStatus(@Param("registrationId") id: string, @Req() req: Request, @Body() body: RegistrationStatusDto) {
    return this.registrations.setStatus(id, userId(req), body);
  }

  /* ------------------------------------------------------------ event-level */

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get(":eventId/registration-settings")
  @Header("Cache-Control", "no-store")
  settings(@Param("eventId") eventId: string, @Req() req: Request) {
    return this.registrations.getSettings(eventId, optionalUserId(req));
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  @Post(":eventId/register")
  register(@Param("eventId") eventId: string, @Req() req: Request, @Body() body: RegisterForEventDto) {
    return this.registrations.register(eventId, optionalUserId(req), body);
  }

  @Get(":eventId/join")
  @Header("Cache-Control", "no-store")
  join(@Param("eventId") eventId: string, @Req() req: Request) {
    return this.registrations.join(eventId, userId(req));
  }

  @Get(":eventId/registrations")
  @Header("Cache-Control", "no-store")
  list(
    @Param("eventId") eventId: string,
    @Req() req: Request,
    @Query("q") q?: string,
    @Query("status") status?: string,
    @Query("payment") payment?: string,
    @Query("attendance") attendance?: string,
    @Query("ticket") ticket?: string,
    @Query("sort") sort?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.registrations.organizerList(eventId, userId(req), { q, status, payment, attendance, ticket, sort, page: Number(page) || 1, limit: Number(limit) || 50 });
  }

  @Get(":eventId/registrations/export")
  async export(
    @Param("eventId") eventId: string,
    @Req() req: Request,
    @Res() res: Response,
    @Query("format") format?: string,
    @Query("q") q?: string,
    @Query("status") status?: string,
    @Query("payment") payment?: string,
    @Query("attendance") attendance?: string,
    @Query("ticket") ticket?: string,
    @Query("sort") sort?: string,
  ) {
    if (format && format !== "csv" && format !== "xlsx") throw new BadRequestException("format must be csv or xlsx.");
    const file = await this.registrations.export(eventId, userId(req), format === "xlsx" ? "xlsx" : "csv", { q, status, payment, attendance, ticket, sort });
    res.setHeader("Content-Type", file.contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);
    res.setHeader("Cache-Control", "no-store");
    res.send(file.body);
  }

  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Post(":eventId/check-in")
  checkIn(@Param("eventId") eventId: string, @Req() req: Request, @Body() body: CheckInDto) {
    return this.registrations.checkIn(eventId, userId(req), body);
  }
}
