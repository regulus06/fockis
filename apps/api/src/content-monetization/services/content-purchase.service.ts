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

import {
  PaidContent,
  PaidContentDocument,
} from "../schemas/paid-content.schema";

import {
  ContentPurchase,
  ContentPurchaseDocument,
} from "../schemas/content-purchase.schema";

import {
  ContentEntitlement,
  ContentEntitlementDocument,
} from "../schemas/content-entitlement.schema";

import {
  PaymentMethod,
  PurchaseStatus,
  PurchaseType,
  EntitlementType,
} from "../types/content-monetization.types";

import {
  WalletService,
} from "../../wallet/wallet.service";

@Injectable()
export class ContentPurchaseService {
  constructor(
    @InjectModel(PaidContent.name)
    private readonly paidContentModel:
      Model<PaidContentDocument>,

    @InjectModel(ContentPurchase.name)
    private readonly purchaseModel:
      Model<ContentPurchaseDocument>,

    @InjectModel(ContentEntitlement.name)
    private readonly entitlementModel:
      Model<ContentEntitlementDocument>,

    private readonly walletService:
      WalletService,
  ) {}

  // ============================================================
  // CREATE PURCHASE
  //
  // Creates a PENDING purchase.
  //
  // COINS:
  // The wallet charge happens in completePurchase().
  //
  // STRIPE:
  // Stripe payment is handled separately.
  // ============================================================

  async createPurchase(
    buyerId: string,
    contentId: string,
    purchaseType: PurchaseType,
    paymentMethod: PaymentMethod,
  ) {
    if (
      !Types.ObjectId.isValid(
        buyerId,
      )
    ) {
      throw new BadRequestException(
        "Invalid buyer ID",
      );
    }

    if (
      !Types.ObjectId.isValid(
        contentId,
      )
    ) {
      throw new BadRequestException(
        "Invalid content ID",
      );
    }

    if (!purchaseType) {
      throw new BadRequestException(
        "Purchase type is required",
      );
    }

    if (!paymentMethod) {
      throw new BadRequestException(
        "Payment method is required",
      );
    }

    const content =
      await this.paidContentModel.findOne({
        contentId:
          new Types.ObjectId(
            contentId,
          ),

        active: true,
      });

    if (!content) {
      throw new NotFoundException(
        "Monetized content not found",
      );
    }

    if (!content.isPaid) {
      throw new BadRequestException(
        "This content is free",
      );
    }

    // ==========================================================
    // VALIDATE DOWNLOAD PERMISSION
    // ==========================================================

    if (
      purchaseType ===
        PurchaseType.DOWNLOAD &&
      !content.downloadEnabled
    ) {
      throw new BadRequestException(
        "Downloads are disabled for this content",
      );
    }

    if (
      purchaseType ===
        PurchaseType.STREAM_AND_DOWNLOAD &&
      !content.downloadEnabled
    ) {
      throw new BadRequestException(
        "Downloads are disabled for this content",
      );
    }

    // ==========================================================
    // DETERMINE PRICE
    // ==========================================================

    let amount =
      Number(
        content.streamPrice,
      );

    if (
      purchaseType ===
      PurchaseType.DOWNLOAD
    ) {
      amount =
        Number(
          content.downloadPrice,
        );
    }

    if (
      purchaseType ===
      PurchaseType.STREAM_AND_DOWNLOAD
    ) {
      if (
        content.downloadIncludedWithStream
      ) {
        amount =
          Number(
            content.streamPrice,
          );
      } else {
        amount =
          Number(
            content.streamPrice,
          ) +
          Number(
            content.downloadPrice,
          );
      }
    }

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      throw new BadRequestException(
        "Invalid content price",
      );
    }

    // ==========================================================
    // ROUND MONEY VALUE
    // ==========================================================

    amount =
      Number(
        amount.toFixed(2),
      );

    // ==========================================================
    // PREVENT DUPLICATE COMPLETED PURCHASE
    // ==========================================================

    const existingPurchase =
      await this.purchaseModel.findOne({
        buyerId:
          new Types.ObjectId(
            buyerId,
          ),

        contentId:
          new Types.ObjectId(
            contentId,
          ),

        purchaseType,

        status:
          PurchaseStatus.COMPLETED,
      });

    if (existingPurchase) {
      return {
        alreadyPurchased: true,

        purchase:
          existingPurchase,
      };
    }

    // ==========================================================
    // PLATFORM FEE
    //
    // 20% platform
    // 80% creator
    // ==========================================================

    const platformFee =
      Number(
        (
          amount * 0.2
        ).toFixed(2),
      );

    const creatorAmount =
      Number(
        (
          amount -
          platformFee
        ).toFixed(2),
      );

    // ==========================================================
    // CREATE PENDING PURCHASE
    // ==========================================================

    const purchase =
      await this.purchaseModel.create({
        buyerId:
          new Types.ObjectId(
            buyerId,
          ),

        creatorId:
          content.creatorId,

        contentId:
          content.contentId,

        contentType:
          content.contentType,

        purchaseType,

        amount,

        currency:
          content.currency,

        paymentMethod,

        status:
          PurchaseStatus.PENDING,

        platformFee,

        creatorAmount,
      });

    return {
      alreadyPurchased: false,

      purchase,

      amount,

      currency:
        content.currency,

      paymentMethod,
    };
  }

  // ============================================================
  // COMPLETE PURCHASE
  //
  // COINS:
  //
  // Buyer wallet:
  //     - amount
  //
  // Creator wallet:
  //     + creatorAmount
  //
  // Stripe:
  //     PaymentIntent is verified/provided separately.
  // ============================================================

  async completePurchase(
    purchaseId: string,
    paymentReference?: string,
  ) {
    if (
      !Types.ObjectId.isValid(
        purchaseId,
      )
    ) {
      throw new BadRequestException(
        "Invalid purchase ID",
      );
    }

    const purchase =
      await this.purchaseModel.findById(
        purchaseId,
      );

    if (!purchase) {
      throw new NotFoundException(
        "Purchase not found",
      );
    }

    // ==========================================================
    // ALREADY COMPLETED
    // ==========================================================

    if (
      purchase.status ===
      PurchaseStatus.COMPLETED
    ) {
      return {
        success: true,

        alreadyCompleted: true,

        purchase,
      };
    }

    // ==========================================================
    // VALIDATE PURCHASE OWNERSHIP DATA
    // ==========================================================

    if (
      !purchase.buyerId ||
      !purchase.creatorId
    ) {
      throw new BadRequestException(
        "Purchase buyer or creator information is missing.",
      );
    }

    // ==========================================================
    // WALLET / COINS PAYMENT
    // ==========================================================

    if (
      purchase.paymentMethod ===
      PaymentMethod.COINS
    ) {
      const coinAmount =
        Math.round(
          Number(
            purchase.amount,
          ),
        );

      const creatorCoinAmount =
        Math.round(
          Number(
            purchase.creatorAmount,
          ),
        );

      if (
        !Number.isInteger(
          coinAmount,
        ) ||
        coinAmount <= 0
      ) {
        throw new BadRequestException(
          "Invalid coin purchase amount.",
        );
      }

      if (
        !Number.isInteger(
          creatorCoinAmount,
        ) ||
        creatorCoinAmount <= 0
      ) {
        throw new BadRequestException(
          "Invalid creator coin amount.",
        );
      }

      const walletResult =
        await this.walletService.purchaseContentWithCoins(
          String(
            purchase.buyerId,
          ),

          String(
            purchase.creatorId,
          ),

          coinAmount,

          creatorCoinAmount,

          String(
            purchase._id,
          ),

          String(
            purchase.contentId,
          ),

          `Purchased ${String(
            purchase.purchaseType,
          ).toLowerCase()} content`,
        );

      // ========================================================
      // RECORD BUYER WALLET TRANSACTION ID
      // ========================================================

      if (
        walletResult?.buyer?.transaction?._id
      ) {
        purchase.walletTransactionId =
          String(
            walletResult
              .buyer
              .transaction
              ._id,
          );
      }
    }

    // ==========================================================
    // STRIPE PAYMENT
    //
    // The Stripe PaymentIntent should be verified by the
    // appropriate Stripe/payment flow before calling this
    // completion method.
    // ==========================================================

    if (
      purchase.paymentMethod ===
      PaymentMethod.STRIPE
    ) {
      if (!paymentReference) {
        throw new BadRequestException(
          "Stripe payment reference is required.",
        );
      }

      purchase.stripePaymentIntentId =
        paymentReference;
    }

    // ==========================================================
    // UNKNOWN PAYMENT METHOD
    // ==========================================================

    if (
      purchase.paymentMethod !==
        PaymentMethod.COINS &&
      purchase.paymentMethod !==
        PaymentMethod.STRIPE
    ) {
      throw new BadRequestException(
        "Unsupported payment method.",
      );
    }

    // ==========================================================
    // COMPLETE PURCHASE
    // ==========================================================

    purchase.status =
      PurchaseStatus.COMPLETED;

    purchase.completedAt =
      new Date();

    await purchase.save();

    // ==========================================================
    // CREATE ENTITLEMENTS
    // ==========================================================

    await this.createEntitlements(
      purchase,
    );

    // ==========================================================
    // INCREMENT PURCHASE COUNT
    // ==========================================================

    await this.paidContentModel.updateOne(
      {
        contentId:
          purchase.contentId,
      },

      {
        $inc: {
          totalPurchases: 1,
        },
      },
    );

    return {
      success: true,

      alreadyCompleted: false,

      purchase,

      paymentMethod:
        purchase.paymentMethod,
    };
  }

  // ============================================================
  // CREATE ENTITLEMENTS
  // ============================================================

  private async createEntitlements(
    purchase:
      ContentPurchaseDocument,
  ) {
    const types:
      EntitlementType[] = [];

    // ==========================================================
    // STREAM
    // ==========================================================

    if (
      purchase.purchaseType ===
      PurchaseType.STREAM
    ) {
      types.push(
        EntitlementType.STREAM,
      );
    }

    // ==========================================================
    // DOWNLOAD
    // ==========================================================

    if (
      purchase.purchaseType ===
      PurchaseType.DOWNLOAD
    ) {
      types.push(
        EntitlementType.DOWNLOAD,
      );
    }

    // ==========================================================
    // STREAM + DOWNLOAD
    // ==========================================================

    if (
      purchase.purchaseType ===
      PurchaseType.STREAM_AND_DOWNLOAD
    ) {
      types.push(
        EntitlementType.STREAM,

        EntitlementType.DOWNLOAD,
      );
    }

    // ==========================================================
    // CREATE / UPDATE ENTITLEMENTS
    // ==========================================================

    for (const type of types) {
      await this.entitlementModel.updateOne(
        {
          userId:
            purchase.buyerId,

          contentId:
            purchase.contentId,

          entitlementType:
            type,
        },

        {
          $set: {
            purchaseId:
              purchase._id,

            status:
              "ACTIVE",

            grantedAt:
              new Date(),
          },
        },

        {
          upsert: true,
        },
      );
    }
  }

  // ============================================================
  // USER PURCHASE HISTORY
  // ============================================================

  async getUserPurchases(
    userId: string,
  ) {
    if (
      !Types.ObjectId.isValid(
        userId,
      )
    ) {
      throw new BadRequestException(
        "Invalid user ID",
      );
    }

    return this.purchaseModel
      .find({
        buyerId:
          new Types.ObjectId(
            userId,
          ),

        status:
          PurchaseStatus.COMPLETED,
      })

      .sort({
        createdAt: -1,
      });
  }
}