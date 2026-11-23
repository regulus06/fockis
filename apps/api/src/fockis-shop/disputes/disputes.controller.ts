import { Body, Controller, Get, Param, Post, Query, Req } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";

import { Permissions } from "../../admin/rbac/permissions.decorator";
import { Permission } from "../../admin/rbac/permissions.enum";
import { DisputesService } from "./disputes.service";
import { DisputeListQueryDto, OpenDisputeDto, ReviewDisputeDto } from "./disputes.dto";

function userIdOf(req: any): string {
  return String(req?.user?.id ?? req?.user?.userId ?? req?.user?._id ?? "");
}

/** Buyer routes (signed-in users, own orders only). */
@Controller("disputes")
export class DisputesController {
  constructor(private readonly disputes: DisputesService) {}

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post()
  open(@Req() req: any, @Body() body: OpenDisputeDto) {
    return this.disputes.open(userIdOf(req), body);
  }

  @Get("mine")
  mine(@Req() req: any) {
    return this.disputes.mine(userIdOf(req));
  }
}

/** Marketplace staff. */
@Controller("admin/marketplace/disputes")
@Permissions(Permission.MARKETPLACE_ORDERS_VIEW)
export class AdminDisputesController {
  constructor(private readonly disputes: DisputesService) {}

  @Get()
  list(@Query() query: DisputeListQueryDto) {
    return this.disputes.list(query);
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.disputes.get(id);
  }

  @Post(":id/review")
  @Permissions(Permission.MARKETPLACE_ORDERS_VIEW, Permission.MARKETPLACE_ORDERS_MANAGE)
  review(@Param("id") id: string, @Body() body: ReviewDisputeDto, @Req() req: any) {
    const actor = {
      id: userIdOf(req),
      name: String(req?.user?.username || req?.user?.email || "Administrator"),
    };

    return this.disputes.review(id, body.action, actor, body.note ?? "");
  }
}
