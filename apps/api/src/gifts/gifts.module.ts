import {
  Module,
} from "@nestjs/common";

import {
  MongooseModule,
} from "@nestjs/mongoose";

import {
  GiftsController,
} from "./gifts.controller";

import {
  GiftsService,
} from "./gifts.service";

import {
  GiftsGateway,
} from "./gateway/gifts.gateway";

import {
  Gift,
  GiftSchema,
} from "./schemas/gift.schema";

import {
  GiftTransaction,
  GiftTransactionSchema,
} from "./schemas/gift-transaction.schema";

import {
  CreatorEarning,
  CreatorEarningSchema,
} from "./schemas/creator-earning.schema";

import {
  WalletModule,
} from "../wallet/wallet.module";

import {
  PostsModule,
} from "../posts/posts.module";


// ============================================================
// GIFTS MODULE
//
// Handles:
//
// - LIVE gifts
// - Gift catalog
// - Gift transactions
// - Creator earnings
// - LIVE gift socket events
// - Persisting giftsCount on Fockis feed posts
//
// WalletModule owns:
//
// - Wallet
// - CoinTransaction
// - WalletService
//
// PostsModule owns:
//
// - Post
// - PostsService
//
// GiftsService uses WalletService for all coin operations,
// and PostsService to persist giftsCount on the post so the
// count survives refresh and is visible to every viewer.
// ============================================================

@Module({

  imports: [

    // ========================================================
    // WALLET
    //
    // Provides WalletService.
    // WalletModule already registers:
    //
    // Wallet
    // CoinTransaction
    //
    // ========================================================

    WalletModule,


    // ========================================================
    // POSTS
    //
    // Provides PostsService, used to persist giftsCount
    // directly on the Post document.
    // ========================================================

    PostsModule,


    // ========================================================
    // GIFTS MODELS
    // ========================================================

    MongooseModule.forFeature([

      {
        name: Gift.name,
        schema: GiftSchema,
      },

      {
        name: GiftTransaction.name,
        schema: GiftTransactionSchema,
      },

      {
        name: CreatorEarning.name,
        schema: CreatorEarningSchema,
      },

    ]),

  ],


  // ==========================================================
  // CONTROLLERS
  // ==========================================================

  controllers: [

    GiftsController,

  ],


  // ==========================================================
  // SERVICES / GATEWAY
  // ==========================================================

  providers: [

    GiftsService,

    GiftsGateway,

  ],


  // ==========================================================
  // EXPORTS
  // ==========================================================

  exports: [

    GiftsService,

    GiftsGateway,

  ],

})

export class GiftsModule {}