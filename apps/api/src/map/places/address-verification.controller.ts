import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";

import { Permissions } from "../../admin/rbac/permissions.decorator";
import { Permission } from "../../admin/rbac/permissions.enum";
import { RbacGuard } from "../../admin/rbac/rbac.guard";
import type { Actor } from "../../reports/utils/actor";
import { AddressVerificationService } from "./address-verification.service";
import { ReviewAddressDto } from "./places.dto";

/**
 * Admin queue for Smart Addresses people add.
 *
 *   GET  /admin/map/addresses?status=pending|verified|needs_info|rejected&q=&country=&page=
 *   GET  /admin/map/addresses/counts
 *   GET  /admin/map/addresses/:id
 *   POST /admin/map/addresses/:id/review   { action: verify|needs_info|reject, note }
 */
@Controller("admin/map/addresses")
@UseGuards(RbacGuard)
export class AddressVerificationController {
  constructor(private readonly verification: AddressVerificationService) {}

  @Get()
  @Permissions(Permission.MAP_ADDRESSES_VIEW)
  list(@Query() query: { status?: string; q?: string; country?: string; page?: string }) {
    return this.verification.list(query);
  }

  @Get("counts")
  @Permissions(Permission.MAP_ADDRESSES_VIEW)
  counts() {
    return this.verification.counts();
  }

  @Get(":id")
  @Permissions(Permission.MAP_ADDRESSES_VIEW)
  detail(@Param("id") id: string) {
    return this.verification.detail(id);
  }

  @Post(":id/review")
  @Permissions(Permission.MAP_ADDRESSES_VERIFY)
  review(@Req() req: { user: Actor }, @Param("id") id: string, @Body() dto: ReviewAddressDto) {
    return this.verification.decide(req.user, id, dto.action, dto.note);
  }
}
