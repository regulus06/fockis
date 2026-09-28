import {
  Module,
} from "@nestjs/common";

import {
  MongooseModule,
} from "@nestjs/mongoose";

import {
  WalletModule,
} from "../wallet/wallet.module";

import {
  PaidContent,
  PaidContentSchema,
} from "./schemas/paid-content.schema";

import {
  ContentPurchase,
  ContentPurchaseSchema,
} from "./schemas/content-purchase.schema";

import {
  ContentEntitlement,
  ContentEntitlementSchema,
} from "./schemas/content-entitlement.schema";

import {
  ContentDownload,
  ContentDownloadSchema,
} from "./schemas/content-download.schema";

import {
  ContentMonetizationService,
} from "./services/content-monetization.service";

import {
  ContentPricingService,
} from "./services/content-pricing.service";

import {
  ContentAccessService,
} from "./services/content-access.service";

import {
  ContentPurchaseService,
} from "./services/content-purchase.service";

import {
  ContentDownloadService,
} from "./services/content-download.service";

import {
  ContentRevenueService,
} from "./services/content-revenue.service";

import {
  ContentPricingController,
} from "./controllers/content-pricing.controller";

import {
  ContentAccessController,
} from "./controllers/content-access.controller";

import {
  ContentPurchaseController,
} from "./controllers/content-purchase.controller";

import {
  ContentDownloadController,
} from "./controllers/content-download.controller";

import {
  ContentAccessGuard,
} from "./guards/content-access.guard";

@Module({
  imports: [
    // ==========================================================
    // WALLET
    //
    // Gives monetization access to:
    //
    // WalletService
    // spendCoins()
    // receiveGiftCoins()
    // purchaseContentWithCoins()
    // ==========================================================

    WalletModule,

    // ==========================================================
    // MONETIZATION MODELS
    // ==========================================================

    MongooseModule.forFeature([
      {
        name: PaidContent.name,
        schema: PaidContentSchema,
      },

      {
        name: ContentPurchase.name,
        schema: ContentPurchaseSchema,
      },

      {
        name: ContentEntitlement.name,
        schema: ContentEntitlementSchema,
      },

      {
        name: ContentDownload.name,
        schema: ContentDownloadSchema,
      },
    ]),
  ],

  controllers: [
    ContentPricingController,

    ContentAccessController,

    ContentPurchaseController,

    ContentDownloadController,
  ],

  providers: [
    ContentMonetizationService,

    ContentPricingService,

    ContentAccessService,

    ContentPurchaseService,

    ContentDownloadService,

    ContentRevenueService,

    ContentAccessGuard,
  ],

  exports: [
    ContentMonetizationService,

    ContentPricingService,

    ContentAccessService,

    ContentPurchaseService,

    ContentDownloadService,

    ContentRevenueService,

    ContentAccessGuard,
  ],
})
export class ContentMonetizationModule {}