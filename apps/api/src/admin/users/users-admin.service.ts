import { Injectable } from '@nestjs/common';
import { UserDirectoryService } from './directory/users-list.service';
import { UserAdminDashboardService } from './dashboard/users-stats.service';
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
import { UserBulkService } from './bulk/user-bulk.service';
import { UsersExportService } from './export/users-export.service';

@Injectable()
export class UsersAdminService {
  constructor(
    private readonly directory: UserDirectoryService,
    private readonly dashboard: UserAdminDashboardService,
    private readonly profile: UserProfileService,
    private readonly account: UserAccountService,
    private readonly security: UserSecurityService,
    private readonly roles: UserRoleService,
    private readonly permissions: UserPermissionService,
    private readonly verification: UserVerificationService,
    private readonly premium: UserPremiumService,
    private readonly fockisId: FockisIdAccessService,
    private readonly activity: UserActivityService,
    private readonly messages: UserMessagesService,
    private readonly bookings: UserBookingsService,
    private readonly payments: UserPaymentsService,
    private readonly reports: UserReportsService,
    private readonly domainActivity: UserDomainActivityService,
    private readonly bulk: UserBulkService,
    private readonly exportService: UsersExportService,
  ) {}

  getUsers(q: any) { return this.directory.list(q); }
  getStats() { return this.dashboard.getStats(); }
  getUser(id: string) { return this.directory.getById(id); }
  updateProfile(id: string, body: any, actor: any, req: any) { return this.profile.update(id, body, actor, req); }
  updateStatus(id: string, body: any, actor: any, req: any) { return this.account.updateStatus(id, body, actor, req); }
  updateRole(id: string, body: any, actor: any, req: any) { return this.roles.update(id, body, actor, req); }
  updatePermissions(id: string, body: any, actor: any, req: any) { return this.permissions.update(id, body, actor, req); }
  updateVerification(id: string, body: any, actor: any, req: any) { return this.verification.update(id, body, actor, req); }
  updatePremium(id: string, body: any, actor: any, req: any) { return this.premium.update(id, body, actor, req); }
  updateFockisIdAccess(id: string, body: any, actor: any, req: any) { return this.fockisId.update(id, body, actor, req); }
  lock(id: string, body: any, actor: any, req: any) { return this.security.lock(id, body, actor, req); }
  unlock(id: string, actor: any, req: any) { return this.security.unlock(id, actor, req); }
  forcePasswordChange(id: string, actor: any, req: any) { return this.security.forcePasswordChange(id, actor, req); }
  resetPassword(id: string, actor: any, req: any) { return this.security.resetPassword(id, actor, req); }
  getActivity(id: string, q: any) { return this.activity.list(id, q); }
  getMessages(id: string, q: any) { return this.messages.list(id, q); }
  getBookings(id: string, q: any) { return this.bookings.list(id, q); }
  getPayments(id: string, q: any) { return this.payments.list(id, q); }
  getReports(id: string, q: any) { return this.reports.list(id, q); }
  getDomainSummary(id: string) { return this.domainActivity.summary(id); }
  bulkAction(body: any, actor: any, req: any) { return this.bulk.execute(body, actor, req); }
  export(q: any) { return this.exportService.csv(q); }
}
