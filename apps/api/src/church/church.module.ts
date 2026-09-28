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

import { Module } from '@nestjs/common';
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

    // ------------------------------------------------------------------------
    // MONGOOSE MODELS
    // ------------------------------------------------------------------------

    MongooseModule.forFeature([
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
    OrganizationsController,
    LeadershipController,
    BranchesController,
    DepartmentsController,
    ChurchGroupsController,
    MembersController,
    ChurchEventsController,
    ChurchLiveController,
    AttendanceController,
    ChurchCommunicationController,
    ChurchMediaController,
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
  ],

  // ==========================================================================
  // EXPORTS
  // ==========================================================================

  exports: [
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