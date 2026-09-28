import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminDashboardService } from './admin-dashboard.service';
import { DashboardQueryDto } from './dto/dashboard-query.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RbacGuard } from '../rbac/rbac.guard';

@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, RbacGuard)
export class AdminDashboardController {
  constructor(private readonly service: AdminDashboardService) {}

  @Get()
  getDashboard(@Query() query: DashboardQueryDto) {
    return this.service.getDashboard(query);
  }
}