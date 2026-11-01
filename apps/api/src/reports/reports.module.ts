import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { NotificationsModule } from "../notifications/notifications.module";
import { AuditService } from "../admin/audit/audit.service";
import { AuditLog, AuditLogSchema } from "../admin/audit/audit-log.schema";

import { Report, ReportSchema } from "./schemas/report.schema";
import { ModerationCase, ModerationCaseSchema } from "./schemas/moderation-case.schema";
import { AccountRestriction, AccountRestrictionSchema } from "./schemas/account-restriction.schema";
import { ModerationSettings, ModerationSettingsSchema } from "./schemas/moderation-settings.schema";
import { ModerationEvent, ModerationEventSchema } from "./schemas/moderation-event.schema";

import { ReportsController } from "./controllers/reports.controller";
import { ModerationAdminController } from "./controllers/moderation-admin.controller";
import { PostModerationAdminController } from "./controllers/post-moderation-admin.controller";

import { ReportsService } from "./services/reports.service";
import { ModerationService } from "./services/moderation.service";
import { ModerationSettingsService } from "./services/moderation-settings.service";
import { AccountRestrictionsService } from "./services/account-restrictions.service";
import { ModerationNotifierService } from "./services/moderation-notifier.service";
import { ModerationEventsService } from "./services/moderation-events.service";
import { PostModerationService } from "./services/post-moderation.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Report.name, schema: ReportSchema },
      { name: ModerationCase.name, schema: ModerationCaseSchema },
      { name: AccountRestriction.name, schema: AccountRestrictionSchema },
      { name: ModerationSettings.name, schema: ModerationSettingsSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
      { name: ModerationEvent.name, schema: ModerationEventSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [ReportsController, ModerationAdminController, PostModerationAdminController],
  providers: [
    ReportsService,
    ModerationService,
    ModerationSettingsService,
    AccountRestrictionsService,
    ModerationNotifierService,
    AuditService,
    ModerationEventsService,
    PostModerationService,
  ],
  exports: [AccountRestrictionsService, ModerationEventsService],
})
export class ReportsModule {}
