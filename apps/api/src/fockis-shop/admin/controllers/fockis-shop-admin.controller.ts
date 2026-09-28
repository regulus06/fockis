import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { FockisShopAdminService } from "../services/fockis-shop-admin.service";
import { ModerationActionDto } from "../dto/moderation-action.dto";
import { RbacGuard } from "../../../admin/rbac/rbac.guard";
import { SuperAdminGuard } from "../../../admin/safety/super-admin.guard";
import { Roles } from "../../../admin/rbac/roles.decorator";
import { Role } from "../../../admin/rbac/roles.enum";

@Controller("admin/shop")
@UseGuards(RbacGuard, SuperAdminGuard)
@Roles(Role.SUPER_ADMIN)
export class FockisShopAdminController {
  constructor(private readonly service: FockisShopAdminService) {}

  @Get("dashboard") dashboard() { return this.service.dashboard(); }
  @Get("products") products(@Query() q: any) { return this.service.products(q); }
  @Post("products/:id/action") productAction(@Param("id") id: string, @Body() dto: ModerationActionDto) { return this.service.productAction(id, dto.action, dto.reason); }
  @Get("sellers") sellers(@Query("status") status?: string) { return this.service.sellers(status); }
  @Post("sellers/:id/action") sellerAction(@Param("id") id: string, @Body() dto: ModerationActionDto) { return this.service.sellerAction(id, dto.action); }
  @Get("stores") stores(@Query("status") status?: string) { return this.service.stores(status); }
  @Post("stores/:id/action") storeAction(@Param("id") id: string, @Body() dto: ModerationActionDto) { return this.service.storeAction(id, dto.action); }
}
