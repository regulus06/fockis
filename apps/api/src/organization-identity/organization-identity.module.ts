import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

// ============================================================================
// CHURCH ORGANIZATION
// ============================================================================

import {
  Organization,
  OrganizationSchema,
} from "../church/organizations/schemas/organization.schema";

// ============================================================================
// CHURCH MEMBERSHIP
// ============================================================================

import {
  Membership,
  MembershipSchema,
} from "../church/members/schemas/membership.schema";

// ============================================================================
// CHURCH DEPARTMENT
// ============================================================================

import {
  Department,
  DepartmentSchema,
} from "../church/departments/schemas/department.schema";

// ============================================================================
// CHURCH GROUP
// ============================================================================

import {
  ChurchGroup,
  ChurchGroupSchema,
} from "../church/groups/schemas/church-group.schema";

// ============================================================================
// USER
// ============================================================================

import {
  User,
  UserSchema,
} from "../users/user.schema";

// ============================================================================
// ORGANIZATION IDENTITY
// ============================================================================

import {
  OrganizationIdentity,
  OrganizationIdentitySchema,
} from "./schemas/organization-identity.schema";

// ============================================================================
// ORGANIZATION DOMAIN
// ============================================================================

import {
  OrganizationDomain,
  OrganizationDomainSchema,
} from "./schemas/organization-domain.schema";

// ============================================================================
// ORGANIZATION SECURITY POLICY
// ============================================================================

import {
  OrganizationSecurityPolicy,
  OrganizationSecurityPolicySchema,
} from "./schemas/organization-security-policy.schema";

// ============================================================================
// CONTROLLER
// ============================================================================

import {
  OrganizationIdentityController,
} from "./organization-identity.controller";

// ============================================================================
// SPLIT SERVICES
// ============================================================================

import {
  OrganizationIdentityService,
} from "./services/organization-identity.service";

import {
  OrganizationIdentityCommonService,
} from "./services/organization-identity-common.service";

import {
  OrganizationIdentityUserService,
} from "./services/organization-identity-user.service";

import {
  OrganizationIdentityDomainService,
} from "./services/organization-identity-domain.service";

import {
  OrganizationIdentitySecurityService,
} from "./services/organization-identity-security.service";

// ============================================================================
// MODULE
// ============================================================================

@Module({
  imports: [
    MongooseModule.forFeature([
      // ----------------------------------------------------------------------
      // ORGANIZATION
      // ----------------------------------------------------------------------

      {
        name: Organization.name,
        schema: OrganizationSchema,
      },

      // ----------------------------------------------------------------------
      // MEMBERSHIP
      // ----------------------------------------------------------------------

      {
        name: Membership.name,
        schema: MembershipSchema,
      },

      // ----------------------------------------------------------------------
      // DEPARTMENT
      // ----------------------------------------------------------------------

      {
        name: Department.name,
        schema: DepartmentSchema,
      },

      // ----------------------------------------------------------------------
      // CHURCH GROUP
      // ----------------------------------------------------------------------

      {
        name: ChurchGroup.name,
        schema: ChurchGroupSchema,
      },

      // ----------------------------------------------------------------------
      // USER
      // ----------------------------------------------------------------------

      {
        name: User.name,
        schema: UserSchema,
      },

      // ----------------------------------------------------------------------
      // ORGANIZATION IDENTITY
      // ----------------------------------------------------------------------

      {
        name: OrganizationIdentity.name,
        schema: OrganizationIdentitySchema,
      },

      // ----------------------------------------------------------------------
      // ORGANIZATION DOMAIN
      // ----------------------------------------------------------------------

      {
        name: OrganizationDomain.name,
        schema: OrganizationDomainSchema,
      },

      // ----------------------------------------------------------------------
      // SECURITY POLICY
      // ----------------------------------------------------------------------

      {
        name: OrganizationSecurityPolicy.name,
        schema: OrganizationSecurityPolicySchema,
      },
    ]),
  ],

  controllers: [
    OrganizationIdentityController,
  ],

  providers: [
    // ------------------------------------------------------------------------
    // COMMON / SHARED SERVICE
    // ------------------------------------------------------------------------

    OrganizationIdentityCommonService,

    // ------------------------------------------------------------------------
    // USER SERVICE
    // ------------------------------------------------------------------------

    OrganizationIdentityUserService,

    // ------------------------------------------------------------------------
    // DOMAIN SERVICE
    // ------------------------------------------------------------------------

    OrganizationIdentityDomainService,

    // ------------------------------------------------------------------------
    // SECURITY SERVICE
    // ------------------------------------------------------------------------

    OrganizationIdentitySecurityService,

    // ------------------------------------------------------------------------
    // FACADE SERVICE
    // ------------------------------------------------------------------------

    OrganizationIdentityService,
  ],

  exports: [
    OrganizationIdentityService,
  ],
})
export class OrganizationIdentityModule {}