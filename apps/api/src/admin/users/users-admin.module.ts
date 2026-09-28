import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { UsersAdminController } from './users-admin.controller';
import { UsersAdminService } from './users-admin.service';
import { UserAdminDashboardService } from './dashboard/users-stats.service';
import { UserDirectoryService } from './directory/users-list.service';
import { UserProfileService } from './profile/user-profile.service';
import { UserAccountService } from './account/user-account.service';
import { UserSecurityService } from './security/user-security.service';
import { UserRoleService } from './roles/user-role.service';
import { UserPermissionService } from './permissions/user-permission.service';
import { UserVerificationService } from './verification/user-verification.service';
import { UserPremiumService } from './premium/user-premium.service';
import { FockisIdAccessService } from './fockis-id/fockis-id-access.service';
import { UserActivityService } from './activity/user-activity.service';
import { UserMessagesService } from './messages/user-messages.service';
import { UserBookingsService } from './bookings/user-bookings.service';
import { UserPaymentsService } from './payments/user-payments.service';
import { UserReportsService } from './reports/user-reports.service';
import { UserDomainActivityService } from './domain-activity.service';
import { UserShopService } from './shop/user-shop.service';
import { UserLiveService } from './live/user-live.service';
import { UserMusicService } from './music/user-music.service';
import { UserTravelService } from './travel/user-travel.service';
import { UserRealEstateService } from './realestate/user-realestate.service';
import { UserAiService } from './ai/user-ai.service';
import { UserFinanceService } from './finance/user-finance.service';
import { UserBulkService } from './bulk/user-bulk.service';
import { UsersExportService } from './export/users-export.service';

import { User, UserSchema } from '../../users/user.schema';
import { AuditLog, AuditLogSchema } from '../audit/audit-log.schema';
import { AuditService } from '../audit/audit.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
  ],
  controllers: [UsersAdminController],
  providers: [
    UsersAdminService,
    UserAdminDashboardService,
    UserDirectoryService,
    UserProfileService,
    UserAccountService,
    UserSecurityService,
    UserRoleService,
    UserPermissionService,
    UserVerificationService,
    UserPremiumService,
    FockisIdAccessService,
    UserActivityService,
    UserMessagesService,
    UserBookingsService,
    UserPaymentsService,
    UserReportsService,
    UserDomainActivityService,
    // Domain-specific user views
    UserShopService,
    UserLiveService,
    UserMusicService,
    UserTravelService,
    UserRealEstateService,
    UserAiService,
    UserFinanceService,
    UserBulkService,
    UsersExportService,
    AuditService,
  ],
  exports: [UsersAdminService],
})
export class UsersAdminModule {}
