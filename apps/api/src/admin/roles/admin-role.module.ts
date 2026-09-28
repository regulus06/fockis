import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  AdminRole,
  AdminRoleSchema,
} from './admin-role.schema';

import { AdminRoleService } from './admin-role.service';
import { AdminRoleController } from './admin-role.controller';

import { AuditService } from '../audit/audit.service';
import {
  AuditLog,
  AuditLogSchema,
} from '../audit/audit-log.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: AdminRole.name,
        schema: AdminRoleSchema,
      },
      {
        name: AuditLog.name,
        schema: AuditLogSchema,
      },
    ]),
  ],

  controllers: [
    AdminRoleController,
  ],

  providers: [
    AdminRoleService,
    AuditService,
  ],

  exports: [
    AdminRoleService,
  ],
})
export class AdminRoleModule {}