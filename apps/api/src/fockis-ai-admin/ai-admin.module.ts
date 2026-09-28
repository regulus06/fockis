import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

// ─────────────────────────────────────────────
// AI ADMIN
// ─────────────────────────────────────────────

import { AiAdminController } from "./admin/ai-admin.controller";
import { AiAdminService } from "./admin/ai-admin.service";

// ─────────────────────────────────────────────
// AI ADMIN SCHEMAS
// ─────────────────────────────────────────────

import {
  AiPlan,
  AiPlanSchema,
} from "./admin/schemas/ai-plan.schema";

import {
  AiUserAccess,
  AiUserAccessSchema,
} from "./admin/schemas/ai-user-access.schema";

import {
  AiTool,
  AiToolSchema,
} from "./admin/schemas/ai-tool.schema";

import {
  AiConversation,
  AiConversationSchema,
} from "./admin/schemas/ai-conversation.schema";

import {
  AiRecommendation,
  AiRecommendationSchema,
} from "./admin/schemas/ai-recommendation.schema";

import {
  AiSpecialAd,
  AiSpecialAdSchema,
} from "./admin/schemas/ai-special-ad.schema";

import {
  AiUsage,
  AiUsageSchema,
} from "./admin/schemas/ai-usage.schema";

import {
  AiSettings,
  AiSettingsSchema,
} from "./admin/schemas/ai-settings.schema";

// ─────────────────────────────────────────────
// AI ACCESS
// ─────────────────────────────────────────────

import { AiAccessService } from "./access/ai-access.service";

// ─────────────────────────────────────────────
// VAPI
// ─────────────────────────────────────────────

import { VapiService } from "./vapi/vapi.service";
import { VapiController } from "./vapi/vapi.controller";

// ─────────────────────────────────────────────
// FOCKIS SHOP AI DISCOVERY
// ─────────────────────────────────────────────

import {
  FockisShopDiscoveryModule,
} from "../fockis-shop-ai-discovery/fockis-shop-discovery.module";

// ─────────────────────────────────────────────
// FOCKIS LIVE DISCOVERY
// ─────────────────────────────────────────────

import {
  AiDiscoveryController,
} from "./discovery/ai-discovery.controller";

import {
  AiDiscoveryService,
} from "./discovery/ai-discovery.service";

// ─────────────────────────────────────────────
// MODULE
// ─────────────────────────────────────────────

@Module({
  imports: [
    // ─────────────────────────────────────────
    // AI ADMIN DATABASE SCHEMAS
    // ─────────────────────────────────────────

    MongooseModule.forFeature([
      {
        name: AiPlan.name,
        schema: AiPlanSchema,
      },

      {
        name: AiUserAccess.name,
        schema: AiUserAccessSchema,
      },

      {
        name: AiTool.name,
        schema: AiToolSchema,
      },

      {
        name: AiConversation.name,
        schema: AiConversationSchema,
      },

      {
        name: AiRecommendation.name,
        schema: AiRecommendationSchema,
      },

      {
        name: AiSpecialAd.name,
        schema: AiSpecialAdSchema,
      },

      {
        name: AiUsage.name,
        schema: AiUsageSchema,
      },

      {
        name: AiSettings.name,
        schema: AiSettingsSchema,
      },
    ]),

    // ─────────────────────────────────────────
    // FOCKIS SHOP AI DISCOVERY
    // ─────────────────────────────────────────

    FockisShopDiscoveryModule,
  ],

  // ───────────────────────────────────────────
  // CONTROLLERS
  // ───────────────────────────────────────────

  controllers: [
    AiAdminController,
    VapiController,
    AiDiscoveryController,
  ],

  // ───────────────────────────────────────────
  // PROVIDERS
  // ───────────────────────────────────────────

  providers: [
    AiAdminService,
    AiAccessService,
    VapiService,
    AiDiscoveryService,
  ],

  // ───────────────────────────────────────────
  // EXPORTS
  // ───────────────────────────────────────────

  exports: [
    AiAdminService,
    AiAccessService,
    VapiService,
    AiDiscoveryService,
  ],
})
export class AiAdminModule {}