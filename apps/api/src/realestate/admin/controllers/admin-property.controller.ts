import {
  Controller,
  Get,
  Param,
  Patch,
  Delete,
  Body,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { RbacGuard } from '../../../admin/rbac/rbac.guard';
import { Roles } from '../../../admin/rbac/roles.decorator';
import { Role } from '../../../admin/rbac/roles.enum';

import { AdminPropertyService } from '../services/admin-property.service';

@Controller('admin/realestate')
@UseGuards(
  JwtAuthGuard,
  RbacGuard,
)
@Roles(Role.ADMIN)
export class AdminPropertyController {
  constructor(
    private readonly service: AdminPropertyService,
  ) {}

  @Get('dashboard')
  dashboard() {
    return this.service.dashboard();
  }

  @Get('properties')
  findAll() {
    return this.service.findAll();
  }

  @Get('property/:id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.service.findOne(id);
  }

  @Get('property/:id/audit')
  auditHistory(
    @Param('id')
    id: string,
  ) {
    return this.service.auditHistory(id);
  }

  @Patch('property/:id/approve')
  approve(
    @Param('id')
    id: string,
  ) {
    return this.service.approve(id);
  }

  @Patch('property/:id/reject')
  reject(
    @Param('id')
    id: string,

    @Body()
    body: {
      reason?: string;
    },
  ) {
    return this.service.reject(
      id,
      body.reason,
    );
  }

  @Patch('property/:id/suspend')
  suspend(
    @Param('id')
    id: string,

    @Body()
    body: {
      reason?: string;
    },
  ) {
    return this.service.suspend(
      id,
      body.reason,
    );
  }

  @Patch('property/:id/feature')
  feature(
    @Param('id')
    id: string,
  ) {
    return this.service.feature(id);
  }

  @Delete('property/:id')
  remove(
    @Param('id')
    id: string,
  ) {
    return this.service.remove(id);
  }
}