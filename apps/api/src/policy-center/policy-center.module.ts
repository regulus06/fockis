import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { NotificationsModule } from "../notifications/notifications.module";
import { UploadsModule } from "../uploads/uploads.module";
import { AdminPoliciesController, AdminPolicyComplianceController } from "./controllers/policy-admin.controller";
import { PolicyCenterController, PublicPoliciesController } from "./controllers/policy-public.controller";
import {
  OperationalRule,
  OperationalRuleSchema,
  Policy,
  PolicyAcceptance,
  PolicyAcceptanceSchema,
  PolicyAuditEvent,
  PolicyAuditEventSchema,
  PolicySchema,
  PolicySettings,
  PolicySettingsSchema,
  PolicyVersion,
  PolicyVersionSchema,
  UserConsent,
  UserConsentEvent,
  UserConsentEventSchema,
  UserConsentSchema,
  UserDataRequest,
  UserDataRequestSchema,
  UserPolicyActivity,
  UserPolicyActivitySchema,
  UserPrivacySettings,
  UserPrivacySettingsSchema,
} from "./schemas/policy.schemas";
import { DataRequestsService } from "./services/data-requests.service";
import { OperationalRulesService } from "./services/operational-rules.service";
import { PoliciesService } from "./services/policies.service";
import { PolicyAcceptanceService } from "./services/policy-acceptance.service";
import { PolicyAuditService } from "./services/policy-audit.service";
import { PolicyCommonService } from "./services/policy-common.service";
import { PolicyRolesSeeder } from "./services/policy-roles.seeder";
import { UserActivityService } from "./services/user-activity.service";
import { UserCenterService } from "./services/user-center.service";

/**
 * One policy system for both sides of Fockis:
 *  - Admin Center → Policy & Compliance manages policies, versions, rules,
 *    approvals, acceptance records, audit and settings.
 *  - Settings → Policy, Privacy & Safety reads published policies and
 *    manages the user's own privacy, consent, data requests and acceptance.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Policy.name, schema: PolicySchema },
      { name: PolicyVersion.name, schema: PolicyVersionSchema },
      { name: OperationalRule.name, schema: OperationalRuleSchema },
      { name: PolicyAcceptance.name, schema: PolicyAcceptanceSchema },
      { name: PolicyAuditEvent.name, schema: PolicyAuditEventSchema },
      { name: PolicySettings.name, schema: PolicySettingsSchema },
      { name: UserPrivacySettings.name, schema: UserPrivacySettingsSchema },
      { name: UserConsent.name, schema: UserConsentSchema },
      { name: UserConsentEvent.name, schema: UserConsentEventSchema },
      { name: UserDataRequest.name, schema: UserDataRequestSchema },
      { name: UserPolicyActivity.name, schema: UserPolicyActivitySchema },
    ]),
    NotificationsModule,
    UploadsModule,
  ],
  controllers: [PublicPoliciesController, PolicyCenterController, AdminPoliciesController, AdminPolicyComplianceController],
  providers: [
    PolicyCommonService,
    PolicyAuditService,
    PoliciesService,
    PolicyAcceptanceService,
    OperationalRulesService,
    UserActivityService,
    UserCenterService,
    DataRequestsService,
    PolicyRolesSeeder,
  ],
})
export class PolicyCenterModule {}
