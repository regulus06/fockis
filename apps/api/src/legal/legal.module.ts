import { Global, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { NotificationsModule } from "../notifications/notifications.module";
import { UploadsModule } from "../uploads/uploads.module";
import { ACCOUNT_DELETION_HANDLER } from "./account-deletion.token";
import { LegalAdminController } from "./controllers/legal-admin.controller";
import {
  AccountDeletion,
  AccountDeletionSchema,
  EvidenceAccessLog,
  EvidenceAccessLogSchema,
  EvidenceExport,
  EvidenceExportSchema,
  EvidenceRecord,
  EvidenceRecordSchema,
  LegalCounter,
  LegalCounterSchema,
  LegalHold,
  LegalHoldSchema,
  LegalRequest,
  LegalRequestSchema,
  RetentionPolicy,
  RetentionPolicySchema,
} from "./schemas/legal.schemas";
import { AccountDeletionService } from "./services/account-deletion.service";
import { EvidenceExportService } from "./services/evidence-export.service";
import { EvidenceService } from "./services/evidence.service";
import { LegalAuditService } from "./services/legal-audit.service";
import { LegalCommonService } from "./services/legal-common.service";
import { LegalDashboardService } from "./services/legal-dashboard.service";
import { LegalHoldsService } from "./services/legal-holds.service";
import { LegalRequestsService } from "./services/legal-requests.service";
import { LegalRolesSeeder } from "./services/legal-roles.seeder";
import { RetentionService } from "./services/retention.service";

/**
 * Legal & Evidence Management: legal requests, legal holds, evidence
 * archive and exports, evidence access log, retention policies and the
 * account deletion workflow. Global so that user and admin deletion can
 * check legal holds without importing this module.
 */
@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LegalCounter.name, schema: LegalCounterSchema },
      { name: LegalHold.name, schema: LegalHoldSchema },
      { name: LegalRequest.name, schema: LegalRequestSchema },
      { name: EvidenceRecord.name, schema: EvidenceRecordSchema },
      { name: EvidenceExport.name, schema: EvidenceExportSchema },
      { name: EvidenceAccessLog.name, schema: EvidenceAccessLogSchema },
      { name: RetentionPolicy.name, schema: RetentionPolicySchema },
      { name: AccountDeletion.name, schema: AccountDeletionSchema },
    ]),
    NotificationsModule,
    UploadsModule,
  ],
  controllers: [LegalAdminController],
  providers: [
    LegalCommonService,
    LegalAuditService,
    LegalHoldsService,
    LegalRequestsService,
    EvidenceService,
    EvidenceExportService,
    RetentionService,
    AccountDeletionService,
    LegalDashboardService,
    LegalRolesSeeder,
    { provide: ACCOUNT_DELETION_HANDLER, useExisting: AccountDeletionService },
  ],
  exports: [ACCOUNT_DELETION_HANDLER, LegalHoldsService],
})
export class LegalModule {}
