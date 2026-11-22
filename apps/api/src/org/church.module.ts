/**
 * church.module.ts
 * -----------------------------------------------------------------------------
 * Single flat NestJS module for the entire Fockis Church / Organization
 * feature.
 *
 * Although this module currently powers Fockis Church routes, the underlying
 * organization and membership systems are intentionally reusable.
 *
 * ROUTE PREFIX:
 * Controllers use `organizations/...`.
 * RouterModule prefixes the module with `church`.
 *
 * With the host application's global `api` prefix, routes resolve to:
 *
 *   /api/church/organizations/...
 *
 * ORGANIZATION BADGES:
 * OrganizationBadgeModule provides the generic Fockis Organization Badge
 * system.
 *
 * The badge system can be used by:
 *
 *   - Churches
 *   - Schools
 *   - Businesses
 *   - Nonprofits
 *   - Teams
 *   - Clubs
 *   - Communities
 *   - Ministries
 *   - Other organizations
 *
 * AUTH:
 * Controllers assume the host application authentication layer has already
 * populated `req.user`.
 * -----------------------------------------------------------------------------
 */

import { Module, forwardRef } from '@nestjs/common';

// Groups & Communities (extends church groups).
import { COMMUNITY_MODELS } from './communities/community.schemas';
import { CommunityAccessService } from './communities/community-access.service';
import { CommunitiesService } from './communities/communities.service';
import { CommunityContentService } from './communities/community-content.service';
import { CommunityFinanceService } from './communities/community-finance.service';
// Give Online (tithes, offerings, special gifts) on the church website.
import { ChurchGivingController } from './giving/church-giving.controller';
import { ChurchGivingService } from './giving/church-giving.service';
import { ChurchGift, ChurchGiftSchema, ChurchGivingSettings, ChurchGivingSettingsSchema } from './giving/church-giving.schemas';
// Settings & Roles (Organization Administration Center): preferences, audit log.
import { AdminCenterController } from './admin-center/admin-center.controller';
import { AdminCenterService } from './admin-center/admin-center.service';
import { OrganizationAuditLog, OrganizationAuditLogSchema, OrganizationPreferences, OrganizationPreferencesSchema } from './admin-center/admin-center.schemas';
import { CommunitiesController, GroupContentController } from './communities/communities.controller';
// Universal Fockis payments (Stripe) for group contributions.
import { PaymentsModule } from '../payments/payments.module';
import { RouterModule } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';

// ============================================================================
// ORGANIZATION BADGES
// ============================================================================

import { OrganizationBadgeModule } from '../organization-badges/organization-badge.module';

// ============================================================================
// ORGANIZATION IDENTITY
// ============================================================================

import {
  OrganizationDomain,
  OrganizationDomainSchema,
} from '../organization-identity/schemas/organization-domain.schema';

// ============================================================================
// ORGANIZATIONS
// ============================================================================

import {
  Organization,
  OrganizationSchema,
} from './organizations/schemas/organization.schema';

import { OrganizationsService } from './organizations/services/organizations.service';

import { OrganizationsController } from './organizations/controllers/organizations.controller';

// ============================================================================
// LEADERSHIP
// ============================================================================

import {
  Leadership,
  LeadershipSchema,
} from './leadership/schemas/leadership.schema';

import { LeadershipService } from './leadership/services/leadership.service';

import { LeadershipController } from './leadership/controllers/leadership.controller';

// ============================================================================
// BRANCHES
// ============================================================================

import {
  Branch,
  BranchSchema,
} from './branches/schemas/branch.schema';

import { BranchesService } from './branches/services/branches.service';

import { BranchesController } from './branches/controllers/branches.controller';

// ============================================================================
// DEPARTMENTS
// ============================================================================

import {
  Department,
  DepartmentSchema,
} from './departments/schemas/department.schema';

import { DepartmentsService } from './departments/services/departments.service';

import { DepartmentsController } from './departments/controllers/departments.controller';
import { PublicMinistriesController } from './departments/controllers/public-ministries.controller';
import { MinistryAttendanceController } from './ministry-attendance/ministry-attendance.controller';
import { MinistryAttendanceService } from './ministry-attendance/ministry-attendance.service';
import {
  MinistryAttendanceRecord,
  MinistryAttendanceRecordSchema,
  MinistryAttendanceSession,
  MinistryAttendanceSessionSchema,
} from './ministry-attendance/ministry-attendance.schemas';

// ============================================================================
// GROUPS
// ============================================================================

import {
  ChurchGroup,
  ChurchGroupSchema,
} from './groups/schemas/church-group.schema';

import { ChurchGroupsService } from './groups/services/church-groups.service';

import { ChurchGroupsController } from './groups/controllers/church-groups.controller';

// ============================================================================
// MEMBERS
// ============================================================================

import {
  Membership,
  MembershipSchema,
} from './members/schemas/membership.schema';

import { MembersService } from './members/services/members.service';

import { MembersController } from './members/controllers/members.controller';

// ============================================================================
// EVENTS
// ============================================================================

import {
  ChurchEvent,
  ChurchEventSchema,
} from './events/schemas/church-event.schema';

import { ChurchEventsService } from './events/services/church-events.service';

import { ChurchEventsController } from './events/controllers/church-events.controller';

// ============================================================================
// LIVE
// ============================================================================

import {
  LiveEvent,
  LiveEventSchema,
  ChurchLiveService,
} from './live/services/church-live.service';

import { ChurchLiveController } from './live/controllers/church-live.controller';
import { OrgLiveInvitation, OrgLiveInvitationSchema } from './live/schemas/live-invitation.schema';
import { OrgLiveView, OrgLiveViewSchema } from './live/schemas/live-view.schema';

// ============================================================================
// ATTENDANCE
// ============================================================================

import {
  AttendanceEntry,
  AttendanceEntrySchema,
} from './attendance/schemas/attendance.schema';

import { AttendanceService } from './attendance/services/attendance.service';

import { AttendanceController } from './attendance/controllers/attendance.controller';

// ============================================================================
// COMMUNICATION
// ============================================================================

import {
  Announcement,
  AnnouncementSchema,
  ChurchMessage,
  ChurchMessageSchema,
  ChurchNotification,
  ChurchNotificationSchema,
} from './communication/schemas/announcement.schema';

import {
  ChurchCommunicationService,
} from './communication/services/church-communication.service';

import {
  ChurchCommunicationController,
} from './communication/controllers/church-communication.controller';

// ============================================================================
// MEDIA
// ============================================================================

import {
  ChurchMedia,
  ChurchMediaSchema,
} from './media/schemas/church-media.schema';

import { ChurchMediaService } from './media/services/church-media.service';

import { ChurchMediaController } from './media/controllers/church-media.controller';

// ============================================================================
// VISIT REQUESTS ("Plan a visit") AND MEMBER HISTORY
// ============================================================================

import {
  OrganizationVisit,
  OrganizationVisitSchema,
} from './visits/schemas/organization-visit.schema';
import { OrganizationVisitsService } from './visits/services/organization-visits.service';
import {
  MyVisitsController,
  OrganizationVisitsController,
} from './visits/controllers/organization-visits.controller';
import { MemberHistoryService } from './members/services/member-history.service';
import { MemberHistoryController } from './members/controllers/member-history.controller';
import { OrganizationDashboardService } from './dashboard/organization-dashboard.service';
import { OrganizationDashboardController } from './dashboard/organization-dashboard.controller';
import { OrganizationFollow, OrganizationFollowSchema } from './followers/organization-follow.schema';
import { OrganizationFollowService } from './followers/organization-follow.service';
import { OrganizationFollowController } from './followers/organization-follow.controller';

// Church member profile dashboard (extra profile details, notes, documents).
import { MemberProfile, MemberProfileSchema } from './member-profile/member-profile.schema';
import { MemberProfileService } from './member-profile/member-profile.service';
import { MemberProfileController } from './member-profile/member-profile.controller';
import { ChurchRequest, ChurchRequestSchema } from './requests/church-request.schema';
import { ChurchRequestsService } from './requests/church-requests.service';
import { ChurchRequestsController } from './requests/church-requests.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { MessagesModule } from '../messages/messages.module';
import { RegistrationMailer } from '../events/registrations/registration-mailer';

// Ministries management (extends departments): policy, proposals, applications,
// teams, finance requests, audit log, reports.
import {
  MinistryApplication,
  MinistryApplicationSchema,
  MinistryAuditLog,
  MinistryAuditLogSchema,
  MinistryFinanceRequest,
  MinistryFinanceRequestSchema,
  MinistryPolicy,
  MinistryPolicySchema,
  MinistryProposal,
  MinistryProposalSchema,
  MinistryTeam,
  MinistryTeamSchema,
} from './ministries/ministry.schemas';
import { MinistryAccessService } from './ministries/ministry-access.service';
import { MinistriesService } from './ministries/ministries.service';
import { MinistriesController } from './ministries/ministries.controller';

// Per-page sidebar thumbnails, banners and logos.
import { PageBranding, PageBrandingSchema } from './page-branding/page-branding.schema';
import { PageBrandingService } from './page-branding/page-branding.service';
import { PageBrandingController } from './page-branding/page-branding.controller';

// ============================================================================
// MODULE
// ============================================================================

@Module({
  imports: [
    // ------------------------------------------------------------------------
    // ORGANIZATION BADGES
    // ------------------------------------------------------------------------
    //
    // Generic organization membership badge system.
    //
    // The module owns:
    //
    //   OrganizationBadge schema
    //   OrganizationBadgeService
    //   OrganizationBadgeController
    //
    // MembersService can use the exported
    // OrganizationBadgeService to automatically create/update a badge
    // when a membership becomes active.
    //
    OrganizationBadgeModule,

    // Fockis bell notifications and direct messages (Requests & Inquiries replies).
    NotificationsModule,

    // Group contributions use the existing universal payment service.
    forwardRef(() => PaymentsModule),
    MessagesModule,

    // ------------------------------------------------------------------------
    // MONGOOSE MODELS
    // ------------------------------------------------------------------------

    MongooseModule.forFeature([
      // Followers of an organization's public updates (not membership).
      { name: OrganizationFollow.name, schema: OrganizationFollowSchema },

      // Per-page thumbnail / banner / logo (draft, published, previous).
      { name: PageBranding.name, schema: PageBrandingSchema },

      // Church member profile details (one per membership).
      { name: MemberProfile.name, schema: MemberProfileSchema },
      // Requests & Inquiries.
      { name: ChurchRequest.name, schema: ChurchRequestSchema },

      // Give Online: per-church settings and gifts.
      { name: ChurchGivingSettings.name, schema: ChurchGivingSettingsSchema },
      { name: ChurchGift.name, schema: ChurchGiftSchema },

      // Settings & Roles: preferences + append-only audit log.
      { name: OrganizationPreferences.name, schema: OrganizationPreferencesSchema },
      { name: OrganizationAuditLog.name, schema: OrganizationAuditLogSchema },

      // Ministries management.
      { name: MinistryPolicy.name, schema: MinistryPolicySchema },
      { name: MinistryProposal.name, schema: MinistryProposalSchema },
      { name: MinistryApplication.name, schema: MinistryApplicationSchema },
      { name: MinistryTeam.name, schema: MinistryTeamSchema },
      { name: MinistryFinanceRequest.name, schema: MinistryFinanceRequestSchema },
      { name: MinistryAuditLog.name, schema: MinistryAuditLogSchema },

      // Groups & Communities.
      ...COMMUNITY_MODELS,

      // Ministry attendance: one session per meeting date, one record per member.
      { name: MinistryAttendanceSession.name, schema: MinistryAttendanceSessionSchema },
      { name: MinistryAttendanceRecord.name, schema: MinistryAttendanceRecordSchema },

      // ----------------------------------------------------------------------
      // Organizations
      // ----------------------------------------------------------------------

      {
        name: Organization.name,
        schema: OrganizationSchema,
      },

      // ----------------------------------------------------------------------
      // Organization Identity
      // ----------------------------------------------------------------------
      //
      // Required by MembersService for the organization-domain prerequisite.
      //
      // Members cannot be added by an administrator until the organization
      // has a base OrganizationDomain with:
      //
      //   domainType: OrganizationDomainType.Organization
      //

      {
        name: OrganizationDomain.name,
        schema: OrganizationDomainSchema,
      },

      // ----------------------------------------------------------------------
      // Leadership
      // ----------------------------------------------------------------------

      {
        name: Leadership.name,
        schema: LeadershipSchema,
      },

      // ----------------------------------------------------------------------
      // Branches
      // ----------------------------------------------------------------------

      {
        name: Branch.name,
        schema: BranchSchema,
      },

      // ----------------------------------------------------------------------
      // Departments
      // ----------------------------------------------------------------------

      {
        name: Department.name,
        schema: DepartmentSchema,
      },

      // ----------------------------------------------------------------------
      // Groups
      // ----------------------------------------------------------------------

      {
        name: ChurchGroup.name,
        schema: ChurchGroupSchema,
      },

      // ----------------------------------------------------------------------
      // Membership
      // ----------------------------------------------------------------------

      {
        name: Membership.name,
        schema: MembershipSchema,
      },

      // ----------------------------------------------------------------------
      // Events
      // ----------------------------------------------------------------------

      {
        name: ChurchEvent.name,
        schema: ChurchEventSchema,
      },

      // ----------------------------------------------------------------------
      // Live
      // ----------------------------------------------------------------------

      {
        name: LiveEvent.name,
        schema: LiveEventSchema,
      },
      {
        name: OrgLiveInvitation.name,
        schema: OrgLiveInvitationSchema,
      },
      {
        name: OrgLiveView.name,
        schema: OrgLiveViewSchema,
      },

      // ----------------------------------------------------------------------
      // Attendance
      // ----------------------------------------------------------------------

      {
        name: AttendanceEntry.name,
        schema: AttendanceEntrySchema,
      },

      // ----------------------------------------------------------------------
      // Communication
      // ----------------------------------------------------------------------

      {
        name: Announcement.name,
        schema: AnnouncementSchema,
      },

      {
        name: ChurchMessage.name,
        schema: ChurchMessageSchema,
      },

      {
        name: ChurchNotification.name,
        schema: ChurchNotificationSchema,
      },

      // ----------------------------------------------------------------------
      // Media
      // ----------------------------------------------------------------------

      {
        name: ChurchMedia.name,
        schema: ChurchMediaSchema,
      },
      // ----------------------------------------------------------------------
      // Visit requests
      // ----------------------------------------------------------------------
      {
        name: OrganizationVisit.name,
        schema: OrganizationVisitSchema,
      },
    ]),

    // ------------------------------------------------------------------------
    // CHURCH ROUTER PREFIX
    // ------------------------------------------------------------------------

    RouterModule.register([
      {
        path: 'church',
        module: ChurchModule,
      },
    ]),
  ],

  // ==========================================================================
  // CONTROLLERS
  // ==========================================================================

  controllers: [
    // Before OrganizationsController so "domain-availability" is not read as an ID.
    OrganizationDashboardController,
    OrganizationFollowController,
    PageBrandingController,
    MemberProfileController,
    ChurchRequestsController,
    ChurchGivingController,
    AdminCenterController,
    OrganizationsController,
    LeadershipController,
    BranchesController,
    DepartmentsController,
    // Guest-safe ministries list for the public church website.
    PublicMinistriesController,
    MinistryAttendanceController,
    MinistriesController,
    CommunitiesController,
    GroupContentController,
    ChurchGroupsController,
    // Before MembersController so ".../members/me/history" is matched first.
    MemberHistoryController,
    MembersController,
    ChurchEventsController,
    ChurchLiveController,
    AttendanceController,
    ChurchCommunicationController,
    ChurchMediaController,
    OrganizationVisitsController,
    MyVisitsController,
  ],

  // ==========================================================================
  // PROVIDERS
  // ==========================================================================

  providers: [
    OrganizationsService,
    LeadershipService,
    BranchesService,
    DepartmentsService,
    ChurchGroupsService,
    MembersService,
    ChurchEventsService,
    ChurchLiveService,
    AttendanceService,
    ChurchCommunicationService,
    ChurchMediaService,
    OrganizationVisitsService,
    MemberHistoryService,
    OrganizationDashboardService,
    OrganizationFollowService,
    MinistryAttendanceService,
    PageBrandingService,
    MemberProfileService,
    ChurchRequestsService,
    MinistryAccessService,
    MinistriesService,
    CommunityAccessService,
    CommunitiesService,
    CommunityContentService,
    CommunityFinanceService,
    ChurchGivingService,
    AdminCenterService,
    // Same email delivery (Resend / SMTP) as event registrations.
    RegistrationMailer,
  ],

  // ==========================================================================
  // EXPORTS
  // ==========================================================================

  exports: [
    OrganizationsService,
    LeadershipService,
    BranchesService,
    DepartmentsService,
    MinistryAccessService,
    ChurchGroupsService,
    MembersService,
    ChurchEventsService,
    ChurchLiveService,
    AttendanceService,
    ChurchCommunicationService,
    ChurchMediaService,

    // ------------------------------------------------------------------------
    // OrganizationBadgeService is exported by OrganizationBadgeModule.
    //
    // Other modules that need badge functionality should import:
    //
    //   OrganizationBadgeModule
    //
    // directly rather than duplicating the badge provider here.
    // ------------------------------------------------------------------------
  ],
})
export class ChurchModule {}