import {
  Module,
} from "@nestjs/common";

import {
  MongooseModule,
} from "@nestjs/mongoose";

import {
  DomainAdminController,
} from "./domain-admin.controller";

import {
  DomainAdminService,
} from "./domain-admin.service";

import {
  DomainPolicy,
  DomainPolicySchema,
} from "./schemas/domain-policy.schema";

import {
  DomainCampaign,
  DomainCampaignSchema,
} from "./schemas/domain-campaign.schema";

import {
  DomainAuthorization,
  DomainAuthorizationSchema,
} from "./schemas/domain-authorization.schema";

import {
  ManagedDomain,
  ManagedDomainSchema,
} from "./schemas/managed-domain.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: DomainPolicy.name,
        schema: DomainPolicySchema,
      },
      {
        name: DomainCampaign.name,
        schema: DomainCampaignSchema,
      },
      {
        name: DomainAuthorization.name,
        schema:
          DomainAuthorizationSchema,
      },
      {
        name: ManagedDomain.name,
        schema:
          ManagedDomainSchema,
      },
    ]),
  ],

  controllers: [
    DomainAdminController,
  ],

  providers: [
    DomainAdminService,
  ],

  exports: [
    DomainAdminService,
  ],
})
export class DomainAdminModule {}