import {
  Module,
} from "@nestjs/common";

import {
  MongooseModule,
} from "@nestjs/mongoose";

import {
  WalletController,
} from "./wallet.controller";

import {
  WalletService,
} from "./wallet.service";

import {
  Wallet,
  WalletSchema,
} from "./schemas/wallet.schema";

import {
  CoinTransaction,
  CoinTransactionSchema,
} from "./schemas/coin-transaction.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name:
          Wallet.name,

        schema:
          WalletSchema,
      },

      {
        name:
          CoinTransaction.name,

        schema:
          CoinTransactionSchema,
      },
    ]),
  ],

  controllers: [
    WalletController,
  ],

  providers: [
    WalletService,
  ],

  exports: [
    WalletService,
  ],
})
export class WalletModule {}