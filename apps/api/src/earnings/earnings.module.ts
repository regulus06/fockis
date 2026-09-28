import {
  Module,
} from "@nestjs/common";

import {
  MongooseModule,
} from "@nestjs/mongoose";

import {
  EarningsController,
} from "./earnings.controller";

import {
  EarningsService,
} from "./earnings.service";

import {
  CreatorEarning,
  CreatorEarningSchema,
} from "./schemas/creator-earning.schema";

import {
  EarningsTransaction,
  EarningsTransactionSchema,
} from "./schemas/earnings-transaction.schema";

import {
  Withdrawal,
  WithdrawalSchema,
} from "./schemas/withdrawal.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name:
          CreatorEarning.name,
        schema:
          CreatorEarningSchema,
      },

      {
        name:
          EarningsTransaction.name,
        schema:
          EarningsTransactionSchema,
      },

      {
        name:
          Withdrawal.name,
        schema:
          WithdrawalSchema,
      },
    ]),
  ],

  controllers: [
    EarningsController,
  ],

  providers: [
    EarningsService,
  ],

  exports: [
    EarningsService,
  ],
})
export class EarningsModule {}