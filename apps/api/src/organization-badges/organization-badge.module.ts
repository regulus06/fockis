import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  OrganizationBadge,
  OrganizationBadgeSchema,
} from './schemas/organization-badge.schema';

import {
  Membership,
  MembershipSchema,
} from '../church/members/schemas/membership.schema';

import {
  Organization,
  OrganizationSchema,
} from '../church/organizations/schemas/organization.schema';

import {
  Department,
  DepartmentSchema,
} from '../church/departments/schemas/department.schema';

import {
  ChurchGroup,
  ChurchGroupSchema,
} from '../church/groups/schemas/church-group.schema';

import { OrganizationBadgeController } from './controllers/organization-badge.controller';

import { OrganizationBadgeService } from './services/organization-badge.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: OrganizationBadge.name,
        schema: OrganizationBadgeSchema,
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
  ],

  providers: [
    OrganizationBadgeService,
  ],

  exports: [
    OrganizationBadgeService,
  ],
})
export class OrganizationBadgeModule {}