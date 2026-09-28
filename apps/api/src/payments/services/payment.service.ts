import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';

import { Model, Types } from 'mongoose';

import { randomUUID } from 'crypto';

import Stripe from 'stripe';

import { CreatePaymentDto } from '../dto/create-payment.dto';

import {
  Payment,
  PaymentDocument,
} from '../schemas/payment.schema';

import {
  User,
  UserDocument,
} from '../../users/user.schema';

import { UsersService } from '../../users/users.service';

import { FockisStripeService } from './stripe.service';

import { PaymentStatus } from '../constants/payment-status.constants';

@Injectable()
export class UniversalPaymentService {
  private readonly logger =
    new Logger(UniversalPaymentService.name);

  constructor(
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,

    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    private readonly stripeService: FockisStripeService,

    private readonly usersService: UsersService,
  ) {}

  // ============================================================
  // OBJECT ID
  // ============================================================

  private objectId(
    userId: string,
  ): Types.ObjectId {
    if (
      !userId ||
      !Types.ObjectId.isValid(userId)
    ) {
      throw new BadRequestException(
        'Invalid authenticated user ID.',
      );
    }

    return new Types.ObjectId(userId);
  }

  // ============================================================
  // NORMALIZE CURRENCY
  // ============================================================

  private normalizeCurrency(
    currency?: string,
  ): string {
    const value = String(
      currency || 'USD',
    )
      .trim()
      .toUpperCase();

    if (!/^[A-Z]{3}$/.test(value)) {
      throw new BadRequestException(
        'Invalid currency code.',
      );
    }

    return value;
  }

  // ============================================================
  // NORMALIZE COUNTRY
  // ============================================================

  private normalizeCountry(
    country?: string,
  ): string {
    const value = String(
      country || 'US',
    )
      .trim()
      .toUpperCase();

    if (!/^[A-Z]{2}$/.test(value)) {
      throw new BadRequestException(
        'Invalid country code.',
      );
    }

    return value;
  }

  // ============================================================
  // NORMALIZE AMOUNT
  // ============================================================

  private normalizeAmount(
    amount: unknown,
  ): number {
    const value = Number(amount);

    if (
      !Number.isFinite(value) ||
      value <= 0
    ) {
      throw new BadRequestException(
        'Payment amount must be greater than zero.',
      );
    }

    return Number(
      value.toFixed(2),
    );
  }

  // ============================================================
  // STRIPE MINOR UNITS
  // ============================================================

  private amountInMinorUnits(
    amount: number,
    currency: string,
  ): number {
    const zeroDecimalCurrencies =
      new Set([
        'BIF',
        'CLP',
        'DJF',
        'GNF',
        'JPY',
        'KMF',
        'KRW',
        'MGA',
        'PYG',
        'RWF',
        'UGX',
        'VND',
        'VUV',
        'XAF',
        'XOF',
        'XPF',
      ]);

    if (
      zeroDecimalCurrencies.has(
        currency,
      )
    ) {
      return Math.round(amount);
    }

    return Math.round(
      amount * 100,
    );
  }

  // ============================================================
  // PUBLIC PAYMENT RESPONSE
  // ============================================================

  private publicPayment(
    payment: PaymentDocument,
    clientSecret: string | null,
  ) {
    return {
      paymentId: payment.id,

      clientSecret,

      purpose: payment.purpose,

      referenceId:
        payment.referenceId,

      baseAmount:
        payment.baseAmount,

      baseCurrency:
        payment.baseCurrency,

      chargedAmount:
        payment.chargedAmount,

      chargedCurrency:
        payment.chargedCurrency,

      country:
        payment.country,

      exchangeRate:
        payment.exchangeRate,

      status:
        payment.status,

      stripePaymentIntentId:
        payment.stripePaymentIntentId ??
        null,
    };
  }

  // ============================================================
  // CREATE PAYMENT
  // ============================================================

  async createPayment(
    userId: string,
    dto: CreatePaymentDto,
  ) {
    const mongoUserId =
      this.objectId(userId);

    const purpose =
      String(
        dto.purpose || '',
      ).trim();

    if (!purpose) {
      throw new BadRequestException(
        'Payment purpose is required.',
      );
    }

    const referenceId =
      String(
        dto.referenceId || '',
      ).trim();

    if (!referenceId) {
      throw new BadRequestException(
        'Payment reference ID is required.',
      );
    }

    const baseAmount =
      this.normalizeAmount(
        dto.baseAmount,
      );

    const baseCurrency =
      this.normalizeCurrency(
        dto.baseCurrency,
      );

    const country =
      this.normalizeCountry(
        dto.country,
      );

    const idempotencyKey =
      String(
        dto.idempotencyKey || '',
      ).trim() ||
      randomUUID();

    // ==========================================================
    // EXISTING IDEMPOTENT PAYMENT
    // ==========================================================

    const existing =
      await this.paymentModel
        .findOne({
          userId: mongoUserId,
          idempotencyKey,
        })
        .exec();

    if (existing) {
      if (
        existing.stripePaymentIntentId
      ) {
        try {
          const existingIntent =
            await this.stripeService.client.paymentIntents.retrieve(
              existing.stripePaymentIntentId,
            );

          this.updatePaymentFromIntent(
            existing,
            existingIntent,
          );

          await existing.save();

          if (
            existingIntent.status ===
            'succeeded'
          ) {
            await this.fulfillSuccessfulPayment(
              existing,
              existingIntent,
            );
          }

          return this.publicPayment(
            existing,
            existingIntent.client_secret ??
              null,
          );
        } catch (error) {
          const message =
            error instanceof
            Stripe.errors.StripeError
              ? error.message
              : error instanceof Error
                ? error.message
                : 'Unable to retrieve the existing Stripe payment.';

          throw new BadRequestException(
            message,
          );
        }
      }

      return this.publicPayment(
        existing,
        null,
      );
    }

    // ==========================================================
    // CHARGED AMOUNT
    // ==========================================================

    const chargedAmount =
      baseAmount;

    const chargedCurrency =
      baseCurrency;

    const exchangeRate = 1;

    // ==========================================================
    // CREATE INTERNAL PAYMENT
    // ==========================================================

    const payment =
      new this.paymentModel({
        id: randomUUID(),

        userId:
          mongoUserId,

        purpose,

        referenceId,

        baseAmount,

        baseCurrency,

        chargedAmount,

        chargedCurrency,

        country,

        exchangeRate,

        status:
          PaymentStatus.REQUIRES_PAYMENT,

        stripePaymentIntentId:
          null,

        idempotencyKey,

        failureMessage:
          null,

        paidAt:
          null,

        refundedAt:
          null,

        refundedAmount:
          0,

        metadata:
          dto.metadata ?? {},
      });

    await payment.save();

    try {
      const stripeAmount =
        this.amountInMinorUnits(
          chargedAmount,
          chargedCurrency,
        );

      // ========================================================
      // CREATE STRIPE PAYMENT INTENT
      // ========================================================

      const intent =
        await this.stripeService.client.paymentIntents.create(
          {
            amount:
              stripeAmount,

            currency:
              chargedCurrency.toLowerCase(),

            metadata: {
              paymentId:
                payment.id,

              userId,

              purpose,

              referenceId,
            },

            automatic_payment_methods: {
              enabled: true,
            },
          },
          {
            idempotencyKey,
          },
        );

      payment.stripePaymentIntentId =
        intent.id;

      // ========================================================
      // SYNCHRONIZE STATUS
      // ========================================================

      this.updatePaymentFromIntent(
        payment,
        intent,
      );

      await payment.save();

      // ========================================================
      // FULFILL IF ALREADY SUCCEEDED
      // ========================================================

      if (
        intent.status ===
        'succeeded'
      ) {
        await this.fulfillSuccessfulPayment(
          payment,
          intent,
        );
      }

      return this.publicPayment(
        payment,
        intent.client_secret ??
          null,
      );
    } catch (error) {
      payment.status =
        PaymentStatus.FAILED;

      const message =
        error instanceof
        Stripe.errors.StripeError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Stripe payment creation failed.';

      payment.failureMessage =
        message;

      await payment.save();

      throw new BadRequestException(
        message,
      );
    }
  }

  // ============================================================
  // CONFIRM PAYMENT
  // ============================================================

  async confirmPayment(
    userId: string,
    paymentIntentId: string,
  ) {
    const cleanIntentId =
      String(
        paymentIntentId || '',
      ).trim();

    if (!cleanIntentId) {
      throw new BadRequestException(
        'Payment intent ID is required.',
      );
    }

    const payment =
      await this.paymentModel
        .findOne({
          userId:
            this.objectId(userId),

          stripePaymentIntentId:
            cleanIntentId,
        })
        .exec();

    if (!payment) {
      throw new NotFoundException(
        'Payment was not found.',
      );
    }

    try {
      const intent =
        await this.stripeService.client.paymentIntents.retrieve(
          cleanIntentId,
        );

      // ========================================================
      // SECURITY CHECK
      // ========================================================

      if (
        intent.metadata?.paymentId &&
        intent.metadata.paymentId !==
          payment.id
      ) {
        throw new BadRequestException(
          'Stripe payment metadata does not match the internal payment.',
        );
      }

      // ========================================================
      // UPDATE PAYMENT STATUS
      // ========================================================

      this.updatePaymentFromIntent(
        payment,
        intent,
      );

      await payment.save();

      // ========================================================
      // STRIPE SUCCESS => FULFILL
      // ========================================================

      let fulfillment:
        | {
            success: boolean;
            alreadyFulfilled?: boolean;
            purpose?: string;
            message?: string;
          }
        | null = null;

      if (
        intent.status ===
        'succeeded'
      ) {
        fulfillment =
          await this.fulfillSuccessfulPayment(
            payment,
            intent,
          );
      }

      return {
        ...this.publicPayment(
          payment,
          intent.client_secret ??
            null,
        ),

        fulfillment,
      };
    } catch (error) {
      if (
        error instanceof
        BadRequestException
      ) {
        throw error;
      }

      const message =
        error instanceof
        Stripe.errors.StripeError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Unable to retrieve Stripe payment.';

      throw new BadRequestException(
        message,
      );
    }
  }

  // ============================================================
  // UPDATE PAYMENT FROM STRIPE
  // ============================================================

  private updatePaymentFromIntent(
    payment: PaymentDocument,
    intent: Stripe.PaymentIntent,
  ): void {
    switch (
      intent.status
    ) {
      case 'succeeded':
        payment.status =
          PaymentStatus.PAID;

        payment.paidAt =
          payment.paidAt ??
          new Date();

        payment.failureMessage =
          null;

        break;

      case 'processing':
        payment.status =
          PaymentStatus.PROCESSING;

        break;

      case 'canceled':
        payment.status =
          PaymentStatus.CANCELLED;

        break;

      case 'requires_payment_method':
      case 'requires_confirmation':
      case 'requires_action':
        payment.status =
          PaymentStatus.REQUIRES_PAYMENT;

        break;

      default:
        payment.status =
          PaymentStatus.PROCESSING;

        break;
    }
  }

  // ============================================================
  // UNIVERSAL PAYMENT FULFILLMENT
  // ============================================================
  //
  // Every successful payment reaches this method.
  //
  // This method is intentionally idempotent because it can be
  // called from:
  //
  // 1. /payments/confirm
  // 2. Stripe webhook
  // 3. Idempotent retries
  //
  // ============================================================

  private async fulfillSuccessfulPayment(
    payment: PaymentDocument,
    intent: Stripe.PaymentIntent,
  ): Promise<{
    success: boolean;
    alreadyFulfilled?: boolean;
    purpose: string;
    message?: string;
  }> {
    if (
      intent.status !==
      'succeeded'
    ) {
      return {
        success: false,
        purpose:
          payment.purpose,
        message:
          'Payment has not succeeded.',
      };
    }

    const userId =
      String(
        payment.userId,
      );

    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException(
        'Payment contains an invalid user ID.',
      );
    }

    // ==========================================================
    // FOCKIS ID
    // ==========================================================

    if (
      payment.purpose ===
      'fockis_id'
    ) {
      return this.fulfillFockisId(
        userId,
        intent,
      );
    }

    // ==========================================================
    // OTHER SERVICES
    // ==========================================================

    this.logger.log(
      `Payment ${payment.id} succeeded for purpose "${payment.purpose}". No service-specific fulfillment is registered yet.`,
    );

    return {
      success: true,
      alreadyFulfilled: false,
      purpose:
        payment.purpose,
      message:
        'Payment recorded successfully.',
    };
  }

  // ============================================================
  // FOCKIS ID FULFILLMENT
  // ============================================================

  private async fulfillFockisId(
    userId: string,
    intent: Stripe.PaymentIntent,
  ): Promise<{
    success: boolean;
    alreadyFulfilled: boolean;
    purpose: string;
    message?: string;
  }> {
    // ==========================================================
    // IMPORTANT
    //
    // Do NOT allow the payment service to independently modify
    // the Fockis ID access fields.
    //
    // UsersService is the single owner of Fockis ID activation.
    // ==========================================================

    const result =
      await this.usersService.markFockisIdAccessPaid(
        userId,
        intent.id,
      );

    if (!result?.success) {
      throw new BadRequestException(
        'Fockis ID payment was successful, but activation could not be completed.',
      );
    }

    if (
      result.alreadyPaid ===
      true
    ) {
      this.logger.log(
        `Fockis ID was already activated for user ${userId}.`,
      );

      return {
        success: true,
        alreadyFulfilled: true,
        purpose:
          'fockis_id',
        message:
          'Fockis ID access was already activated.',
      };
    }

    this.logger.log(
      `Fockis ID activated for user ${userId} using Stripe payment ${intent.id}.`,
    );

    return {
      success: true,
      alreadyFulfilled: false,
      purpose:
        'fockis_id',
      message:
        'Fockis ID access activated successfully.',
    };
  }

  // ============================================================
  // REFUND
  // ============================================================

  async refund(
    userId: string,
    paymentId: string,
    amount?: number,
  ) {
    if (
      !paymentId ||
      !Types.ObjectId.isValid(
        paymentId,
      )
    ) {
      throw new BadRequestException(
        'Invalid payment ID.',
      );
    }

    const payment =
      await this.paymentModel
        .findOne({
          _id:
            new Types.ObjectId(
              paymentId,
            ),

          userId:
            this.objectId(userId),
        })
        .exec();

    if (!payment) {
      throw new NotFoundException(
        'Payment was not found.',
      );
    }

    if (
      !payment.stripePaymentIntentId
    ) {
      throw new BadRequestException(
        'This payment does not have a Stripe payment intent.',
      );
    }

    if (
      payment.status !==
        PaymentStatus.PAID &&
      payment.status !==
        PaymentStatus.PARTIALLY_REFUNDED
    ) {
      throw new BadRequestException(
        'Only successful payments can be refunded.',
      );
    }

    const alreadyRefunded =
      Number(
        payment.refundedAmount ||
          0,
      );

    const remaining =
      Number(
        payment.chargedAmount,
      ) -
      alreadyRefunded;

    const requestedAmount =
      amount === undefined ||
      amount === null
        ? remaining
        : this.normalizeAmount(
            amount,
          );

    if (
      requestedAmount >
      remaining
    ) {
      throw new BadRequestException(
        'Refund amount exceeds the remaining payment balance.',
      );
    }

    const stripeRefundAmount =
      this.amountInMinorUnits(
        requestedAmount,
        payment.chargedCurrency,
      );

    try {
      await this.stripeService.client.refunds.create(
        {
          payment_intent:
            payment.stripePaymentIntentId,

          amount:
            stripeRefundAmount,
        },
      );
    } catch (error) {
      const message =
        error instanceof
        Stripe.errors.StripeError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Stripe refund failed.';

      throw new BadRequestException(
        message,
      );
    }

    payment.refundedAmount =
      alreadyRefunded +
      requestedAmount;

    if (
      payment.refundedAmount >=
      payment.chargedAmount
    ) {
      payment.refundedAmount =
        payment.chargedAmount;

      payment.status =
        PaymentStatus.REFUNDED;

      payment.refundedAt =
        new Date();
    } else {
      payment.status =
        PaymentStatus.PARTIALLY_REFUNDED;
    }

    await payment.save();

    return this.publicPayment(
      payment,
      null,
    );
  }

  // ============================================================
  // STRIPE WEBHOOK
  // ============================================================

  async handleWebhook(
    rawBody: Buffer,
    signature: string,
  ) {
    if (!rawBody) {
      throw new BadRequestException(
        'Stripe webhook raw body is missing.',
      );
    }

    if (!signature) {
      throw new BadRequestException(
        'Stripe signature is missing.',
      );
    }

    const webhookSecret =
      process.env
        .STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new BadRequestException(
        'STRIPE_WEBHOOK_SECRET is not configured.',
      );
    }

    let event: Stripe.Event;

    try {
      event =
        this.stripeService.client.webhooks.constructEvent(
          rawBody,
          signature,
          webhookSecret,
        );
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error
          ? error.message
          : 'Invalid Stripe webhook signature.',
      );
    }

    // ==========================================================
    // PAYMENT SUCCEEDED
    // ==========================================================

    switch (
      event.type
    ) {
      case 'payment_intent.succeeded': {
        const intent =
          event.data
            .object as Stripe.PaymentIntent;

        await this.markPaymentSucceeded(
          intent,
        );

        break;
      }

      // ========================================================
      // PAYMENT FAILED
      // ========================================================

      case 'payment_intent.payment_failed': {
        const intent =
          event.data
            .object as Stripe.PaymentIntent;

        const payment =
          await this.paymentModel
            .findOne({
              stripePaymentIntentId:
                intent.id,
            })
            .exec();

        if (payment) {
          payment.status =
            PaymentStatus.FAILED;

          payment.failureMessage =
            intent
              .last_payment_error
              ?.message ??
            'Payment failed.';

          await payment.save();
        }

        break;
      }

      // ========================================================
      // PAYMENT CANCELED
      // ========================================================

      case 'payment_intent.canceled': {
        const intent =
          event.data
            .object as Stripe.PaymentIntent;

        const payment =
          await this.paymentModel
            .findOne({
              stripePaymentIntentId:
                intent.id,
            })
            .exec();

        if (payment) {
          payment.status =
            PaymentStatus.CANCELLED;

          await payment.save();
        }

        break;
      }

      default:
        break;
    }

    return {
      received: true,
    };
  }

  // ============================================================
  // MARK PAYMENT SUCCESSFUL + FULFILL
  // ============================================================

  private async markPaymentSucceeded(
    intent: Stripe.PaymentIntent,
  ): Promise<void> {
    const payment =
      await this.paymentModel
        .findOne({
          stripePaymentIntentId:
            intent.id,
        })
        .exec();

    if (!payment) {
      this.logger.warn(
        `Stripe payment ${intent.id} succeeded, but no internal payment record was found.`,
      );

      return;
    }

    // ==========================================================
    // MARK INTERNAL PAYMENT PAID
    // ==========================================================

    payment.status =
      PaymentStatus.PAID;

    payment.paidAt =
      payment.paidAt ??
      new Date();

    payment.failureMessage =
      null;

    await payment.save();

    // ==========================================================
    // FULFILL SERVICE
    // ==========================================================

    try {
      await this.fulfillSuccessfulPayment(
        payment,
        intent,
      );
    } catch (error) {
      this.logger.error(
        `Payment ${payment.id} was paid but fulfillment failed.`,
        error instanceof Error
          ? error.stack
          : String(error),
      );
    }
  }
}