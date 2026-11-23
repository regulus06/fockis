import { Global, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";

import { NotificationsModule } from "../../../notifications/notifications.module";
import { AuditLog, AuditLogSchema } from "../../audit/audit-log.schema";

import {
  LoginThrottle,
  LoginThrottleSchema,
  PlatformSecurityPolicy,
  PlatformSecurityPolicySchema,
  SecurityPolicyRevision,
  SecurityPolicyRevisionSchema,
} from "./platform-security-policy.schema";
import { PlatformSecurityPolicyService } from "./platform-security-policy.service";
import { SecurityEventsService } from "./security-events.service";
import { SecurityNotificationsService } from "./security-notifications.service";
import { AccountSecurityService } from "./account-security.service";
import { SecurityOverviewService } from "./security-overview.service";
import {
  AdminAuditLogsController,
  SecurityAdminController,
} from "./security-admin.controller";
import {
  AuthRestriction,
  AuthRestrictionSchema,
  LoginFailureCounter,
  LoginFailureCounterSchema,
  LoginVerificationChallenge,
  LoginVerificationChallengeSchema,
  RecoveryCase,
  RecoveryCaseSchema,
  SecurityIncident,
  SecurityIncidentSchema,
} from "../incidents/security-incident.schema";
import { LoginMonitorService } from "../incidents/login-monitor.service";
import { AuthRestrictionService } from "../incidents/auth-restriction.service";
import { RecoveryCaseService } from "../incidents/recovery-case.service";
import { SecurityIncidentsService } from "../incidents/security-incidents.service";
import { SecurityIncidentsController } from "../incidents/security-incidents.controller";

/**
 * Platform security policy, enforcement helpers and the Admin Center
 * "Security & Identity" API.
 *
 * Global so the auth, users and organization-identity modules can read the
 * effective policy without import cycles.
 */
@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PlatformSecurityPolicy.name, schema: PlatformSecurityPolicySchema },
      { name: SecurityPolicyRevision.name, schema: SecurityPolicyRevisionSchema },
      { name: LoginThrottle.name, schema: LoginThrottleSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
      { name: LoginFailureCounter.name, schema: LoginFailureCounterSchema },
      { name: SecurityIncident.name, schema: SecurityIncidentSchema },
      { name: AuthRestriction.name, schema: AuthRestrictionSchema },
      { name: LoginVerificationChallenge.name, schema: LoginVerificationChallengeSchema },
      { name: RecoveryCase.name, schema: RecoveryCaseSchema },
    ]),

    NotificationsModule,

    ConfigModule,

    // Same secret as AuthModule; used for reauthentication tokens.
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = String(config.get<string>("JWT_SECRET") ?? "").trim();

        if (secret.length < 32) {
          throw new Error(
            "SECURITY ERROR: JWT_SECRET is missing or too short. JWT_SECRET must be at least 32 characters.",
          );
        }

        return { secret };
      },
    }),
  ],

  controllers: [SecurityAdminController, AdminAuditLogsController, SecurityIncidentsController],

  providers: [
    PlatformSecurityPolicyService,
    SecurityEventsService,
    SecurityNotificationsService,
    AccountSecurityService,
    SecurityOverviewService,
    LoginMonitorService,
    AuthRestrictionService,
    RecoveryCaseService,
    SecurityIncidentsService,
  ],

  exports: [
    LoginMonitorService,
    AuthRestrictionService,
    RecoveryCaseService,
    SecurityIncidentsService,
    MongooseModule,
    PlatformSecurityPolicyService,
    SecurityEventsService,
    SecurityNotificationsService,
    AccountSecurityService,
  ],
})
export class PlatformSecurityModule {}
