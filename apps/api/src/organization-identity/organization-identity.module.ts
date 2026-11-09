import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

// ============================================================================
// CHURCH ORGANIZATION
// ============================================================================

import {
  Organization,
  OrganizationSchema,
} from "../org/organizations/schemas/organization.schema";

// ============================================================================
// CHURCH MEMBERSHIP
// ============================================================================

import {
  Membership,
  MembershipSchema,
} from "../org/members/schemas/membership.schema";

// ============================================================================
// CHURCH DEPARTMENT
// ============================================================================

import {
  Department,
  DepartmentSchema,
} from "../org/departments/schemas/department.schema";

// ============================================================================
// CHURCH GROUP
// ============================================================================

import {
  ChurchGroup,
  ChurchGroupSchema,
} from "../org/groups/schemas/church-group.schema";

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

// ----------------------------------------------------------------------------
// DOMAIN FEES (price list set in the Admin Center; payments via existing checkout)
// ----------------------------------------------------------------------------
import { Payment, PaymentSchema } from "../payments/schemas/payment.schema";
import { DomainPricingModule } from "./billing/domain-pricing.module";
import { OrganizationDomainBilling, OrganizationDomainBillingSchema } from "./billing/organization-domain-billing.schema";
import { OrganizationDomainBillingService } from "./billing/organization-domain-billing.service";
import { DomainBillingAdminController, OrganizationDomainBillingController } from "./billing/organization-domain-billing.controller";
import { PersonalDomain, PersonalDomainSchema } from "./personal/personal-domain.schema";
import { PersonalDomainService } from "./personal/personal-domain.service";
import { PersonalDomainAdminController, PersonalDomainController, PersonalDomainPublicController } from "./personal/personal-domain.controller";

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

      // ----------------------------------------------------------------------
      // DOMAIN FEES
      // ----------------------------------------------------------------------
      {
        name: OrganizationDomainBilling.name,
        schema: OrganizationDomainBillingSchema,
      },
      // Personal domains (john.fockis.com) people pay for themselves.
      {
        name: PersonalDomain.name,
        schema: PersonalDomainSchema,
      },
      // Existing Fockis payment records — read-only (verify domain payments).
      {
        name: Payment.name,
        schema: PaymentSchema,
      },
    ]),

    DomainPricingModule,
  ],

  controllers: [
    OrganizationIdentityController,
    OrganizationDomainBillingController,
    DomainBillingAdminController,
    PersonalDomainController,
    PersonalDomainPublicController,
    PersonalDomainAdminController,
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

    // ------------------------------------------------------------------------
    // DOMAIN FEES
    // ------------------------------------------------------------------------
    OrganizationDomainBillingService,
    PersonalDomainService,
  ],

  exports: [
    OrganizationIdentityService,
  ],
})
export class OrganizationIdentityModule {}