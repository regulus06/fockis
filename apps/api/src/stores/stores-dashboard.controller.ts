import {
  Controller,
  Get,
  UseGuards,
  Req,
} from "@nestjs/common";

import {
  JwtAuthGuard,
} from "../auth/jwt-auth.guard";

import {
  StoresDashboardService,
} from "./stores-dashboard.service";


function getUserId(
  req: any
): string {

  return (
    req.user?.id ||
    req.user?.userId ||
    req.user?.sub
  );

}


@Controller("store-dashboard")
export class StoresDashboardController {


  constructor(
    private readonly dashboardService:
      StoresDashboardService,
  ) {}


  // =====================================================
  // STORE DASHBOARD
  // GET /store-dashboard
  // =====================================================

  @UseGuards(JwtAuthGuard)
  @Get()
  getDashboard(
    @Req() req: any,
  ) {

    return this.dashboardService.getDashboard(
      getUserId(req),
    );

  }


  // =====================================================
  // STORE ANALYTICS
  // GET /store-dashboard/analytics
  // =====================================================

  @UseGuards(JwtAuthGuard)
  @Get("analytics")
  getAnalytics(
    @Req() req: any,
  ) {

    return this.dashboardService.getAnalytics(
      getUserId(req),
    );

  }

}