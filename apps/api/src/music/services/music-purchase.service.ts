import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';

import { Model, Types } from 'mongoose';

import Stripe from 'stripe';

import {
  MusicContent,
  MusicAccessType,
} from '../schemas/music-content.schema';

import {
  MusicPurchase,
  MusicPaymentStatus,
  ProducerEarning,
} from '../schemas/music-purchase.schema';

import { MusicEntitlementService } from './music-entitlement.service';

import { FockisStripeService } from '../../payments/services/stripe.service';

// ============================================================================
// FEE CONFIGURATION
// ============================================================================

const PLATFORM_FEE_BPS = 1500; // 15%

const ESTIMATED_PROCESSING_FEE_BPS = 290; // 2.9%

const ESTIMATED_PROCESSING_FEE_FIXED_CENTS = 30;

// ============================================================================
// MUSIC PURCHASE SERVICE
// ============================================================================

@Injectable()
export class MusicPurchaseService {
  private readonly logger = new Logger(
    MusicPurchaseService.name,
  );

  constructor(
    @InjectModel(MusicContent.name)
    private readonly contentModel: Model<MusicContent>,

    @InjectModel(MusicPurchase.name)
    private readonly purchaseModel: Model<MusicPurchase>,

    @InjectModel(ProducerEarning.name)
    private readonly earningModel: Model<ProducerEarning>,

    private readonly entitlementService: MusicEntitlementService,

    /**
     * Existing Fockis Stripe service.
     *
     * This is the application's single Stripe integration.
     */
    private readonly stripeService: FockisStripeService,
  ) {}

  // ==========================================================================
  // INITIATE PURCHASE
  // ==========================================================================

  /**
   * Starts a music purchase.
   *
   * SECURITY:
   *
   * The client sends ONLY contentId.
   *
   * The server determines:
   *
   * - content
   * - producer
   * - access type
   * - price
   * - currency
   * - platform fee
   * - processing fee
   * - producer earnings
   *
   * The client cannot control the amount charged.
   */
  async initiatePurchase(
    userId: string,
    contentId: string,
  ) {
    // ------------------------------------------------------------------------
    // VALIDATE USER
    // ------------------------------------------------------------------------

    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException(
        'Invalid user ID.',
      );
    }

    // ------------------------------------------------------------------------
    // VALIDATE CONTENT ID
    // ------------------------------------------------------------------------

    if (!Types.ObjectId.isValid(contentId)) {
      throw new BadRequestException(
        'Invalid content ID.',
      );
    }

    const userObjectId =
      new Types.ObjectId(userId);

    const contentObjectId =
      new Types.ObjectId(contentId);

    // ------------------------------------------------------------------------
    // LOAD CONTENT
    // ------------------------------------------------------------------------

    const content =
      await this.contentModel
        .findById(contentObjectId)
        .lean();

    if (!content) {
      throw new NotFoundException(
        'Content not found.',
      );
    }

    // ------------------------------------------------------------------------
    // FREE CONTENT
    // ------------------------------------------------------------------------

    if (
      content.accessType ===
      MusicAccessType.FREE
    ) {
      throw new BadRequestException(
        'This content is free and does not require a purchase.',
      );
    }

    // ------------------------------------------------------------------------
    // PRODUCER CANNOT PURCHASE OWN CONTENT
    // ------------------------------------------------------------------------

    if (
      content.producerId &&
      content.producerId.toString() ===
        userId
    ) {
      throw new BadRequestException(
        'Producers cannot purchase their own content.',
      );
    }

    // ------------------------------------------------------------------------
    // CHECK EXISTING ENTITLEMENT
    // ------------------------------------------------------------------------

    const alreadyEntitled =
      await this.entitlementService.hasActiveEntitlement(
        userId,
        contentId,
      );

    if (alreadyEntitled) {
      throw new ConflictException(
        'You already have access to this content.',
      );
    }

    // ------------------------------------------------------------------------
    // SERVER-SIDE PRICE
    // ------------------------------------------------------------------------

    const amountCents = Number(
      content.priceCents,
    );

    if (
      !Number.isInteger(amountCents) ||
      amountCents <= 0
    ) {
      throw new BadRequestException(
        'This content does not have a valid price configured.',
      );
    }

    /**
     * Stripe's normal minimum for USD is 50 cents.
     *
     * For other currencies, Stripe has different minimums.
     * The configured content currency is therefore validated below
     * through the actual Stripe request.
     */
    if (amountCents < 1) {
      throw new BadRequestException(
        'This content price is invalid.',
      );
    }

    // ------------------------------------------------------------------------
    // SERVER-SIDE CURRENCY
    // ------------------------------------------------------------------------

    const currency = String(
      content.currency ?? 'usd',
    )
      .trim()
      .toLowerCase();

    if (
      !/^[a-z]{3}$/.test(currency)
    ) {
      throw new BadRequestException(
        'This content does not have a valid currency configured.',
      );
    }

    // ------------------------------------------------------------------------
    // CALCULATE FEES
    // ------------------------------------------------------------------------

    const {
      platformFeeCents,
      processingFeeCents,
      netProducerCents,
    } = this.computeFees(
      amountCents,
    );

    // ------------------------------------------------------------------------
    // CREATE STRIPE PAYMENT INTENT
    // ------------------------------------------------------------------------

    let paymentIntent: Stripe.PaymentIntent;

    try {
      paymentIntent =
        await this.stripeService.client.paymentIntents.create(
          {
            amount: amountCents,

            currency,

            automatic_payment_methods: {
              enabled: true,
            },

            metadata: {
              type: 'music_purchase',

              contentId,

              userId,

              amountCents:
                String(amountCents),

              currency,

              platformFeeCents:
                String(platformFeeCents),

              processingFeeCents:
                String(processingFeeCents),

              netProducerCents:
                String(netProducerCents),
            },
          },
          {
            idempotencyKey:
              `music_purchase_${userId}_${contentId}_${Date.now()}`,
          },
        );
    } catch (error) {
      this.logger.error(
        `Failed to create Stripe PaymentIntent for music content ${contentId}`,
        error instanceof Error
          ? error.stack
          : String(error),
      );

      throw error;
    }

    // ------------------------------------------------------------------------
    // VALIDATE STRIPE RESPONSE
    // ------------------------------------------------------------------------

    if (
      !paymentIntent?.id ||
      !paymentIntent?.client_secret
    ) {
      this.logger.error(
        `Stripe PaymentIntent did not return an ID/client secret for music content ${contentId}`,
      );

      throw new BadRequestException(
        'Unable to start the music payment.',
      );
    }

    // ------------------------------------------------------------------------
    // CREATE LOCAL PURCHASE RECORD
    // ------------------------------------------------------------------------

    /**
     * The purchase remains PENDING here.
     *
     * Entitlement is NOT granted yet.
     *
     * The Stripe webhook must confirm the payment first.
     */

    let purchase: MusicPurchase;

    try {
      purchase =
        await this.purchaseModel.create({
          userId:
            userObjectId,

          contentId:
            contentObjectId,

          producerId:
            content.producerId,

          stripePaymentIntentId:
            paymentIntent.id,

          amountCents,

          currency,

          platformFeeCents,

          processingFeeCents,

          netProducerCents,

          status:
            MusicPaymentStatus.PENDING,
        });
    } catch (error) {
      /**
       * Stripe PaymentIntent already exists,
       * but the local purchase record failed.
       *
       * Log this loudly so the payment can be reconciled.
       */

      this.logger.error(
        `Stripe PaymentIntent ${paymentIntent.id} was created but MusicPurchase creation failed for content ${contentId}`,
        error instanceof Error
          ? error.stack
          : String(error),
      );

      throw new BadRequestException(
        'Unable to initialize the music purchase. Please try again.',
      );
    }

    // ------------------------------------------------------------------------
    // RETURN PAYMENT SESSION
    // ------------------------------------------------------------------------

    const purchaseId =
      purchase._id?.toString();

    this.logger.log(
      `Music purchase initiated: ${purchaseId} | content=${contentId} | user=${userId} | amount=${amountCents} ${currency} | stripe=${paymentIntent.id}`,
    );

    return {
      success: true,

      purchaseId,

      paymentIntentId:
        paymentIntent.id,

      clientSecret:
        paymentIntent.client_secret,

      amountCents,

      currency,

      status:
        MusicPaymentStatus.PENDING,
    };
  }

  // ==========================================================================
  // STRIPE WEBHOOK CONFIRMATION
  // ==========================================================================

  /**
   * Called by the Stripe webhook when
   * payment_intent.succeeded is received.
   *
   * This method is idempotent.
   */
  async confirmFromWebhook(
    stripePaymentIntentId: string,
  ): Promise<void> {
    if (!stripePaymentIntentId) {
      this.logger.warn(
        'Webhook confirmation received without a Stripe PaymentIntent ID.',
      );

      return;
    }

    const purchase =
      await this.purchaseModel.findOne({
        stripePaymentIntentId,
      });

    if (!purchase) {
      this.logger.warn(
        `Webhook confirm: no MusicPurchase found for PI ${stripePaymentIntentId}`,
      );

      return;
    }

    const purchaseId =
      purchase._id?.toString();

    // ------------------------------------------------------------------------
    // IDEMPOTENCY
    // ------------------------------------------------------------------------

    if (
      purchase.status ===
      MusicPaymentStatus.SUCCEEDED
    ) {
      this.logger.log(
        `Music purchase ${purchaseId} was already confirmed.`,
      );

      return;
    }

    // ------------------------------------------------------------------------
    // MARK PURCHASE SUCCEEDED
    // ------------------------------------------------------------------------

    purchase.status =
      MusicPaymentStatus.SUCCEEDED;

    await purchase.save();

    // ------------------------------------------------------------------------
    // LOAD CONTENT
    // ------------------------------------------------------------------------

    const content =
      await this.contentModel
        .findById(
          purchase.contentId,
        )
        .select(
          'accessType producerId',
        );

    if (!content) {
      this.logger.error(
        `Music purchase ${purchaseId} references missing content ${purchase.contentId}`,
      );

      return;
    }

    // ------------------------------------------------------------------------
    // CREATE ENTITLEMENT
    // ------------------------------------------------------------------------

    await this.entitlementService.createFromPurchase({
      userId:
        purchase.userId,

      contentId:
        purchase.contentId,

      producerId:
        purchase.producerId,

      purchaseId:
        purchase._id as Types.ObjectId,

      accessType:
        content.accessType ??
        MusicAccessType.PAID,

      amountPaidCents:
        purchase.amountCents,

      currency:
        purchase.currency,
    });

    // ------------------------------------------------------------------------
    // INCREMENT PURCHASE COUNT
    // ------------------------------------------------------------------------

    await this.contentModel.updateOne(
      {
        _id:
          purchase.contentId,
      },
      {
        $inc: {
          purchaseCount: 1,
        },
      },
    );

    // ------------------------------------------------------------------------
    // PRODUCER EARNINGS
    // ------------------------------------------------------------------------

    await this.earningModel.findOneAndUpdate(
      {
        producerId:
          purchase.producerId,
      },
      {
        $inc: {
          grossRevenueCents:
            purchase.amountCents,

          platformFeeCents:
            purchase.platformFeeCents,

          processingFeeCents:
            purchase.processingFeeCents,

          netRevenueCents:
            purchase.netProducerCents,

          pendingBalanceCents:
            purchase.netProducerCents,
        },
      },
      {
        upsert: true,
      },
    );

    this.logger.log(
      `Music purchase confirmed: ${purchaseId} (${purchase.amountCents} ${purchase.currency})`,
    );
  }

  // ==========================================================================
  // FAILED PAYMENT
  // ==========================================================================

  async markFailed(
    stripePaymentIntentId: string,
    reason: string,
  ): Promise<void> {
    if (!stripePaymentIntentId) {
      return;
    }

    await this.purchaseModel.updateOne(
      {
        stripePaymentIntentId,
      },
      {
        $set: {
          status:
            MusicPaymentStatus.FAILED,

          failureReason:
            reason ||
            'Payment failed.',
        },
      },
    );

    this.logger.warn(
      `Music payment failed: ${stripePaymentIntentId} - ${reason}`,
    );
  }

  // ==========================================================================
  // REFUND
  // ==========================================================================

  /**
   * Updates local music purchase records after
   * a successful Stripe refund.
   */
  async refund(
    purchaseId: string,
  ): Promise<void> {
    // ------------------------------------------------------------------------
    // VALIDATE PURCHASE ID
    // ------------------------------------------------------------------------

    if (
      !Types.ObjectId.isValid(
        purchaseId,
      )
    ) {
      throw new BadRequestException(
        'Invalid purchase ID.',
      );
    }

    // ------------------------------------------------------------------------
    // LOAD PURCHASE
    // ------------------------------------------------------------------------

    const purchase =
      await this.purchaseModel.findById(
        purchaseId,
      );

    if (
      !purchase ||
      purchase.status !==
        MusicPaymentStatus.SUCCEEDED
    ) {
      throw new BadRequestException(
        'Purchase is not in a refundable state.',
      );
    }

    const purchaseDocumentId =
      purchase._id?.toString();

    // ------------------------------------------------------------------------
    // STRIPE REFUND
    // ------------------------------------------------------------------------

    if (
      !purchase.stripePaymentIntentId
    ) {
      throw new BadRequestException(
        'This purchase does not have a Stripe PaymentIntent.',
      );
    }

    try {
      await this.stripeService.client.refunds.create(
        {
          payment_intent:
            purchase.stripePaymentIntentId,

          amount:
            purchase.amountCents,
        },
      );
    } catch (error) {
      this.logger.error(
        `Stripe refund failed for music purchase ${purchaseDocumentId}`,
        error instanceof Error
          ? error.stack
          : String(error),
      );

      throw error;
    }

    // ------------------------------------------------------------------------
    // MARK REFUNDED
    // ------------------------------------------------------------------------

    purchase.status =
      MusicPaymentStatus.REFUNDED;

    purchase.refundedAt =
      new Date();

    await purchase.save();

    // ------------------------------------------------------------------------
    // PRODUCER BALANCE
    // ------------------------------------------------------------------------

    await this.earningModel.updateOne(
      {
        producerId:
          purchase.producerId,
      },
      {
        $inc: {
          refundedCents:
            purchase.amountCents,

          netRevenueCents:
            -purchase.netProducerCents,

          availableBalanceCents:
            -purchase.netProducerCents,
        },
      },
    );

    // ------------------------------------------------------------------------
    // REVOKE ENTITLEMENT
    // ------------------------------------------------------------------------

    await this.purchaseModel.db
      .model('MusicEntitlement')
      .updateOne(
        {
          purchaseId:
            purchase._id,
        },
        {
          $set: {
            status: 'revoked',
          },
        },
      );

    this.logger.log(
      `Music purchase refunded: ${purchaseDocumentId}`,
    );
  }

  // ==========================================================================
  // USER PURCHASES
  // ==========================================================================

  async listForUser(
    userId: string,
  ) {
    // ------------------------------------------------------------------------
    // VALIDATE USER
    // ------------------------------------------------------------------------

    if (
      !Types.ObjectId.isValid(
        userId,
      )
    ) {
      throw new BadRequestException(
        'Invalid user ID.',
      );
    }

    // ------------------------------------------------------------------------
    // RETURN SUCCESSFUL PURCHASES
    // ------------------------------------------------------------------------

    return this.purchaseModel
      .find({
        userId:
          new Types.ObjectId(
            userId,
          ),

        status:
          MusicPaymentStatus.SUCCEEDED,
      })
      .sort({
        createdAt: -1,
      })
      .lean();
  }

  // ==========================================================================
  // PRODUCER PURCHASES
  // ==========================================================================

  async listForProducer(
    producerId: string,
    limit = 50,
  ) {
    // ------------------------------------------------------------------------
    // VALIDATE PRODUCER
    // ------------------------------------------------------------------------

    if (
      !Types.ObjectId.isValid(
        producerId,
      )
    ) {
      throw new BadRequestException(
        'Invalid producer ID.',
      );
    }

    // ------------------------------------------------------------------------
    // SAFE LIMIT
    // ------------------------------------------------------------------------

    const safeLimit =
      Math.min(
        Math.max(
          Number(limit) || 50,
          1,
        ),
        100,
      );

    // ------------------------------------------------------------------------
    // RETURN SUCCESSFUL PURCHASES
    // ------------------------------------------------------------------------

    return this.purchaseModel
      .find({
        producerId:
          new Types.ObjectId(
            producerId,
          ),

        status:
          MusicPaymentStatus.SUCCEEDED,
      })
      .sort({
        createdAt: -1,
      })
      .limit(safeLimit)
      .lean();
  }

  // ==========================================================================
  // FEE CALCULATION
  // ==========================================================================

  private computeFees(
    amountCents: number,
  ) {
    // ------------------------------------------------------------------------
    // PLATFORM FEE
    // ------------------------------------------------------------------------

    const platformFeeCents =
      Math.round(
        (amountCents *
          PLATFORM_FEE_BPS) /
          10000,
      );

    // ------------------------------------------------------------------------
    // ESTIMATED STRIPE PROCESSING FEE
    // ------------------------------------------------------------------------

    const processingFeeCents =
      Math.round(
        (amountCents *
          ESTIMATED_PROCESSING_FEE_BPS) /
          10000 +
          ESTIMATED_PROCESSING_FEE_FIXED_CENTS,
      );

    // ------------------------------------------------------------------------
    // PRODUCER NET
    // ------------------------------------------------------------------------

    const netProducerCents =
      Math.max(
        0,
        amountCents -
          platformFeeCents -
          processingFeeCents,
      );

    return {
      platformFeeCents,
      processingFeeCents,
      netProducerCents,
    };
  }
}