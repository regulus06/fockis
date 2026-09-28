import {
Body,
Controller,
Delete,
Get,
Param,
Patch,
Post,
Req,
UnauthorizedException,
UseGuards,
} from "@nestjs/common";

import {
ApiBearerAuth,
ApiOperation,
ApiTags,
} from "@nestjs/swagger";

import { JwtAuthGuard } from "../common/auth.guard";

import { CreateBookingDto } from "./dto";

import { BookingsService } from "./bookings.service";

@ApiTags("bookings")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("travel/bookings")
export class BookingsController {
constructor(
private readonly service: BookingsService,
) {}

// ==========================================================================
// AUTHENTICATED USER ID
// ==========================================================================

private getUserId(request: any): string {
const user = request?.user ?? {};

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

// ==========================================================================
// CUSTOMER BOOKINGS
// ==========================================================================

@Post()
@ApiOperation({
summary: "Create a Travel booking",
})
create(
@Req() request: any,
@Body() dto: CreateBookingDto,
) {
return this.service.create(
this.getUserId(request),
dto,
);
}

@Get()
@ApiOperation({
summary: "Get bookings belonging to the authenticated customer",
})
mine(
@Req() request: any,
) {
return this.service.listMine(
this.getUserId(request),
);
}

@Get(":id")
@ApiOperation({
summary: "Get one customer booking",
})
one(
@Req() request: any,
@Param("id") id: string,
) {
return this.service.getOne(
this.getUserId(request),
id,
);
}

@Delete(":id")
@ApiOperation({
summary: "Cancel a customer booking",
})
cancel(
@Req() request: any,
@Param("id") id: string,
) {
return this.service.cancel(
this.getUserId(request),
id,
);
}
}

// ============================================================================
// PARTNER RESERVATION CONTROLLER
// ============================================================================
//
// Partner reservation management intentionally uses:
//
// /travel/partner/bookings
//
// This matches the frontend bookingsApi.ts:
//
// GET /travel/partner/bookings
// GET /travel/partner/bookings/:id
// PATCH /travel/partner/bookings/:id/status
//
// The service verifies that the authenticated user actually owns the listing
// associated with every reservation.
// ============================================================================

@ApiTags("travel-partner-bookings")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("travel/partner/bookings")
export class PartnerBookingsController {
constructor(
private readonly service: BookingsService,
) {}

// ==========================================================================
// AUTHENTICATED PARTNER ID
// ==========================================================================

private getUserId(request: any): string {
const user = request?.user ?? {};

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

// ==========================================================================
// LIST PARTNER RESERVATIONS
// ==========================================================================
//
// GET /travel/partner/bookings
//
// Returns every reservation belonging to listings owned by the authenticated
// Travel partner.
// ==========================================================================

@Get()
@ApiOperation({
summary:
"Get reservations for listings owned by the authenticated Travel partner",
})
list(
@Req() request: any,
) {
return this.service.listOwnerBookings(
this.getUserId(request),
);
}

// ==========================================================================
// GET ONE PARTNER RESERVATION
// ==========================================================================
//
// GET /travel/partner/bookings/:id
//
// The service performs the ownership check.
// ==========================================================================

@Get(":id")
@ApiOperation({
summary:
"Get one reservation belonging to the authenticated Travel partner",
})
one(
@Req() request: any,
@Param("id") id: string,
) {
return this.service.getOwnerBooking(
this.getUserId(request),
id,
);
}

// ==========================================================================
// UPDATE RESERVATION STATUS
// ==========================================================================
//
// PATCH /travel/partner/bookings/:id/status
//
// Expected body:
//
// {
// "status": "confirmed"
// }
//
// Allowed statuses are enforced by BookingsService:
//
// confirmed
// cancelled
// completed
// ==========================================================================

@Patch(":id/status")
@ApiOperation({
summary:
"Update the status of a Travel partner reservation",
})
updateStatus(
@Req() request: any,
@Param("id") id: string,
@Body() body: { status: string },
) {
return this.service.updateOwnerBookingStatus(
this.getUserId(request),
id,
body?.status,
);
}
}