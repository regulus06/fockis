import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { MongooseModule } from "@nestjs/mongoose";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { join } from "path";

import { AppController } from "./app.controller";
import { AppService } from "./app.service";

import { AcademyModule } from "./academy/academy.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
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
import { UploadsModule } from "./uploads/uploads.module";
import { MediaModule } from "./media/media.module";
import { DocumentScannerModule } from "./document-scanner/document-scanner.module";
import { CreateModule } from "./create/create.module";
import { DesignModule } from "./design/design.module";
import { SellerModule } from "./seller/seller.module";
import { StoresModule } from "./stores/stores.module";
import { BusinessesModule } from "./businesses/businesses.module";
import { RealEstateModule } from "./realestate/realestate.module";
import { CareersModule } from "./careers/careers.module";
import { PaymentsModule } from "./payments/payments.module";
import { SubscriptionsModule } from "./subscriptions/subscriptions.module";
import { BehaviorModule } from "./analytics/behavior.module";

import { AdminModule } from "./admin/admin.module";
import { FinanceAdminModule } from "./admin/finance/finance.module";

// FIXED: actual folder is admin/marketing-admin
import { MarketingAdminModule } from "./admin/marketing-admin/marketing-admin.module";

import { NotificationsModule } from "./notifications/notifications.module";
import { SavedModule } from "./saved/saved.module";
import { MarketingModule } from "./marketing/marketing.module";
import { GiftsModule } from "./gifts/gifts.module";
import { WalletModule } from "./wallet/wallet.module";
import { EarningsModule } from "./earnings/earnings.module";
import { ContentMonetizationModule } from "./content-monetization/content-monetization.module";
import { MeetingsModule } from "./meetings/meetings.module";
import { LiveModule } from "./my-live/live.module";
import { MapModule } from "./map/map.module";
import { FockisShopModule } from "./fockis-shop/fockis-shop.module";

import { ListingsModule } from "./fockis-travel-backend/travel-src/listings/listings.module";
import { BusinessModule } from "./fockis-travel-backend/travel-src/business/business.module";
import { TripsModule } from "./fockis-travel-backend/travel-src/trips/trips.module";
import { WishlistModule } from "./fockis-travel-backend/travel-src/wishlist/wishlist.module";
import { PartnersModule } from "./fockis-travel-backend/travel-src/partners/partners.module";
import { BookingsModule } from "./fockis-travel-backend/travel-src/bookings/bookings.module";
import { TravelAdminModule } from "./fockis-travel-backend/admin/travel-admin.module";

import { ChurchModule } from "./church/church.module";
import { MusicModule } from "./music/music.module";
import { OrganizationIdentityModule } from "./organization-identity/organization-identity.module";
import { TranslationModule } from "./translation/translation.module";

import { AiModule } from "./ai/ai.module";
import { AiAdminModule } from "./fockis-ai-admin/ai-admin.module";

import { JwtAuthGuard } from "./auth/jwt-auth.guard";
import { RbacGuard } from "./admin/rbac/rbac.guard";
import { DestructiveGuard } from "./admin/safety/destructive.guard";

@Module({
  imports: [
    // ============================================================
    // CONFIGURATION
    // ============================================================

    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: join(__dirname, "../.env"),
      ignoreEnvFile: false,
    }),

    // ============================================================
    // EVENTS
    // ============================================================

    EventEmitterModule.forRoot(),

    // ============================================================
    // MONGODB
    // ============================================================

    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],

      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>("MONGO_URI") || "",
        serverSelectionTimeoutMS: 5000,
      }),
    }),

    // ============================================================
    // CORE
    // ============================================================

    AcademyModule,
    AuthModule,
    UsersModule,

    // ============================================================
    // SOCIAL
    // ============================================================

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

    // ============================================================
    // MEDIA / CREATE
    // ============================================================

    UploadsModule,
    MediaModule,
    DocumentScannerModule,
    CreateModule,
    DesignModule,

    // ============================================================
    // MARKETPLACE / BUSINESS
    // ============================================================

    SellerModule,
    StoresModule,
    BusinessesModule,
    RealEstateModule,
    CareersModule,

    // ============================================================
    // PAYMENTS / MONETIZATION
    // ============================================================

    PaymentsModule,
    SubscriptionsModule,
    ContentMonetizationModule,
    WalletModule,
    EarningsModule,

    // ============================================================
    // ANALYTICS / ADMIN
    // ============================================================

    BehaviorModule,
    AdminModule,

    // ============================================================
    // FINANCE ADMIN
    // ============================================================

    FinanceAdminModule,

    // ============================================================
    // MARKETING ADMIN
    // ============================================================

    MarketingAdminModule,

    // ============================================================
    // OTHER SERVICES
    // ============================================================

    NotificationsModule,
    SavedModule,
    MarketingModule,
    GiftsModule,

    // ============================================================
    // MEETINGS / LIVE / MAP
    // ============================================================

    MeetingsModule,
    LiveModule,
    MapModule,

    // ============================================================
    // FOCKIS SHOP
    // ============================================================

    FockisShopModule,

    // ============================================================
    // FOCKIS TRAVEL
    // ============================================================

    ListingsModule,
    BusinessModule,
    TripsModule,
    WishlistModule,
    PartnersModule,
    BookingsModule,
    TravelAdminModule,

    // ============================================================
    // CHURCH / MUSIC / TRANSLATION
    // ============================================================

    ChurchModule,
    MusicModule,
    OrganizationIdentityModule,
    TranslationModule,

    // ============================================================
    // FOCKIS AI
    // ============================================================

    AiModule,
    AiAdminModule,
  ],

  controllers: [
    AppController,
  ],

  providers: [
    AppService,

    // ============================================================
    // GLOBAL JWT AUTHENTICATION
    // ============================================================

    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },

    // ============================================================
    // GLOBAL RBAC
    // ============================================================

    {
      provide: APP_GUARD,
      useClass: RbacGuard,
    },

    // ============================================================
    // GLOBAL DESTRUCTIVE ACTION SAFETY
    // ============================================================

    {
      provide: APP_GUARD,
      useClass: DestructiveGuard,
    },
  ],
})
export class AppModule {}