import {
  BadRequestException,
  Injectable,
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
  CreatorEarning,
  CreatorEarningDocument,
} from "./schemas/creator-earning.schema";

import {
  EarningsTransaction,
  EarningsTransactionDocument,
} from "./schemas/earnings-transaction.schema";

import {
  Withdrawal,
  WithdrawalDocument,
} from "./schemas/withdrawal.schema";

import {
  RequestWithdrawalDto,
} from "./dto/request-withdrawal.dto";

@Injectable()
export class EarningsService {
  private readonly stripe: Stripe;

  private readonly MIN_WITHDRAWAL = 10;

  /**
   * 100 coins = $1.00
   */
  private readonly COINS_PER_DOLLAR = 100;

  constructor(
    @InjectModel(CreatorEarning.name)
    private readonly earningModel:
      Model<CreatorEarningDocument>,

    @InjectModel(EarningsTransaction.name)
    private readonly transactionModel:
      Model<EarningsTransactionDocument>,

    @InjectModel(Withdrawal.name)
    private readonly withdrawalModel:
      Model<WithdrawalDocument>,
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
        apiVersion:
          "2026-05-27.dahlia",
      },
    );
  }

  // ==========================================================================
  // VALIDATE USER ID
  // ==========================================================================

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

  // ==========================================================================
  // GET OR CREATE EARNINGS ACCOUNT
  // ==========================================================================

  async getOrCreateAccount(
    userId: string,
  ): Promise<CreatorEarningDocument> {
    this.validateUserId(userId);

    const creatorId =
      new Types.ObjectId(userId);

    let account =
      await this.earningModel.findOne({
        creatorId,
      });

    if (account) {
      return account;
    }

    try {
      account =
        await this.earningModel.create({
          creatorId,

          coinsReceived: 0,

          grossEarnings: 0,

          pendingBalance: 0,

          availableBalance: 0,

          totalWithdrawn: 0,

          lifetimeEarnings: 0,

          stripeAccountId: null,

          stripeOnboardingComplete:
            false,

          payoutsEnabled:
            false,

          currency: "usd",

          payoutSchedule: "manual",
        });

      return account;
    } catch (error: any) {
      /**
       * Another request may have created the
       * account at the same time.
       */
      if (
        error?.code === 11000
      ) {
        const existing =
          await this.earningModel.findOne({
            creatorId,
          });

        if (existing) {
          return existing;
        }
      }

      console.error(
        "[Earnings] Failed to create creator earnings account:",
        error,
      );

      throw new BadRequestException(
        "Unable to create creator earnings account.",
      );
    }
  }

  // ==========================================================================
  // DASHBOARD
  // ==========================================================================

  async getDashboard(
    userId: string,
  ) {
    this.validateUserId(userId);

    const creatorId =
      new Types.ObjectId(userId);

    let account =
      await this.getOrCreateAccount(
        userId,
      );

    /**
     * Always refresh Stripe status when a
     * Stripe account exists.
     *
     * This keeps MongoDB synchronized with Stripe.
     */
    if (
      account.stripeAccountId
    ) {
      try {
        await this.refreshStripeStatus(
          userId,
        );

        account =
          await this.getOrCreateAccount(
            userId,
          );
      } catch (error) {
        console.warn(
          "[Earnings] Stripe status refresh failed while loading dashboard:",
          error,
        );
      }
    }

    const [
      transactions,
      withdrawals,
    ] = await Promise.all([
      this.transactionModel
        .find({
          creatorId,
        })
        .sort({
          createdAt: -1,
        })
        .limit(20)
        .lean(),

      this.withdrawalModel
        .find({
          userId: creatorId,
        })
        .sort({
          createdAt: -1,
        })
        .limit(20)
        .lean(),
    ]);

    return {
      account: {
        id:
          account._id,

        creatorId:
          account.creatorId,

        coinsReceived:
          account.coinsReceived,

        grossEarnings:
          account.grossEarnings,

        pendingBalance:
          account.pendingBalance,

        availableBalance:
          account.availableBalance,

        totalWithdrawn:
          account.totalWithdrawn,

        lifetimeEarnings:
          account.lifetimeEarnings,

        currency:
          account.currency,

        payoutSchedule:
          account.payoutSchedule,

        stripeAccountId:
          account.stripeAccountId,

        stripeOnboardingComplete:
          account.stripeOnboardingComplete,

        payoutsEnabled:
          account.payoutsEnabled,
      },

      transactions,

      withdrawals,
    };
  }

  // ==========================================================================
  // RECORD GIFT EARNING
  // ==========================================================================

  async recordGiftEarning(
    params: {
      creatorId: string;

      coins: number;

      giftId?: string;

      giftTransactionId?: string;

      sourceType?:
        | "live"
        | "post"
        | "video"
        | "photo"
        | "profile"
        | "other";

      sourceId?: string;

      giftName?: string;
    },
  ) {
    const {
      creatorId,
      coins,
      giftId,
      giftTransactionId,
      sourceType = "other",
      sourceId,
      giftName,
    } = params;

    this.validateUserId(
      creatorId,
    );

    if (
      !Number.isFinite(coins) ||
      coins <= 0 ||
      !Number.isInteger(coins)
    ) {
      throw new BadRequestException(
        "Invalid coin amount.",
      );
    }

    const creatorObjectId =
      new Types.ObjectId(
        creatorId,
      );

    const value =
      Number(
        (
          coins /
          this.COINS_PER_DOLLAR
        ).toFixed(2),
      );

    if (
      !Number.isFinite(value) ||
      value <= 0
    ) {
      throw new BadRequestException(
        "Invalid creator earning value.",
      );
    }

    const account =
      await this.getOrCreateAccount(
        creatorId,
      );

    account.coinsReceived +=
      coins;

    account.grossEarnings +=
      value;

    account.pendingBalance +=
      value;

    account.lifetimeEarnings +=
      value;

    await account.save();

    const transaction =
      await this.transactionModel.create({
        creatorId:
          creatorObjectId,

        type:
          "gift_received",

        amount:
          value,

        coins,

        sourceType,

        sourceId:
          sourceId &&
          Types.ObjectId.isValid(
            sourceId,
          )
            ? new Types.ObjectId(
                sourceId,
              )
            : null,

        giftId:
          giftId &&
          Types.ObjectId.isValid(
            giftId,
          )
            ? new Types.ObjectId(
                giftId,
              )
            : null,

        giftTransactionId:
          giftTransactionId &&
          Types.ObjectId.isValid(
            giftTransactionId,
          )
            ? new Types.ObjectId(
                giftTransactionId,
              )
            : null,

        description:
          giftName
            ? `Gift received: ${giftName}`
            : "Gift received",

        currency: "usd",
      });

    return {
      account,

      transaction,
    };
  }

  // ==========================================================================
  // SETTLE PENDING EARNINGS
  // ==========================================================================

  async settlePendingEarnings(
    userId: string,
  ) {
    this.validateUserId(userId);

    const account =
      await this.getOrCreateAccount(
        userId,
      );

    if (
      account.pendingBalance <= 0
    ) {
      return account;
    }

    account.availableBalance +=
      account.pendingBalance;

    account.pendingBalance = 0;

    await account.save();

    return account;
  }

  // ==========================================================================
  // CREATE / REUSE STRIPE CONNECT ACCOUNT
  // ==========================================================================

  async createConnectAccount(
    userId: string,
    country = "US",
  ) {
    this.validateUserId(userId);

    const creatorObjectId =
      new Types.ObjectId(userId);

    const normalizedCountry =
      String(country)
        .trim()
        .toUpperCase();

    if (
      !/^[A-Z]{2}$/.test(
        normalizedCountry,
      )
    ) {
      throw new BadRequestException(
        "Invalid country code.",
      );
    }

    const account =
      await this.getOrCreateAccount(
        userId,
      );

    // ------------------------------------------------------------------------
    // EXISTING STRIPE ACCOUNT
    // ------------------------------------------------------------------------

    if (
      account.stripeAccountId
    ) {
      try {
        const stripeAccount =
          await this.stripe.accounts.retrieve(
            account.stripeAccountId,
          );

        const onboardingComplete =
          Boolean(
            stripeAccount.details_submitted,
          );

        const payoutsEnabled =
          Boolean(
            stripeAccount.payouts_enabled,
          );

        const chargesEnabled =
          Boolean(
            stripeAccount.charges_enabled,
          );

        const detailsSubmitted =
          Boolean(
            stripeAccount.details_submitted,
          );

        const updatedAccount =
          await this.earningModel.findOneAndUpdate(
            {
              _id:
                account._id,

              creatorId:
                creatorObjectId,
            },
            {
              $set: {
                stripeAccountId:
                  stripeAccount.id,

                stripeOnboardingComplete:
                  onboardingComplete,

                payoutsEnabled:
                  payoutsEnabled,
              },
            },
            {
              returnDocument:
                "after",

              runValidators:
                true,
            },
          );

        return {
          accountId:
            stripeAccount.id,

          created: false,

          onboardingComplete,

          payoutsEnabled,

          chargesEnabled,

          detailsSubmitted,

          earningsAccountId:
            updatedAccount?._id ??
            account._id,
        };
      } catch (error) {
        console.error(
          "[Stripe Connect] Existing account retrieval failed:",
          error,
        );

        if (
          error instanceof
          Stripe.errors.StripeError
        ) {
          throw new BadRequestException(
            `Unable to retrieve existing Stripe account: ${error.message}`,
          );
        }

        throw new BadRequestException(
          "Unable to retrieve existing Stripe Connect account.",
        );
      }
    }

    // ------------------------------------------------------------------------
    // CREATE NEW STRIPE EXPRESS ACCOUNT
    // ------------------------------------------------------------------------

    let stripeAccount:
      Stripe.Account;

    try {
      stripeAccount =
        await this.stripe.accounts.create({
          type: "express",

          country:
            normalizedCountry,

          business_type:
            "individual",

          capabilities: {
            transfers: {
              requested: true,
            },
          },

          metadata: {
            fockisUserId:
              String(userId),
          },
        });
    } catch (error) {
      console.error(
        "[Stripe Connect] Account creation failed:",
        error,
      );

      if (
        error instanceof
        Stripe.errors.StripeError
      ) {
        console.error(
          "[Stripe Connect] Stripe error details:",
          {
            type:
              error.type,

            code:
              error.code,

            decline_code:
              error.decline_code,

            param:
              error.param,

            message:
              error.message,

            requestId:
              error.requestId,
          },
        );

        throw new BadRequestException(
          `Stripe account creation failed: ${error.message}`,
        );
      }

      throw new BadRequestException(
        "Stripe account creation failed.",
      );
    }

    if (
      !stripeAccount?.id
    ) {
      throw new BadRequestException(
        "Stripe did not return a Connect account ID.",
      );
    }

    const stripeAccountId =
      stripeAccount.id;

    const onboardingComplete =
      Boolean(
        stripeAccount.details_submitted,
      );

    const payoutsEnabled =
      Boolean(
        stripeAccount.payouts_enabled,
      );

    // ------------------------------------------------------------------------
    // ATTACH STRIPE ACCOUNT TO MONGODB
    // ------------------------------------------------------------------------

    let updatedAccount:
      | CreatorEarningDocument
      | null = null;

    try {
      updatedAccount =
        await this.earningModel.findOneAndUpdate(
          {
            _id:
              account._id,

            creatorId:
              creatorObjectId,

            $or: [
              {
                stripeAccountId:
                  null,
              },

              {
                stripeAccountId: {
                  $exists: false,
                },
              },

              {
                stripeAccountId:
                  "",
              },
            ],
          },
          {
            $set: {
              stripeAccountId:
                stripeAccountId,

              stripeOnboardingComplete:
                onboardingComplete,

              payoutsEnabled:
                payoutsEnabled,
            },
          },
          {
            returnDocument:
              "after",

            runValidators:
              true,
          },
        );
    } catch (error) {
      console.error(
        "[Stripe Connect] Database attachment failed:",
        error,
      );

      try {
        await this.stripe.accounts.del(
          stripeAccountId,
        );
      } catch (cleanupError) {
        console.error(
          "[Stripe Connect] Failed to delete orphaned Stripe account:",
          cleanupError,
        );
      }

      throw new BadRequestException(
        "Stripe account was created but could not be attached to the creator.",
      );
    }

    // ------------------------------------------------------------------------
    // HANDLE CONCURRENT REQUEST
    // ------------------------------------------------------------------------

    if (!updatedAccount) {
      const currentAccount =
        await this.earningModel.findOne({
          creatorId:
            creatorObjectId,
        });

      if (
        currentAccount?.stripeAccountId
      ) {
        /**
         * Another request already created the
         * Stripe account for this creator.
         *
         * Do not delete the account that belongs
         * to the creator.
         */
        try {
          await this.stripe.accounts.del(
            stripeAccountId,
          );
        } catch (cleanupError) {
          console.error(
            "[Stripe Connect] Failed to delete duplicate Stripe account:",
            cleanupError,
          );
        }

        return {
          accountId:
            currentAccount.stripeAccountId,

          created: false,

          onboardingComplete:
            Boolean(
              currentAccount.stripeOnboardingComplete,
            ),

          payoutsEnabled:
            Boolean(
              currentAccount.payoutsEnabled,
            ),

          earningsAccountId:
            currentAccount._id,
        };
      }

      try {
        await this.stripe.accounts.del(
          stripeAccountId,
        );
      } catch (cleanupError) {
        console.error(
          "[Stripe Connect] Failed to delete orphaned Stripe account:",
          cleanupError,
        );
      }

      throw new BadRequestException(
        "Stripe account was created but could not be attached to the creator.",
      );
    }

    console.log(
      "[Stripe Connect] Stripe account attached successfully:",
      {
        userId,

        stripeAccountId,

        earningsAccountId:
          String(
            updatedAccount._id,
          ),
      },
    );

    return {
      accountId:
        stripeAccountId,

      created: true,

      onboardingComplete,

      payoutsEnabled,

      chargesEnabled:
        Boolean(
          stripeAccount.charges_enabled,
        ),

      detailsSubmitted:
        Boolean(
          stripeAccount.details_submitted,
        ),

      earningsAccountId:
        updatedAccount._id,
    };
  }

  // ==========================================================================
  // CREATE STRIPE ONBOARDING LINK
  // ==========================================================================

  async createConnectOnboardingLink(
    userId: string,
  ) {
    this.validateUserId(userId);

    let account =
      await this.getOrCreateAccount(
        userId,
      );

    let stripeAccountId =
      account.stripeAccountId;

    // ------------------------------------------------------------------------
    // CREATE STRIPE ACCOUNT IF ONE DOES NOT EXIST
    // ------------------------------------------------------------------------

    if (!stripeAccountId) {
      console.log(
        "[Stripe Connect] No Stripe account found. Creating one...",
      );

      const created =
        await this.createConnectAccount(
          userId,
          "US",
        );

      if (
        !created?.accountId
      ) {
        throw new BadRequestException(
          "Stripe Connect account ID was not returned.",
        );
      }

      stripeAccountId =
        String(
          created.accountId,
        );
    }

    if (
      !stripeAccountId
    ) {
      throw new BadRequestException(
        "Stripe Connect account ID is missing.",
      );
    }

    // ------------------------------------------------------------------------
    // VERIFY STRIPE ACCOUNT
    // ------------------------------------------------------------------------

    let stripeAccount:
      Stripe.Account;

    try {
      stripeAccount =
        await this.stripe.accounts.retrieve(
          stripeAccountId,
        );
    } catch (error) {
      console.error(
        "[Stripe Connect] Failed to retrieve account:",
        error,
      );

      if (
        error instanceof
        Stripe.errors.StripeError
      ) {
        throw new BadRequestException(
          `Unable to retrieve Stripe account: ${error.message}`,
        );
      }

      throw new BadRequestException(
        "Unable to verify Stripe Connect account.",
      );
    }

    // ------------------------------------------------------------------------
    // REFRESH MONGODB STATUS
    // ------------------------------------------------------------------------

    const onboardingComplete =
      Boolean(
        stripeAccount.details_submitted,
      );

    const payoutsEnabled =
      Boolean(
        stripeAccount.payouts_enabled,
      );

    const chargesEnabled =
      Boolean(
        stripeAccount.charges_enabled,
      );

    const detailsSubmitted =
      Boolean(
        stripeAccount.details_submitted,
      );

    account =
      (await this.earningModel.findOneAndUpdate(
        {
          creatorId:
            new Types.ObjectId(
              userId,
            ),
        },
        {
          $set: {
            stripeAccountId:
              stripeAccount.id,

            stripeOnboardingComplete:
              onboardingComplete,

            payoutsEnabled:
              payoutsEnabled,
          },
        },
        {
          returnDocument:
            "after",

          runValidators:
            true,
        },
      )) as CreatorEarningDocument;

    if (!account) {
      throw new BadRequestException(
        "Creator earnings account could not be updated.",
      );
    }

    // ------------------------------------------------------------------------
    // ALREADY COMPLETE
    // ------------------------------------------------------------------------

    if (
      onboardingComplete &&
      payoutsEnabled
    ) {
      return {
        alreadyComplete: true,

        url: null,

        accountId:
          stripeAccount.id,

        onboardingComplete: true,

        payoutsEnabled: true,

        chargesEnabled,

        detailsSubmitted,
      };
    }

    // ------------------------------------------------------------------------
    // CREATE ACCOUNT LINK
    // ------------------------------------------------------------------------

    return this.createAccountLink(
      stripeAccount.id,
    );
  }

  // ==========================================================================
  // CREATE STRIPE ACCOUNT LINK
  // ==========================================================================

  private async createAccountLink(
    stripeAccountId: string,
  ) {
    if (
      !stripeAccountId
    ) {
      throw new BadRequestException(
        "Stripe Connect account ID is missing.",
      );
    }

    const frontendUrl =
      (
        process.env.FRONTEND_URL ??
        "http://localhost:5173"
      ).replace(
        /\/+$/,
        "",
      );

    const refreshUrl =
      `${frontendUrl}/earnings?stripe=refresh`;

    const returnUrl =
      `${frontendUrl}/earnings?stripe=return`;

    console.log(
      "[Stripe Connect] Creating account link:",
      {
        stripeAccountId,

        refreshUrl,

        returnUrl,
      },
    );

    try {
      const link =
        await this.stripe.accountLinks.create({
          account:
            stripeAccountId,

          refresh_url:
            refreshUrl,

          return_url:
            returnUrl,

          type:
            "account_onboarding",
        });

      if (
        !link?.url
      ) {
        throw new BadRequestException(
          "Stripe did not return an onboarding URL.",
        );
      }

      return {
        url:
          link.url,

        accountId:
          stripeAccountId,

        alreadyComplete:
          false,
      };
    } catch (error) {
      console.error(
        "[Stripe Connect] Onboarding link creation failed:",
        error,
      );

      if (
        error instanceof
        Stripe.errors.StripeError
      ) {
        console.error(
          "[Stripe Connect] Stripe account-link error details:",
          {
            type:
              error.type,

            code:
              error.code,

            param:
              error.param,

            message:
              error.message,

            requestId:
              error.requestId,

            statusCode:
              error.statusCode,
          },
        );

        throw new BadRequestException(
          `Stripe onboarding failed: ${error.message}`,
        );
      }

      if (
        error instanceof
        BadRequestException
      ) {
        throw error;
      }

      throw new BadRequestException(
        "Stripe onboarding link could not be created.",
      );
    }
  }

  // ==========================================================================
  // REFRESH STRIPE STATUS
  // ==========================================================================

  async refreshStripeStatus(
    userId: string,
  ) {
    this.validateUserId(userId);

    const account =
      await this.getOrCreateAccount(
        userId,
      );

    const stripeAccountId =
      account.stripeAccountId;

    // ------------------------------------------------------------------------
    // NOT CONNECTED
    // ------------------------------------------------------------------------

    if (!stripeAccountId) {
      return {
        connected: false,

        payoutsEnabled: false,

        onboardingComplete: false,

        accountId: null,

        chargesEnabled: false,

        detailsSubmitted: false,
      };
    }

    try {
      const stripeAccount =
        await this.stripe.accounts.retrieve(
          stripeAccountId,
        );

      const onboardingComplete =
        Boolean(
          stripeAccount.details_submitted,
        );

      const payoutsEnabled =
        Boolean(
          stripeAccount.payouts_enabled,
        );

      const chargesEnabled =
        Boolean(
          stripeAccount.charges_enabled,
        );

      const detailsSubmitted =
        Boolean(
          stripeAccount.details_submitted,
        );

      await this.earningModel.findOneAndUpdate(
        {
          _id:
            account._id,

          creatorId:
            new Types.ObjectId(
              userId,
            ),
        },
        {
          $set: {
            stripeAccountId:
              stripeAccount.id,

            stripeOnboardingComplete:
              onboardingComplete,

            payoutsEnabled:
              payoutsEnabled,
          },
        },
        {
          returnDocument:
            "after",

          runValidators:
            true,
        },
      );

      return {
        connected: true,

        payoutsEnabled,

        onboardingComplete,

        accountId:
          stripeAccount.id,

        chargesEnabled,

        detailsSubmitted,
      };
    } catch (error) {
      console.error(
        "[Stripe Connect] Status refresh failed:",
        error,
      );

      /**
       * If the Stripe account no longer exists,
       * clear the stale Stripe ID in MongoDB.
       */
      if (
        error instanceof
        Stripe.errors.StripeError
      ) {
        if (
          error.code ===
          "resource_missing"
        ) {
          await this.earningModel.findOneAndUpdate(
            {
              _id:
                account._id,

              creatorId:
                new Types.ObjectId(
                  userId,
                ),
            },
            {
              $set: {
                stripeAccountId:
                  null,

                stripeOnboardingComplete:
                  false,

                payoutsEnabled:
                  false,
              },
            },
          );

          return {
            connected: false,

            payoutsEnabled: false,

            onboardingComplete: false,

            accountId: null,

            chargesEnabled: false,

            detailsSubmitted: false,
          };
        }

        console.error(
          "[Stripe Connect] Stripe status error:",
          {
            type:
              error.type,

            code:
              error.code,

            param:
              error.param,

            message:
              error.message,

            requestId:
              error.requestId,
          },
        );

        throw new BadRequestException(
          `Stripe status check failed: ${error.message}`,
        );
      }

      throw new BadRequestException(
        "Unable to retrieve Stripe account status.",
      );
    }
  }

  // ==========================================================================
  // REQUEST WITHDRAWAL
  // ==========================================================================

  async requestWithdrawal(
    userId: string,
    dto: RequestWithdrawalDto,
  ) {
    this.validateUserId(userId);

    const amount =
      Number(
        Number(
          dto.amount,
        ).toFixed(2),
      );

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      throw new BadRequestException(
        "Invalid withdrawal amount.",
      );
    }

    if (
      amount <
      this.MIN_WITHDRAWAL
    ) {
      throw new BadRequestException(
        `Minimum withdrawal is $${this.MIN_WITHDRAWAL.toFixed(2)}.`,
      );
    }

    // ------------------------------------------------------------------------
    // GET CREATOR ACCOUNT
    // ------------------------------------------------------------------------

    let account =
      await this.getOrCreateAccount(
        userId,
      );

    // ------------------------------------------------------------------------
    // IMPORTANT
    //
    // DO NOT AUTOMATICALLY CREATE A STRIPE ACCOUNT HERE.
    //
    // The creator must explicitly connect Stripe
    // through the Stripe onboarding flow first.
    // ------------------------------------------------------------------------

    if (
      !account.stripeAccountId
    ) {
      throw new BadRequestException(
        "Connect your Stripe payout account before requesting a withdrawal.",
      );
    }

    // ------------------------------------------------------------------------
    // REFRESH STRIPE STATUS
    // ------------------------------------------------------------------------

    const stripeStatus =
      await this.refreshStripeStatus(
        userId,
      );

    if (
      !stripeStatus.connected ||
      !stripeStatus.accountId
    ) {
      throw new BadRequestException(
        "Connect your Stripe payout account before requesting a withdrawal.",
      );
    }

    // ------------------------------------------------------------------------
    // ONBOARDING MUST BE COMPLETE
    // ------------------------------------------------------------------------

    if (
      !stripeStatus.onboardingComplete
    ) {
      throw new BadRequestException(
        "Complete your Stripe payout setup before requesting a withdrawal.",
      );
    }

    // ------------------------------------------------------------------------
    // PAYOUTS MUST BE ENABLED
    // ------------------------------------------------------------------------

    if (
      !stripeStatus.payoutsEnabled
    ) {
      throw new BadRequestException(
        "Stripe payouts are not enabled for your account yet.",
      );
    }

    // ------------------------------------------------------------------------
    // RELOAD ACCOUNT AFTER STRIPE STATUS REFRESH
    // ------------------------------------------------------------------------

    account =
      await this.getOrCreateAccount(
        userId,
      );

    const stripeAccountId =
      account.stripeAccountId;

    if (
      !stripeAccountId
    ) {
      throw new BadRequestException(
        "Stripe Connect account ID is missing.",
      );
    }

    // ------------------------------------------------------------------------
    // VERIFY AVAILABLE BALANCE
    // ------------------------------------------------------------------------

    const availableBalance =
      Number(
        Number(
          account.availableBalance,
        ).toFixed(2),
      );

    if (
      amount >
      availableBalance
    ) {
      throw new BadRequestException(
        "Insufficient available earnings.",
      );
    }

    const userObjectId =
      new Types.ObjectId(userId);

    // ------------------------------------------------------------------------
    // CREATE WITHDRAWAL RECORD
    // ------------------------------------------------------------------------

    const withdrawal =
      await this.withdrawalModel.create({
        userId:
          userObjectId,

        amount,

        fee: 0,

        netAmount:
          amount,

        currency:
          "usd",

        status:
          "processing",

        stripeAccountId:
          stripeAccountId,

        description:
          "Fockis creator withdrawal",
      });

    // ------------------------------------------------------------------------
    // ATOMICALLY RESERVE BALANCE
    // ------------------------------------------------------------------------

    try {
      const reservedAccount =
        await this.earningModel.findOneAndUpdate(
          {
            _id:
              account._id,

            creatorId:
              userObjectId,

            availableBalance: {
              $gte:
                amount,
            },
          },
          {
            $inc: {
              availableBalance:
                -amount,

              totalWithdrawn:
                amount,
            },
          },
          {
            returnDocument:
              "after",

            runValidators:
              true,
          },
        );

      if (
        !reservedAccount
      ) {
        withdrawal.status =
          "failed";

        withdrawal.failureReason =
          "Insufficient available earnings.";

        await withdrawal.save();

        throw new BadRequestException(
          "Insufficient available earnings.",
        );
      }
    } catch (error) {
      if (
        error instanceof
        BadRequestException
      ) {
        throw error;
      }

      withdrawal.status =
        "failed";

      withdrawal.failureReason =
        error instanceof Error
          ? error.message
          : "Unable to reserve creator balance.";

      await withdrawal.save();

      throw new BadRequestException(
        "Unable to reserve creator balance.",
      );
    }

    // ------------------------------------------------------------------------
    // STRIPE TRANSFER
    // ------------------------------------------------------------------------

    try {
      const transfer =
        await this.stripe.transfers.create(
          {
            amount:
              Math.round(
                amount * 100,
              ),

            currency:
              "usd",

            destination:
              stripeAccountId,

            metadata: {
              fockisUserId:
                String(userId),

              withdrawalId:
                String(
                  withdrawal._id,
                ),
            },
          },
          {
            idempotencyKey:
              `fockis-withdrawal-${String(
                withdrawal._id,
              )}`,
          },
        );

      withdrawal.stripeTransferId =
        transfer.id;

      withdrawal.status =
        "paid";

      await withdrawal.save();

      await this.transactionModel.create({
        creatorId:
          userObjectId,

        type:
          "withdrawal",

        amount:
          -amount,

        description:
          "Creator withdrawal",

        referenceId:
          String(
            withdrawal._id,
          ),

        currency:
          "usd",
      });

      console.log(
        "[Stripe Transfer] Withdrawal successful:",
        {
          userId,

          amount,

          transferId:
            transfer.id,

          withdrawalId:
            String(
              withdrawal._id,
            ),
        },
      );

      return withdrawal;
    } catch (error) {
      // ----------------------------------------------------------------------
      // RESTORE BALANCE
      // ----------------------------------------------------------------------

      await this.earningModel.findOneAndUpdate(
        {
          _id:
            account._id,

          creatorId:
            userObjectId,
        },
        {
          $inc: {
            availableBalance:
              amount,

            totalWithdrawn:
              -amount,
          },
        },
        {
          returnDocument:
            "after",
        },
      );

      withdrawal.status =
        "failed";

      withdrawal.failureReason =
        error instanceof Error
          ? error.message
          : "Stripe transfer failed";

      await withdrawal.save();

      console.error(
        "[Stripe Transfer] Withdrawal failed:",
        error,
      );

      if (
        error instanceof
        Stripe.errors.StripeError
      ) {
        throw new BadRequestException(
          `Stripe withdrawal failed: ${error.message}`,
        );
      }

      throw new BadRequestException(
        "Withdrawal could not be processed.",
      );
    }
  }

  // ==========================================================================
  // GET TRANSACTIONS
  // ==========================================================================

  async getTransactions(
    userId: string,
    page = 1,
    limit = 25,
  ) {
    this.validateUserId(userId);

    const safePage =
      Math.max(
        1,
        Number(page) || 1,
      );

    const safeLimit =
      Math.min(
        100,
        Math.max(
          1,
          Number(limit) || 25,
        ),
      );

    const creatorId =
      new Types.ObjectId(userId);

    const skip =
      (safePage - 1) *
      safeLimit;

    const [
      transactions,
      total,
    ] = await Promise.all([
      this.transactionModel
        .find({
          creatorId,
        })
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(safeLimit)
        .lean(),

      this.transactionModel
        .countDocuments({
          creatorId,
        }),
    ]);

    return {
      transactions,

      page:
        safePage,

      limit:
        safeLimit,

      total,

      pages:
        Math.ceil(
          total /
            safeLimit,
        ),
    };
  }

  // ==========================================================================
  // GET WITHDRAWALS
  // ==========================================================================

  async getWithdrawals(
    userId: string,
  ) {
    this.validateUserId(userId);

    return this.withdrawalModel
      .find({
        userId:
          new Types.ObjectId(
            userId,
          ),
      })
      .sort({
        createdAt: -1,
      })
      .lean();
  }

  // ==========================================================================
  // UPDATE PAYOUT SCHEDULE
  // ==========================================================================

  async updatePayoutSchedule(
    userId: string,
    schedule:
      | "manual"
      | "daily"
      | "weekly"
      | "monthly",
  ) {
    this.validateUserId(userId);

    const validSchedules = [
      "manual",
      "daily",
      "weekly",
      "monthly",
    ] as const;

    if (
      !validSchedules.includes(
        schedule,
      )
    ) {
      throw new BadRequestException(
        "Invalid payout schedule.",
      );
    }

    const account =
      await this.getOrCreateAccount(
        userId,
      );

    account.payoutSchedule =
      schedule;

    await account.save();

    return account;
  }
}