import {
  Controller,
  Get,
  UseGuards,
} from "@nestjs/common";

import { JwtAuthGuard } from "../auth/jwt-auth.guard";


@Controller("admin/marketplace")
@UseGuards(JwtAuthGuard)
export class MarketplaceAdminController {


  @Get("dashboard")
  getDashboard(){

    return {
      totalProducts: 0,
      totalStores: 0,
      totalOrders: 0,
      totalRevenue: 0,
    };

  }


}