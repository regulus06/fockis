import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

// ============================================================================
// SCHEMAS
// ============================================================================

import {
  MusicContent,
  MusicContentSchema,
} from './schemas/music-content.schema';

import {
  MusicPurchase,
  MusicPurchaseSchema,
  MusicEntitlement,
  MusicEntitlementSchema,
  ProducerEarning,
  ProducerEarningSchema,
  ProducerPayout,
  ProducerPayoutSchema,
} from './schemas/music-purchase.schema';

import {
  MusicPlay,
  MusicPlaySchema,
  MusicView,
  MusicViewSchema,
  MusicFavorite,
  MusicFavoriteSchema,
  MusicShare,
  MusicShareSchema,
  ProducerFollow,
  ProducerFollowSchema,
} from './schemas/music-analytics.schema';

import {
  ProducerProfile,
  ProducerProfileSchema,
} from './schemas/producer-profile.schema';

import {
  MusicSettings,
  MusicSettingsSchema,
} from './schemas/music-settings.schema';

import {
  ProducerTeamMember,
  ProducerTeamMemberSchema,
} from './schemas/producer-team.schema';

// ============================================================================
// SERVICES
// ============================================================================

import { MusicService } from './services/music.service';
import { MusicPurchaseService } from './services/music-purchase.service';
import { MusicEntitlementService } from './services/music-entitlement.service';
import { MusicAnalyticsService } from './services/music-analytics.service';
import { MusicRankingService } from './services/music-ranking.service';
import { ProducerService } from './services/producer.service';
import { MusicSettingsService } from './services/music-settings.service';
import { ProducerTeamService } from './services/producer-team.service';
import { MusicMediaProcessingService } from './services/music-media-processing.service';

// ============================================================================
// CONTROLLERS
// ============================================================================

import { MusicController } from './controllers/music.controller';
import { MusicPurchasesController } from './controllers/music-purchases.controller';
import { MusicEntitlementsController } from './controllers/music-entitlements.controller';
import { MusicAnalyticsController } from './controllers/music-analytics.controller';
import { ProducerMusicController } from './controllers/producer-music.controller';
import { MusicWebhookController } from './controllers/music-webhook.controller';
import { ProducerController } from './controllers/producer.controller';
import { ProducerTeamController } from './controllers/producer-team.controller';
import { MusicStudioUploadController } from './controllers/music-studio-upload.controller';

// ============================================================================
// GUARDS
// ============================================================================

import { MusicOwnerGuard } from './guards/music-owner.guard';
import { MusicEntitlementGuard } from './guards/music-entitlement.guard';

// ============================================================================
// MODULES
// ============================================================================

import { UploadsModule } from '../uploads/uploads.module';
import { PaymentsModule } from '../payments/payments.module';

// ============================================================================
// MUSIC MODULE
// ============================================================================

@Module({
  imports: [
    // ========================================================================
    // MONGOOSE
    // ========================================================================

    MongooseModule.forFeature([
      // Music content
      {
        name: MusicContent.name,
        schema: MusicContentSchema,
      },

      // Purchases
      {
        name: MusicPurchase.name,
        schema: MusicPurchaseSchema,
      },

      // Entitlements
      {
        name: MusicEntitlement.name,
        schema: MusicEntitlementSchema,
      },

      // Producer earnings
      {
        name: ProducerEarning.name,
        schema: ProducerEarningSchema,
      },

      // Producer payouts
      {
        name: ProducerPayout.name,
        schema: ProducerPayoutSchema,
      },

      // Analytics
      {
        name: MusicPlay.name,
        schema: MusicPlaySchema,
      },

      {
        name: MusicView.name,
        schema: MusicViewSchema,
      },

      {
        name: MusicFavorite.name,
        schema: MusicFavoriteSchema,
      },

      {
        name: MusicShare.name,
        schema: MusicShareSchema,
      },

      {
        name: ProducerFollow.name,
        schema: ProducerFollowSchema,
      },

      // Producer profile
      {
        name: ProducerProfile.name,
        schema: ProducerProfileSchema,
      },

      // Music settings
      {
        name: MusicSettings.name,
        schema: MusicSettingsSchema,
      },

      // Producer team
      {
        name: ProducerTeamMember.name,
        schema: ProducerTeamMemberSchema,
      },
    ]),

    // ========================================================================
    // UPLOAD INFRASTRUCTURE
    // ========================================================================

    UploadsModule,

    // ========================================================================
    // PAYMENT / STRIPE INFRASTRUCTURE
    // ========================================================================

    PaymentsModule,
  ],

  // ==========================================================================
  // CONTROLLERS
  // ==========================================================================

  controllers: [
    ProducerTeamController,
    MusicController,
    MusicPurchasesController,
    MusicEntitlementsController,
    MusicAnalyticsController,
    ProducerMusicController,
    ProducerController,
    MusicWebhookController,
    MusicStudioUploadController,
  ],

  // ==========================================================================
  // PROVIDERS
  // ==========================================================================

  providers: [
    // Music
    MusicService,

    // Media processing
    MusicMediaProcessingService,

    // Purchases
    MusicPurchaseService,

    // Entitlements
    MusicEntitlementService,

    // Analytics
    MusicAnalyticsService,

    // Rankings
    MusicRankingService,

    // Producer
    ProducerService,

    // Settings
    MusicSettingsService,

    // Producer team
    ProducerTeamService,

    // Guards
    MusicOwnerGuard,
    MusicEntitlementGuard,
  ],

  // ==========================================================================
  // EXPORTS
  // ==========================================================================

  exports: [
    MusicService,
    MusicMediaProcessingService,
    MusicEntitlementService,
    ProducerService,
    MusicSettingsService,
    ProducerTeamService,
  ],
})
export class MusicModule {}