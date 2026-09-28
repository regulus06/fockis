import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import {
  InjectModel,
} from "@nestjs/mongoose";

import {
  Model,
  Types,
} from "mongoose";

import Stripe from "stripe";

import {
  Wallet,
  WalletDocument,
} from "./schemas/wallet.schema";

import {
  CoinTransaction,
  CoinTransactionDocument,
  CoinTransactionType,
} from "./schemas/coin-transaction.schema";

import {
  COIN_PACKAGES,
  getCoinPackage,
} from "./config/coin-packages";

@Injectable()
export class WalletService {
  private readonly stripe: Stripe;

  constructor(
    @InjectModel(Wallet.name)
    private readonly walletModel: Model<WalletDocument>,

    @InjectModel(CoinTransaction.name)
    private readonly coinTransactionModel: Model<CoinTransactionDocument>,
  ) {
    const secretKey =
      process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
      throw new Error(
        "STRIPE_SECRET_KEY is not configured.",
      );
    }

    this.stripe = new Stripe(
      secretKey,
      {
        apiVersion: "2026-05-27.dahlia",
      },
    );
  }

  // ============================================================
  // GET WALLET
  // ============================================================

  async getWallet(userId: string) {
    this.validateUserId(userId);

    const objectUserId =
      new Types.ObjectId(userId);

    let wallet =
      await this.walletModel.findOne({
        userId: objectUserId,
      });

    if (!wallet) {
      wallet =
        await this.walletModel.create({
          userId: objectUserId,
          coins: 0,
          totalPurchased: 0,
          totalSpent: 0,
          totalReceived: 0,
        });
    }

    return {
      success: true,

      wallet: {
        _id: wallet._id,
        userId: wallet.userId,
        coins: wallet.coins,
        totalPurchased:
          wallet.totalPurchased,
        totalSpent:
          wallet.totalSpent,
        totalReceived:
          wallet.totalReceived,
        createdAt:
          wallet.createdAt,
        updatedAt:
          wallet.updatedAt,
      },
    };
  }

  // ============================================================
  // GET BALANCE
  // ============================================================

  async getBalance(
    userId: string,
  ): Promise<number> {
    this.validateUserId(userId);

    const wallet =
      await this.walletModel.findOne({
        userId:
          new Types.ObjectId(userId),
      });

    return wallet?.coins ?? 0;
  }

  // ============================================================
  // GET AVAILABLE COIN PACKAGES
  // ============================================================

  getCoinPackages() {
    return {
      success: true,
      packages: COIN_PACKAGES,
    };
  }

  // ============================================================
  // CREATE COIN PURCHASE
  //
  // Stripe creates the payment.
  // Coins are NOT credited here.
  // ============================================================

  async createCoinPurchase(
    userId: string,
    packageId: string,
  ) {
    this.validateUserId(userId);

    if (!packageId) {
      throw new BadRequestException(
        "Package ID is required.",
      );
    }

    const coinPackage =
      getCoinPackage(packageId);

    if (!coinPackage) {
      throw new NotFoundException(
        "Coin package not found.",
      );
    }

    const amountInCents =
      Math.round(
        coinPackage.price * 100,
      );

    const paymentIntent =
      await this.stripe.paymentIntents.create({
        amount:
          amountInCents,

        currency:
          coinPackage.currency.toLowerCase(),

        automatic_payment_methods: {
          enabled: true,
        },

        metadata: {
          type:
            "coin_purchase",

          userId,

          packageId:
            coinPackage.id,

          coins:
            String(
              coinPackage.coins,
            ),

          bonus:
            String(
              coinPackage.bonus ?? 0,
            ),
        },

        description:
          `Fockis ${coinPackage.name} Coin Package - ${coinPackage.coins} coins`,
      });

    return {
      success: true,

      clientSecret:
        paymentIntent.client_secret,

      paymentIntentId:
        paymentIntent.id,

      package:
        coinPackage,
    };
  }

  // ============================================================
  // CONFIRM COIN PURCHASE
  //
  // Stripe PaymentIntent must be succeeded before coins
  // are credited.
  // ============================================================

  async confirmCoinPurchase(
    userId: string,
    paymentIntentId: string,
  ) {
    this.validateUserId(userId);

    if (
      !paymentIntentId ||
      !paymentIntentId.startsWith("pi_")
    ) {
      throw new BadRequestException(
        "Invalid Stripe payment intent.",
      );
    }

    const paymentIntent =
      await this.stripe.paymentIntents.retrieve(
        paymentIntentId,
      );

    if (
      paymentIntent.metadata?.userId !==
      userId
    ) {
      throw new BadRequestException(
        "This payment does not belong to this account.",
      );
    }

    if (
      paymentIntent.metadata?.type !==
      "coin_purchase"
    ) {
      throw new BadRequestException(
        "This payment is not a coin purchase.",
      );
    }

    if (
      paymentIntent.status !==
      "succeeded"
    ) {
      throw new BadRequestException(
        `Payment has not completed. Stripe status: ${paymentIntent.status}`,
      );
    }

    const packageId =
      paymentIntent.metadata?.packageId;

    if (!packageId) {
      throw new BadRequestException(
        "Coin package information is missing from the payment.",
      );
    }

    const coinPackage =
      getCoinPackage(packageId);

    if (!coinPackage) {
      throw new BadRequestException(
        "Coin package no longer exists.",
      );
    }

    const bonus =
      coinPackage.bonus ?? 0;

    const totalCoins =
      coinPackage.coins + bonus;

    const expectedAmount =
      Math.round(
        coinPackage.price * 100,
      );

    if (
      paymentIntent.amount !==
      expectedAmount
    ) {
      throw new BadRequestException(
        "Payment amount does not match the selected coin package.",
      );
    }

    // ==========================================================
    // PREVENT DOUBLE CREDIT
    // ==========================================================

    const existingTransaction =
      await this.coinTransactionModel.findOne({
        userId:
          new Types.ObjectId(userId),

        referenceId:
          paymentIntent.id,

        type:
          CoinTransactionType.PURCHASE,
      });

    if (existingTransaction) {
      const wallet =
        await this.getWallet(userId);

      return {
        success: true,

        alreadyProcessed: true,

        message:
          "Coin purchase was already processed.",

        coins:
          wallet.wallet?.coins ?? 0,

        transaction:
          existingTransaction,
      };
    }

    // ==========================================================
    // GET / CREATE WALLET
    // ==========================================================

    const objectUserId =
      new Types.ObjectId(userId);

    let wallet =
      await this.walletModel.findOne({
        userId:
          objectUserId,
      });

    if (!wallet) {
      wallet =
        await this.walletModel.create({
          userId:
            objectUserId,

          coins:
            0,

          totalPurchased:
            0,

          totalSpent:
            0,

          totalReceived:
            0,
        });
    }

    // ==========================================================
    // CREDIT COINS
    // ==========================================================

    wallet.coins +=
      totalCoins;

    wallet.totalPurchased +=
      totalCoins;

    await wallet.save();

    // ==========================================================
    // RECORD PURCHASE
    // ==========================================================

    const transaction =
      await this.coinTransactionModel.create({
        userId:
          objectUserId,

        amount:
          totalCoins,

        type:
          CoinTransactionType.PURCHASE,

        description:
          bonus > 0
            ? `Purchased ${coinPackage.coins} Fockis Coins + ${bonus} bonus coins`
            : `Purchased ${coinPackage.coins} Fockis Coins`,

        referenceId:
          paymentIntent.id,
      });

    return {
      success: true,

      message:
        "Coins purchased successfully.",

      package:
        coinPackage,

      baseCoins:
        coinPackage.coins,

      bonusCoins:
        bonus,

      addedCoins:
        totalCoins,

      coins:
        wallet.coins,

      balance:
        wallet.coins,

      totalPurchased:
        wallet.totalPurchased,

      transaction,
    };
  }

  // ============================================================
  // BUY COINS
  //
  // DEVELOPMENT / BACKWARD COMPATIBILITY
  // ============================================================

  async buyCoins(
    userId: string,
    packageId: string,
    coins: number,
  ) {
    this.validateUserId(userId);

    if (!packageId) {
      throw new BadRequestException(
        "Package ID is required.",
      );
    }

    if (
      !Number.isInteger(coins) ||
      coins <= 0
    ) {
      throw new BadRequestException(
        "Coins must be greater than zero.",
      );
    }

    if (coins > 1_000_000) {
      throw new BadRequestException(
        "Coin purchase amount is too large.",
      );
    }

    const objectUserId =
      new Types.ObjectId(userId);

    let wallet =
      await this.walletModel.findOne({
        userId:
          objectUserId,
      });

    if (!wallet) {
      wallet =
        await this.walletModel.create({
          userId:
            objectUserId,

          coins:
            0,

          totalPurchased:
            0,

          totalSpent:
            0,

          totalReceived:
            0,
        });
    }

    wallet.coins +=
      coins;

    wallet.totalPurchased +=
      coins;

    await wallet.save();

    await this.coinTransactionModel.create({
      userId:
        objectUserId,

      amount:
        coins,

      type:
        CoinTransactionType.PURCHASE,

      description:
        `Purchased ${coins} Fockis Coins`,

      referenceId:
        packageId,
    });

    return {
      success: true,

      message:
        "Coins added successfully.",

      coins:
        wallet.coins,

      addedCoins:
        coins,

      totalPurchased:
        wallet.totalPurchased,
    };
  }

  // ============================================================
  // SPEND COINS
  //
  // USED BY:
  // - LIVE GIFTS
  // - PAID CONTENT
  // - PAID DOWNLOADS
  //
  // ATOMIC BALANCE PROTECTION
  // ============================================================

  async spendCoins(
    userId: string,
    amount: number,
    description: string,
    referenceId = "",
    transactionType: CoinTransactionType =
      CoinTransactionType.GIFT_SENT,
  ) {
    this.validateUserId(userId);

    if (
      !Number.isInteger(amount) ||
      amount <= 0
    ) {
      throw new BadRequestException(
        "Invalid coin amount.",
      );
    }

    const objectUserId =
      new Types.ObjectId(userId);

    // ==========================================================
    // MAKE SURE WALLET EXISTS
    // ==========================================================

    let wallet =
      await this.walletModel.findOne({
        userId:
          objectUserId,
      });

    if (!wallet) {
      wallet =
        await this.walletModel.create({
          userId:
            objectUserId,

          coins:
            0,

          totalPurchased:
            0,

          totalSpent:
            0,

          totalReceived:
            0,
        });
    }

    // ==========================================================
    // CHECK BALANCE
    // ==========================================================

    if (
      wallet.coins < amount
    ) {
      throw new BadRequestException(
        `Not enough coins. Required: ${amount}, available: ${wallet.coins}`,
      );
    }

    // ==========================================================
    // ATOMIC SPEND
    // ==========================================================

    const updatedWallet =
      await this.walletModel.findOneAndUpdate(
        {
          userId:
            objectUserId,

          coins: {
            $gte:
              amount,
          },
        },

        {
          $inc: {
            coins:
              -amount,

            totalSpent:
              amount,
          },
        },

        {
          new: true,
        },
      );

    if (!updatedWallet) {
      const currentWallet =
        await this.walletModel.findOne({
          userId:
            objectUserId,
        });

      const available =
        currentWallet?.coins ?? 0;

      throw new BadRequestException(
        `Not enough coins. Required: ${amount}, available: ${available}`,
      );
    }

    // ==========================================================
    // RECORD TRANSACTION
    // ==========================================================

    const transaction =
      await this.coinTransactionModel.create({
        userId:
          objectUserId,

        amount:
          -amount,

        type:
          transactionType,

        description:
          description ||
          `Spent ${amount} Fockis Coins`,

        referenceId,
      });

    console.log(
      "[WalletService] Coins spent:",
      {
        userId,

        amount,

        previousBalance:
          wallet.coins,

        newBalance:
          updatedWallet.coins,

        transactionType,

        referenceId,
      },
    );

    return {
      success: true,

      coins:
        updatedWallet.coins,

      spentCoins:
        amount,

      totalSpent:
        updatedWallet.totalSpent,

      transaction,
    };
  }

  // ============================================================
  // SPEND COINS ON CONTENT
  // ============================================================

  async spendContentCoins(
    userId: string,
    amount: number,
    description =
      "Purchased paid content",
    referenceId = "",
  ) {
    return this.spendCoins(
      userId,
      amount,
      description,
      referenceId,
      CoinTransactionType.CONTENT_PURCHASE,
    );
  }

  // ============================================================
  // PURCHASE CONTENT WITH COINS
  //
  // THIS METHOD FIXES:
  //
  // Property 'purchaseContentWithCoins'
  // does not exist on type 'WalletService'
  //
  // FLOW:
  //
  // Buyer:
  //   - amount
  //
  // Creator:
  //   + creatorAmount
  //
  // Example:
  //
  // Content price: 100 coins
  // Platform fee: 20 coins
  // Creator: 80 coins
  //
  // Buyer loses 100.
  // Creator receives 80.
  // ============================================================

  async purchaseContentWithCoins(
    buyerId: string,
    creatorId: string,
    amount: number,
    creatorAmount: number,
    referenceId: string,
    contentId: string,
    description =
      "Purchased paid content",
  ) {
    this.validateUserId(
      buyerId,
    );

    this.validateUserId(
      creatorId,
    );

    if (
      !Number.isInteger(amount) ||
      amount <= 0
    ) {
      throw new BadRequestException(
        "Invalid content purchase amount.",
      );
    }

    if (
      !Number.isInteger(
        creatorAmount,
      ) ||
      creatorAmount <= 0
    ) {
      throw new BadRequestException(
        "Invalid creator revenue amount.",
      );
    }

    if (
      creatorAmount > amount
    ) {
      throw new BadRequestException(
        "Creator amount cannot exceed the purchase amount.",
      );
    }

    if (!referenceId) {
      throw new BadRequestException(
        "Purchase reference ID is required.",
      );
    }

    if (!contentId) {
      throw new BadRequestException(
        "Content ID is required.",
      );
    }

    // ==========================================================
    // PREVENT DUPLICATE CONTENT PURCHASE
    //
    // The purchase ID is used as the reference ID.
    // ==========================================================

    const existingBuyerTransaction =
      await this.coinTransactionModel.findOne({
        userId:
          new Types.ObjectId(
            buyerId,
          ),

        referenceId,

        type:
          CoinTransactionType.CONTENT_PURCHASE,
      });

    if (
      existingBuyerTransaction
    ) {
      const existingCreatorTransaction =
        await this.coinTransactionModel.findOne({
          userId:
            new Types.ObjectId(
              creatorId,
            ),

          referenceId,

          type:
            CoinTransactionType.CONTENT_REVENUE,
        });

      const buyerWallet =
        await this.getWallet(
          buyerId,
        );

      const creatorWallet =
        await this.getWallet(
          creatorId,
        );

      return {
        success: true,

        alreadyProcessed: true,

        message:
          "Content purchase was already processed.",

        buyer: {
          coins:
            buyerWallet.wallet
              ?.coins ?? 0,

          transaction:
            existingBuyerTransaction,
        },

        creator: {
          coins:
            creatorWallet.wallet
              ?.coins ?? 0,

          transaction:
            existingCreatorTransaction,
        },
      };
    }

    // ==========================================================
    // SPEND FROM BUYER
    // ==========================================================

    const buyerResult =
      await this.spendCoins(
        buyerId,

        amount,

        description ||
          `Purchased content ${contentId}`,

        referenceId,

        CoinTransactionType.CONTENT_PURCHASE,
      );

    // ==========================================================
    // CREDIT CREATOR
    // ==========================================================

    let creatorResult:
      Awaited<
        ReturnType<
          WalletService["receiveContentRevenue"]
        >
      >;

    try {
      creatorResult =
        await this.receiveContentRevenue(
          creatorId,

          creatorAmount,

          `Content revenue from purchase ${contentId}`,

          referenceId,
        );
    } catch (error) {
      // ========================================================
      // COMPENSATE BUYER IF CREATOR CREDIT FAILS
      //
      // The wallet debit already happened. Put the coins back
      // so the buyer is not charged without creator revenue.
      // ========================================================

      try {
        const buyerWallet =
          await this.walletModel.findOne({
            userId:
              new Types.ObjectId(
                buyerId,
              ),
          });

        if (buyerWallet) {
          buyerWallet.coins +=
            amount;

          buyerWallet.totalSpent =
            Math.max(
              0,
              buyerWallet.totalSpent -
                amount,
            );

          await buyerWallet.save();
        }

        await this.coinTransactionModel.deleteOne({
          _id:
            buyerResult.transaction
              ?._id,
        });
      } catch (
        compensationError
      ) {
        console.error(
          "[WalletService] CRITICAL: Failed to compensate buyer after creator credit failure.",
          {
            buyerId,
            creatorId,
            amount,
            creatorAmount,
            referenceId,
            compensationError,
          },
        );
      }

      throw error;
    }

    console.log(
      "[WalletService] Content purchase completed:",
      {
        buyerId,

        creatorId,

        contentId,

        amount,

        creatorAmount,

        referenceId,

        buyerBalance:
          buyerResult.coins,

        creatorBalance:
          creatorResult.coins,
      },
    );

    return {
      success: true,

      alreadyProcessed: false,

      buyer: {
        coins:
          buyerResult.coins,

        spentCoins:
          amount,

        transaction:
          buyerResult.transaction,
      },

      creator: {
        coins:
          creatorResult.coins,

        receivedCoins:
          creatorAmount,

        transaction:
          creatorResult.transaction,
      },

      purchase: {
        contentId,

        amount,

        creatorAmount,

        referenceId,
      },

      buyerTransaction:
        buyerResult.transaction,

      creatorTransaction:
        creatorResult.transaction,
    };
  }

  // ============================================================
  // RECEIVE GIFT COINS
  //
  // USED BY LIVE GIFTS
  // ============================================================

  async receiveGiftCoins(
    userId: string,
    amount: number,
    description =
      "LIVE gift received",
    referenceId = "",
  ) {
    this.validateUserId(userId);

    if (
      !Number.isInteger(amount) ||
      amount <= 0
    ) {
      throw new BadRequestException(
        "Invalid received coin amount.",
      );
    }

    const objectUserId =
      new Types.ObjectId(userId);

    let wallet =
      await this.walletModel.findOne({
        userId:
          objectUserId,
      });

    if (!wallet) {
      wallet =
        await this.walletModel.create({
          userId:
            objectUserId,

          coins:
            amount,

          totalPurchased:
            0,

          totalSpent:
            0,

          totalReceived:
            amount,
        });
    } else {
      wallet.coins +=
        amount;

      wallet.totalReceived +=
        amount;

      await wallet.save();
    }

    await this.coinTransactionModel.create({
      userId:
        objectUserId,

      amount,

      type:
        CoinTransactionType.GIFT_RECEIVED,

      description,

      referenceId,
    });

    console.log(
      "[WalletService] Gift coins received:",
      {
        userId,

        amount,

        newBalance:
          wallet.coins,

        referenceId,
      },
    );

    return {
      success: true,

      coins:
        wallet.coins,

      receivedCoins:
        amount,

      totalReceived:
        wallet.totalReceived,
    };
  }

  // ============================================================
  // RECEIVE CONTENT REVENUE
  //
  // CREATOR RECEIVES THE CREATOR PORTION OF A
  // PAID CONTENT PURCHASE.
  // ============================================================

  async receiveContentRevenue(
    creatorId: string,
    amount: number,
    description =
      "Paid content revenue",
    referenceId = "",
  ) {
    this.validateUserId(
      creatorId,
    );

    if (
      !Number.isInteger(amount) ||
      amount <= 0
    ) {
      throw new BadRequestException(
        "Invalid creator revenue amount.",
      );
    }

    const objectCreatorId =
      new Types.ObjectId(
        creatorId,
      );

    // ==========================================================
    // PREVENT DUPLICATE CREATOR CREDIT
    // ==========================================================

    if (referenceId) {
      const existingTransaction =
        await this.coinTransactionModel.findOne({
          userId:
            objectCreatorId,

          referenceId,

          type:
            CoinTransactionType.CONTENT_REVENUE,
        });

      if (
        existingTransaction
      ) {
        const existingWallet =
          await this.walletModel.findOne({
            userId:
              objectCreatorId,
          });

        return {
          success: true,

          alreadyProcessed: true,

          coins:
            existingWallet?.coins ??
            0,

          receivedCoins:
            amount,

          totalReceived:
            existingWallet?.totalReceived ??
            0,

          transaction:
            existingTransaction,
        };
      }
    }

    let wallet =
      await this.walletModel.findOne({
        userId:
          objectCreatorId,
      });

    if (!wallet) {
      wallet =
        await this.walletModel.create({
          userId:
            objectCreatorId,

          coins:
            amount,

          totalPurchased:
            0,

          totalSpent:
            0,

          totalReceived:
            amount,
        });
    } else {
      wallet.coins +=
        amount;

      wallet.totalReceived +=
        amount;

      await wallet.save();
    }

    const transaction =
      await this.coinTransactionModel.create({
        userId:
          objectCreatorId,

        amount,

        type:
          CoinTransactionType.CONTENT_REVENUE,

        description,

        referenceId,
      });

    console.log(
      "[WalletService] Content revenue received:",
      {
        creatorId,

        amount,

        newBalance:
          wallet.coins,

        referenceId,
      },
    );

    return {
      success: true,

      coins:
        wallet.coins,

      receivedCoins:
        amount,

      totalReceived:
        wallet.totalReceived,

      transaction,
    };
  }

  // ============================================================
  // ADD BONUS
  // ============================================================

  async addBonus(
    userId: string,
    amount: number,
    description =
      "Fockis bonus",
    referenceId = "",
  ) {
    this.validateUserId(userId);

    if (
      !Number.isInteger(amount) ||
      amount <= 0
    ) {
      throw new BadRequestException(
        "Invalid bonus amount.",
      );
    }

    const objectUserId =
      new Types.ObjectId(userId);

    let wallet =
      await this.walletModel.findOne({
        userId:
          objectUserId,
      });

    if (!wallet) {
      wallet =
        await this.walletModel.create({
          userId:
            objectUserId,

          coins:
            amount,

          totalPurchased:
            0,

          totalSpent:
            0,

          totalReceived:
            0,
        });
    } else {
      wallet.coins +=
        amount;

      await wallet.save();
    }

    await this.coinTransactionModel.create({
      userId:
        objectUserId,

      amount,

      type:
        CoinTransactionType.BONUS,

      description,

      referenceId,
    });

    return {
      success: true,

      coins:
        wallet.coins,

      addedCoins:
        amount,
    };
  }

  // ============================================================
  // GET TRANSACTIONS
  // ============================================================

  async getTransactions(
    userId: string,
  ) {
    this.validateUserId(userId);

    return this.coinTransactionModel
      .find({
        userId:
          new Types.ObjectId(userId),
      })
      .sort({
        createdAt: -1,
      })
      .limit(100)
      .lean();
  }

  // ============================================================
  // VALIDATE USER ID
  // ============================================================

  private validateUserId(
    userId: string,
  ): void {
    if (
      !userId ||
      !Types.ObjectId.isValid(userId)
    ) {
      throw new BadRequestException(
        "Invalid user ID.",
      );
    }
  }
}