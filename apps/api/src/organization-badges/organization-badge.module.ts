import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  OrganizationBadge,
  OrganizationBadgeSchema,
} from './schemas/organization-badge.schema';

import {
  Membership,
  MembershipSchema,
} from '../org/members/schemas/membership.schema';

import {
  Organization,
  OrganizationSchema,
} from '../org/organizations/schemas/organization.schema';

import {
  Department,
  DepartmentSchema,
} from '../org/departments/schemas/department.schema';

import {
  ChurchGroup,
  ChurchGroupSchema,
} from '../org/groups/schemas/church-group.schema';

import {
  BadgeVerifyController,
  OrganizationBadgeController,
} from './controllers/organization-badge.controller';

import {
  OrganizationBadgeDesign,
  OrganizationBadgeDesignSchema,
} from './schemas/organization-badge-design.schema';

import { OrganizationBadgeService } from './services/organization-badge.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: OrganizationBadge.name,
        schema: OrganizationBadgeSchema,
      },

      // Which badge template each organization uses.
      {
        name: OrganizationBadgeDesign.name,
        schema: OrganizationBadgeDesignSchema,
      },

      {
        name: Membership.name,
        schema: MembershipSchema,
      },

      {
        name: Organization.name,
        schema: OrganizationSchema,
      },

      {
        name: Department.name,
        schema: DepartmentSchema,
      },

      {
        name: ChurchGroup.name,
        schema: ChurchGroupSchema,
      },
    ]),
  ],

  controllers: [
    OrganizationBadgeController,
    BadgeVerifyController,
  ],

  providers: [
    OrganizationBadgeService,
  ],

  exports: [
    OrganizationBadgeService,
  ],
})
export class OrganizationBadgeModule {}