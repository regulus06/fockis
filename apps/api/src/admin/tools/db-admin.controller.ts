import {
  Controller,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { DbAdminService } from './db-admin.service';
import { SuperAdminGuard } from '../safety/super-admin.guard';
import { RbacGuard } from '../rbac/rbac.guard';
import { Permissions } from '../rbac/permissions.decorator';
import { Permission } from '../rbac/permissions.enum';

@Controller('admin/database')
@UseGuards(RbacGuard, SuperAdminGuard)
export class DbAdminController {
  constructor(
    private readonly dbAdminService: DbAdminService,
  ) {}

  /**
   * Database cleanup.
   *
   * This endpoint is restricted to SUPER_ADMIN.
   */
  @Post('cleanup')
  @Permissions(Permission.SYSTEM_CLEANUP)
  async cleanupDatabase(@Req() req: Request) {
    return this.dbAdminService.cleanupDatabase(req.user as any);
  }

  /**
   * Permanently purge records that have been marked
   * for deletion.
   *
   * This endpoint is restricted to SUPER_ADMIN.
   */
  @Post('purge-deleted')
  @Permissions(Permission.DELETE_DB)
  async purgeDeleted(@Req() req: Request) {
    return this.dbAdminService.purgeDeleted(req.user as any);
  }
}