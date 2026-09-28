import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { InjectModel } from "@nestjs/mongoose";

import {
  ClientSession,
  Model,
  Types,
} from "mongoose";

import {
  AiCredits,
  AiCreditsDocument,
} from "../credits/ai-credits.schema";

@Injectable()
export class AiCreditsService {
  /**
   * Initial AI credits for a new user.
   *
   * This is currently intended for development/testing.
   * You can later replace this with your subscription/
   * purchase-based credit system.
   */
  private readonly INITIAL_AI_CREDITS = 100;

  constructor(
    @InjectModel(AiCredits.name)
    private readonly creditsModel:
      Model<AiCreditsDocument>,
  ) {}

  private toObjectId(
    userId: string,
  ): Types.ObjectId {
    if (
      !Types.ObjectId.isValid(
        userId,
      )
    ) {
      throw new NotFoundException(
        "Invalid user ID.",
      );
    }

    return new Types.ObjectId(
      userId,
    );
  }

  /**
   * Calculate the next monthly reset date.
   */
  private getNextResetDate(): Date {
    const reset =
      new Date();

    reset.setMonth(
      reset.getMonth() + 1,
    );

    reset.setDate(1);

    reset.setHours(
      0,
      0,
      0,
      0,
    );

    return reset;
  }

  /**
   * Get or create the user's AI credit account.
   *
   * New accounts receive the development/test allowance.
   */
  async getOrCreate(
    userId: string,
  ): Promise<AiCreditsDocument> {
    const id =
      this.toObjectId(
        userId,
      );

    let credits =
      await this.creditsModel.findOne({
        userId: id,
      });

    if (credits) {
      return credits;
    }

    try {
      credits =
        await this.creditsModel.create({
          userId: id,

          balance:
            this.INITIAL_AI_CREDITS,

          monthlyAllowance:
            this.INITIAL_AI_CREDITS,

          usedThisPeriod:
            0,

          reserved:
            0,

          resetAt:
            this.getNextResetDate(),
        });
    } catch (error: any) {
      /**
       * Another request may have created the
       * account at the same time.
       *
       * userId is unique, so retrieve the
       * existing record after a duplicate-key error.
       */
      if (
        error?.code === 11000
      ) {
        credits =
          await this.creditsModel.findOne({
            userId: id,
          });
      } else {
        throw error;
      }
    }

    if (!credits) {
      throw new ConflictException(
        "Unable to create AI credit account.",
      );
    }

    return credits;
  }

  /**
   * Get available AI credits.
   *
   * Reserved credits are not considered available.
   */
  async getBalance(
    userId: string,
  ) {
    const credits =
      await this.getOrCreate(
        userId,
      );

    const available =
      Math.max(
        0,
        credits.balance -
          credits.reserved,
      );

    return {
      balance:
        available,

      monthlyAllowance:
        credits.monthlyAllowance,

      usedThisPeriod:
        credits.usedThisPeriod,

      resetAt:
        credits.resetAt,

      reserved:
        credits.reserved,
    };
  }

  /**
   * Reserve credits for an AI job.
   *
   * IMPORTANT:
   * getOrCreate() is called first so a user who has
   * never used AI before automatically receives their
   * initial AI credit account.
   *
   * The actual reservation is atomic.
   */
  async reserve(
    userId: string,
    amount: number,
    session?: ClientSession,
  ): Promise<void> {
    if (
      !Number.isInteger(
        amount,
      ) ||
      amount <= 0
    ) {
      throw new ConflictException(
        "Invalid AI credit amount.",
      );
    }

    const id =
      this.toObjectId(
        userId,
      );

    /**
     * Make sure the credit document exists before
     * attempting the atomic reservation.
     */
    await this.getOrCreate(
      userId,
    );

    /**
     * Reserve only when:
     *
     * balance - reserved >= amount
     *
     * This prevents two simultaneous jobs from
     * spending the same credits.
     */
    const updated =
      await this.creditsModel.findOneAndUpdate(
        {
          userId: id,

          $expr: {
            $gte: [
              {
                $subtract: [
                  "$balance",
                  "$reserved",
                ],
              },

              amount,
            ],
          },
        },

        {
          $inc: {
            reserved:
              amount,
          },
        },

        {
          new: true,
          session,
        },
      );

    if (!updated) {
      throw new ConflictException(
        "Insufficient AI credits.",
      );
    }
  }

  /**
   * Consume reserved credits after successful
   * AI generation.
   */
  async consume(
    userId: string,
    reservedAmount: number,
    consumedAmount: number,
    session?: ClientSession,
  ): Promise<void> {
    if (
      !Number.isInteger(
        reservedAmount,
      ) ||
      reservedAmount <= 0
    ) {
      throw new ConflictException(
        "Invalid reserved AI credit amount.",
      );
    }

    if (
      !Number.isInteger(
        consumedAmount,
      ) ||
      consumedAmount < 0
    ) {
      throw new ConflictException(
        "Invalid consumed AI credit amount.",
      );
    }

    const id =
      this.toObjectId(
        userId,
      );

    const safeConsumed =
      Math.min(
        consumedAmount,
        reservedAmount,
      );

    const result =
      await this.creditsModel.updateOne(
        {
          userId: id,

          reserved: {
            $gte:
              reservedAmount,
          },

          balance: {
            $gte:
              safeConsumed,
          },
        },

        {
          $inc: {
            reserved:
              -reservedAmount,

            balance:
              -safeConsumed,

            usedThisPeriod:
              safeConsumed,
          },
        },

        {
          session,
        },
      );

    if (
      result.matchedCount ===
      0
    ) {
      throw new ConflictException(
        "Unable to consume AI credits.",
      );
    }
  }

  /**
   * Release reserved credits when a job fails
   * before the credits are consumed.
   */
  async release(
    userId: string,
    reservedAmount: number,
    session?: ClientSession,
  ): Promise<void> {
    if (
      !Number.isInteger(
        reservedAmount,
      ) ||
      reservedAmount <= 0
    ) {
      return;
    }

    const id =
      this.toObjectId(
        userId,
      );

    await this.creditsModel.updateOne(
      {
        userId: id,

        reserved: {
          $gte:
            reservedAmount,
        },
      },

      {
        $inc: {
          reserved:
            -reservedAmount,
        },
      },

      {
        session,
      },
    );
  }

  /**
   * Grant additional AI credits.
   *
   * Useful for:
   * - purchases
   * - subscriptions
   * - promotions
   * - admin grants
   * - testing
   */
  async grant(
    userId: string,
    amount: number,
    session?: ClientSession,
  ): Promise<void> {
    if (
      !Number.isInteger(
        amount,
      ) ||
      amount <= 0
    ) {
      throw new ConflictException(
        "Invalid AI credit amount.",
      );
    }

    const id =
      this.toObjectId(
        userId,
      );

    /**
     * Ensure the credit account exists first.
     */
    await this.getOrCreate(
      userId,
    );

    await this.creditsModel.updateOne(
      {
        userId: id,
      },

      {
        $inc: {
          balance:
            amount,
        },
      },

      {
        session,
      },
    );
  }

  /**
   * Reset monthly credits.
   *
   * This can later be called by a scheduled job.
   */
  async resetMonthlyCredits(
    userId: string,
    session?: ClientSession,
  ): Promise<void> {
    const credits =
      await this.getOrCreate(
        userId,
      );

    const allowance =
      Math.max(
        0,
        credits.monthlyAllowance,
      );

    await this.creditsModel.updateOne(
      {
        userId:
          this.toObjectId(
            userId,
          ),
      },

      {
        $inc: {
          balance:
            allowance,

          usedThisPeriod:
            -credits.usedThisPeriod,
        },

        $set: {
          resetAt:
            this.getNextResetDate(),
        },
      },

      {
        session,
      },
    );
  }
}
