import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";

import { MongooseModule } from "@nestjs/mongoose";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";

import { join } from "path";

// ============================================================================
// CORE
// ============================================================================

import { AppController } from "./app.controller";
import { AppService } from "./app.service";

import { AcademyModule } from "./academy/academy.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";

// ============================================================================
// SOCIAL
// ============================================================================

import { PostsModule } from "./posts/posts.module";
import { StoriesModule } from "./stories/stories.module";
import { FeedModule } from "./feed/feed.module";
import { FollowsModule } from "./follows/follows.module";
import { FriendsModule } from "./friends/friends.module";
import { GroupsModule } from "./groups/groups.module";
import { RepostsModule } from "./reposts/reposts.module";
import { WavesModule } from "./waves/waves.module";
import { EventsModule } from "./events/events.module";
import { MessagesModule } from "./messages/messages.module";
import { MessageAdminModule } from "./message-admin/message-admin.module";

// ============================================================================
// MEDIA / CREATE
// ============================================================================

import { UploadsModule } from "./uploads/uploads.module";
import { MediaModule } from "./media/media.module";
import { DocumentScannerModule } from "./document-scanner/document-scanner.module";
import { CreateModule } from "./create/create.module";
import { DesignModule } from "./design/design.module";

// ============================================================================
// MARKETPLACE / BUSINESS
// ============================================================================

import { SellerModule } from "./seller/seller.module";
import { StoresModule } from "./stores/stores.module";
import { BusinessesModule } from "./businesses/businesses.module";
import { RealEstateModule } from "./realestate/realestate.module";
import { CareersModule } from "./careers/careers.module";

// ============================================================================
// PAYMENTS / MONETIZATION
// ============================================================================

import { PaymentsModule } from "./payments/payments.module";
import { SubscriptionsModule } from "./subscriptions/subscriptions.module";
import { ContentMonetizationModule } from "./content-monetization/content-monetization.module";

// ============================================================================
// WALLET / EARNINGS
// ============================================================================

import { WalletModule } from "./wallet/wallet.module";
import { EarningsModule } from "./earnings/earnings.module";

// ============================================================================
// ANALYTICS / ADMIN
// ============================================================================

import { BehaviorModule } from "./analytics/behavior.module";
import { AdminModule } from "./admin/admin.module";

// ============================================================================
// FINANCE ADMIN
// ============================================================================

import { FinanceAdminModule } from "./admin/finance/finance.module";

// ============================================================================
// MARKETING ADMIN
// ============================================================================

import { MarketingAdminModule } from "./admin/marketing-admin/marketing-admin.module";

// ============================================================================
// OTHER SERVICES
// ============================================================================

import { NotificationsModule } from "./notifications/notifications.module";
import { SavedModule } from "./saved/saved.module";
import { MarketingModule } from "./marketing/marketing.module";
import { GiftsModule } from "./gifts/gifts.module";

// ============================================================================
// MEETINGS / LIVE / MAP
// ============================================================================

import { MeetingsModule } from "./meetings/meetings.module";
import { LiveModule } from "./my-live/live.module";
import { MapModule } from "./map/map.module";

// ============================================================================
// FOCKIS SHOP
// ============================================================================

import { FockisShopModule } from "./fockis-shop/fockis-shop.module";

// ============================================================================
// FOCKIS TRAVEL
// ============================================================================

import {
  ListingsModule,
} from "./fockis-travel-backend/travel-src/listings/listings.module";

import {
  BusinessModule,
} from "./fockis-travel-backend/travel-src/business/business.module";

import {
  TripsModule,
} from "./fockis-travel-backend/travel-src/trips/trips.module";

import {
  WishlistModule,
} from "./fockis-travel-backend/travel-src/wishlist/wishlist.module";

import {
  PartnersModule,
} from "./fockis-travel-backend/travel-src/partners/partners.module";

import {
  BookingsModule,
} from "./fockis-travel-backend/travel-src/bookings/bookings.module";

import {
  TravelAdminModule,
} from "./fockis-travel-backend/admin/travel-admin.module";

// ============================================================================
// CHURCH / MUSIC / TRANSLATION
// ============================================================================

import { ChurchModule } from "./church/church.module";
import { MusicModule } from "./music/music.module";
import {
  OrganizationIdentityModule,
} from "./organization-identity/organization-identity.module";
import { TranslationModule } from "./translation/translation.module";

// ============================================================================
// FOCKIS AI
// ============================================================================

import { AiModule } from "./ai/ai.module";
import { AiAdminModule } from "./fockis-ai-admin/ai-admin.module";

// ============================================================================
// AUTHORIZATION / SECURITY GUARDS
// ============================================================================

import { JwtAuthGuard } from "./auth/jwt-auth.guard";
import { RbacGuard } from "./admin/rbac/rbac.guard";
import { DestructiveGuard } from "./admin/safety/destructive.guard";

// ============================================================================
// APPLICATION MODULE
// ============================================================================

@Module({
  imports: [
    // ========================================================================
    // CONFIGURATION
    // ========================================================================

    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: join(__dirname, "../.env"),
      ignoreEnvFile: false,
    }),

    // ========================================================================
    // EVENTS
    // ========================================================================

    EventEmitterModule.forRoot(),

    // ========================================================================
    // RATE LIMITING
    //
    // Global baseline:
    //
    //   120 requests / 60 seconds / client
    //
    // This protects the API against:
    //
    //   - request floods
    //   - basic brute-force attacks
    //   - accidental request loops
    //   - abusive automated clients
    //
    // More sensitive endpoints such as login and password reset will receive
    // stricter route-specific limits later.
    // ========================================================================

    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 120,
      },
    ]),

    // ========================================================================
    // MONGODB - SECURITY HARDENED
    // ========================================================================

    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],

      useFactory: (configService: ConfigService) => {
        const mongoUri =
          configService.get<string>("MONGO_URI");

        const nodeEnv =
          configService
            .get<string>("NODE_ENV")
            ?.trim()
            .toLowerCase() ||
          "development";

        // --------------------------------------------------------
        // FAIL CLOSED
        // --------------------------------------------------------

        if (!mongoUri || !mongoUri.trim()) {
          throw new Error(
            "SECURITY ERROR: MONGO_URI is missing. Refusing to start the API.",
          );
        }

        const uri = mongoUri.trim();

        // --------------------------------------------------------
        // BASIC URI VALIDATION
        // --------------------------------------------------------

        if (
          !uri.startsWith("mongodb://") &&
          !uri.startsWith("mongodb+srv://")
        ) {
          throw new Error(
            "SECURITY ERROR: MONGO_URI must use mongodb:// or mongodb+srv://.",
          );
        }

        // --------------------------------------------------------
        // PRODUCTION PROTECTION
        // --------------------------------------------------------

        if (
          nodeEnv === "production" &&
          /mongodb:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(uri)
        ) {
          throw new Error(
            "SECURITY ERROR: Production cannot use a localhost MongoDB connection.",
          );
        }

        // --------------------------------------------------------
        // MONGOOSE CONNECTION OPTIONS
        // --------------------------------------------------------

        return {
          uri,

          // TLS encryption for MongoDB traffic.
          tls: true,

          // Never accept an invalid MongoDB TLS certificate.
          tlsAllowInvalidCertificates: false,

          // Fail relatively quickly if MongoDB is unavailable.
          serverSelectionTimeoutMS: 10_000,

          // Prevent indefinitely hanging socket operations.
          socketTimeoutMS: 45_000,

          // Connection pool protection.
          maxPoolSize: 20,
          minPoolSize: 2,

          // Keep connections alive.
          heartbeatFrequencyMS: 10_000,

          // Retry transient MongoDB/network failures.
          retryWrites: true,

          // Modern MongoDB behavior.
          retryReads: true,
        };
      },
    }),

    // ========================================================================
    // CORE
    // ========================================================================

    AcademyModule,
    AuthModule,
    UsersModule,

    // ========================================================================
    // SOCIAL
    // ========================================================================

    PostsModule,
    StoriesModule,
    FeedModule,
    FollowsModule,
    FriendsModule,
    GroupsModule,
    RepostsModule,
    WavesModule,
    EventsModule,
    MessagesModule,
    MessageAdminModule,

    // ========================================================================
    // MEDIA / CREATE
    // ========================================================================

    UploadsModule,
    MediaModule,
    DocumentScannerModule,
    CreateModule,
    DesignModule,

    // ========================================================================
    // MARKETPLACE / BUSINESS
    // ========================================================================

    SellerModule,
    StoresModule,
    BusinessesModule,
    RealEstateModule,
    CareersModule,

    // ========================================================================
    // PAYMENTS / MONETIZATION
    // ========================================================================

    PaymentsModule,
    SubscriptionsModule,
    ContentMonetizationModule,
    WalletModule,
    EarningsModule,

    // ========================================================================
    // ANALYTICS / ADMIN
    // ========================================================================

    BehaviorModule,
    AdminModule,

    // ========================================================================
    // FINANCE ADMIN
    // ========================================================================

    FinanceAdminModule,

    // ========================================================================
    // MARKETING ADMIN
    // ========================================================================

    MarketingAdminModule,

    // ========================================================================
    // OTHER SERVICES
    // ========================================================================

    NotificationsModule,
    SavedModule,
    MarketingModule,
    GiftsModule,

    // ========================================================================
    // MEETINGS / LIVE / MAP
    // ========================================================================

    MeetingsModule,
    LiveModule,
    MapModule,

    // ========================================================================
    // FOCKIS SHOP
    // ========================================================================

    FockisShopModule,

    // ========================================================================
    // FOCKIS TRAVEL
    // ========================================================================

    ListingsModule,
    BusinessModule,
    TripsModule,
    WishlistModule,
    PartnersModule,
    BookingsModule,
    TravelAdminModule,

    // ========================================================================
    // CHURCH / MUSIC / TRANSLATION
    // ========================================================================

    ChurchModule,
    MusicModule,
    OrganizationIdentityModule,
    TranslationModule,

    // ========================================================================
    // FOCKIS AI
    // ========================================================================

    AiModule,
    AiAdminModule,
  ],

  controllers: [
    AppController,
  ],

  providers: [
    AppService,

    // ========================================================================
    // GLOBAL RATE LIMITING
    // ========================================================================

    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },

    // ========================================================================
    // GLOBAL JWT AUTHENTICATION
    // ========================================================================

    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },

    // ========================================================================
    // GLOBAL RBAC
    // ========================================================================

    {
      provide: APP_GUARD,
      useClass: RbacGuard,
    },

    // ========================================================================
    // GLOBAL DESTRUCTIVE ACTION SAFETY
    // ========================================================================

    {
      provide: APP_GUARD,
      useClass: DestructiveGuard,
    },
  ],
})
export class AppModule {}