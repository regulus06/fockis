import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { NotificationsModule } from "../notifications/notifications.module";
import { UploadsModule } from "../uploads/uploads.module";
import { SupportAdminController } from "./controllers/support-admin.controller";
import { SupportController } from "./controllers/support.controller";
import { HelpArticle, HelpArticleSchema } from "./schemas/help-article.schema";
import { SupportFeedback, SupportFeedbackSchema } from "./schemas/support-feedback.schema";
import { SupportSettings, SupportSettingsSchema } from "./schemas/support-settings.schema";
import { SupportTicket, SupportTicketSchema } from "./schemas/support-ticket.schema";
import { HelpArticlesService } from "./services/help-articles.service";
import { SupportAttachmentsService } from "./services/support-attachments.service";
import { SupportDashboardService } from "./services/support-dashboard.service";
import { SupportFeedbackService } from "./services/support-feedback.service";
import { SupportRolesSeeder } from "./services/support-roles.seeder";
import { SupportStaffService } from "./services/support-staff.service";
import { SupportService } from "./services/support.service";

/**
 * Fockis Help & Support: tickets, live chat, feedback, Help Center
 * articles, system status, and the Admin Center support dashboard.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SupportTicket.name, schema: SupportTicketSchema },
      { name: SupportSettings.name, schema: SupportSettingsSchema },
      { name: SupportFeedback.name, schema: SupportFeedbackSchema },
      { name: HelpArticle.name, schema: HelpArticleSchema },
    ]),
    NotificationsModule,
    UploadsModule,
  ],
  controllers: [SupportController, SupportAdminController],
  providers: [
    SupportService,
    SupportFeedbackService,
    HelpArticlesService,
    SupportDashboardService,
    SupportAttachmentsService,
    SupportStaffService,
    SupportRolesSeeder,
  ],
})
export class SupportModule {}
