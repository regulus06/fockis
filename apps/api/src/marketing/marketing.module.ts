import {
  Module,
} from "@nestjs/common";

import {
  MongooseModule,
} from "@nestjs/mongoose";

/* ============================================================
   SCHEMAS
============================================================ */

import {
  Campaign,
  CampaignSchema,
} from "./schemas/campaign.schema";

import {
  Advertisement,
  AdvertisementSchema,
} from "./schemas/advertisement.schema";

import {
  AdTargeting,
  AdTargetingSchema,
} from "./schemas/ad-targeting.schema";

import {
  AdBudget,
  AdBudgetSchema,
} from "./schemas/ad-budget.schema";

import {
  AdEvent,
  AdEventSchema,
} from "./schemas/ad-event.schema";

import {
  AdConversion,
  AdConversionSchema,
} from "./schemas/ad-conversion.schema";

/* ============================================================
   CONTROLLERS
============================================================ */

import {
  CampaignsController,
} from "./controllers/campaign.controllers";

import {
  MarketingAdminController,
} from "./controllers/admin-marketing.controller";

import {
  AdsController,
} from "./controllers/ads.controller";

import {
  AnalyticsController,
} from "./controllers/analytics.controller";

import {
  TargetingController,
} from "./controllers/targeting.controller";

import {
  BillingController,
} from "./controllers/billing.controller";

import {
  DeliveryController,
} from "./controllers/delivery.controller";

import {
  ConversionController,
} from "./controllers/conversion.controller";

import {
  MarketingController,
} from "./controllers/marketing.controller";

/* ============================================================
   SERVICES
============================================================ */

import {
  CampaignsService,
} from "./services/campaign.service";

import {
  AdvertisementService,
} from "./services/advertisement.service";

import {
  AnalyticsService,
} from "./services/analytics.service";

import {
  TargetingService,
} from "./services/targeting.service";

import {
  BudgetService,
} from "./services/budget.service";

import {
  ConversionService,
} from "./services/conversion.service";

import {
  AdDeliveryService,
} from "./services/ad-delivery.service";

import {
  MarketingService,
} from "./services/marketing.service";

/* ============================================================
   MODULE
============================================================ */

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name:
          Campaign.name,

        schema:
          CampaignSchema,
      },

      {
        name:
          Advertisement.name,

        schema:
          AdvertisementSchema,
      },

      {
        name:
          AdTargeting.name,

        schema:
          AdTargetingSchema,
      },

      {
        name:
          AdBudget.name,

        schema:
          AdBudgetSchema,
      },

      {
        name:
          AdEvent.name,

        schema:
          AdEventSchema,
      },

      {
        name:
          AdConversion.name,

        schema:
          AdConversionSchema,
      },
    ]),
  ],

  controllers: [
    CampaignsController,

    MarketingAdminController,

    AdsController,

    AnalyticsController,

    TargetingController,

    BillingController,

    DeliveryController,

    ConversionController,

    MarketingController,
  ],

  providers: [
    CampaignsService,

    AdvertisementService,

    AnalyticsService,

    TargetingService,

    BudgetService,

    ConversionService,

    AdDeliveryService,

    MarketingService,
  ],

  exports: [
    CampaignsService,

    AdvertisementService,

    AnalyticsService,

    TargetingService,

    BudgetService,

    ConversionService,

    AdDeliveryService,

    MarketingService,
  ],
})
export class MarketingModule {}