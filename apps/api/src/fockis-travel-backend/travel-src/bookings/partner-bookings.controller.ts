import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";

import {
  ApiBearerAuth,
  ApiTags,
} from "@nestjs/swagger";

import { JwtAuthGuard } from "../common/auth.guard";
import { BookingsService } from "./bookings.service";

@ApiTags("travel partner bookings")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("travel/partner/bookings")
export class PartnerBookingsController {
  constructor(
    private readonly service: BookingsService,
  ) {}

  // ==========================================================================
  // TEMPORARY DEBUG ENDPOINT — REMOVE AFTER DIAGNOSIS
  // GET /travel/partner/bookings/debug/diagnose
  // Placed BEFORE the ":id" route so it isn't shadowed.
  // ==========================================================================
  @Get("debug/diagnose")
  debugDiagnose(@Req() req: any) {
    return this.service.debugDiagnose(
      this.getUserId(req),
    );
  }

  @Get()
  list(@Req() req: any) {
    return this.service.listOwnerBookings(
      this.getUserId(req),
    );
  }

  @Get(":id")
  one(
    @Req() req: any,
    @Param("id") id: string,
  ) {
    return this.service.getOwnerBooking(
      this.getUserId(req),
      id,
    );
  }

  @Patch(":id/status")
  updateStatus(
    @Req() req: any,
    @Param("id") id: string,
    @Body("status") status: string,
  ) {
    return this.service.updateOwnerBookingStatus(
      this.getUserId(req),
      id,
      status,
    );
  }

  private getUserId(req: any): string {
    const user = req?.user ?? {};

    const userId =
      user.sub ??
      user.id ??
      user._id ??
      user.userId;

    if (!userId) {
      throw new UnauthorizedException(
        "Authenticated user ID is missing.",
      );
    }

    return String(userId);
  }
}