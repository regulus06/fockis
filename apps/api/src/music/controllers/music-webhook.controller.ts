import {
  Controller,
  Headers,
  Post,
  Req,
} from '@nestjs/common';

import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';

import { MusicPurchaseService } from '../services/music-purchase.service';

/**
 * Fockis Music Stripe Webhook
 *
 * This controller is intentionally isolated as a fallback webhook endpoint.
 *
 * If the application already has a central Stripe webhook handler,
 * prefer routing Fockis Music Stripe events through that existing handler
 * instead of registering a second Stripe webhook endpoint.
 *
 * Stripe signature verification requires the untouched/raw request body.
 * Make sure the application's Nest/Express bootstrap is configured to
 * preserve req.rawBody for this route.
 */
@Controller('music/webhooks/stripe')
export class MusicWebhookController {
  constructor(
    private readonly purchaseService: MusicPurchaseService,
  ) {}

  /**
   * POST /music/webhooks/stripe
   *
   * IMPORTANT:
   * The actual Stripe signature verification should use the application's
   * existing Stripe client/configuration.
   *
   * Do not parse and reconstruct the request body before verification.
   */
  @Post()
  async handle(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    /*
     * INTEGRATION POINT
     *
     * Use the existing Stripe client already configured in the application:
     *
     * const event =
     *   stripeClient.webhooks.constructEvent(
     *     req.rawBody,
     *     signature,
     *     process.env.STRIPE_WEBHOOK_SECRET,
     *   );
     *
     * Then handle Fockis Music events:
     *
     * payment_intent.succeeded
     *   -> purchaseService.confirmFromWebhook(paymentIntent.id)
     *
     * payment_intent.payment_failed
     *   -> purchaseService.markFailed(
     *        paymentIntent.id,
     *        reason,
     *      )
     */

    if (!req.rawBody) {
      throw new Error(
        'Stripe webhook raw body is unavailable. Configure Nest/Express rawBody support before enabling Stripe signature verification.',
      );
    }

    if (!signature) {
      throw new Error(
        'Missing Stripe-Signature header.',
      );
    }

    /*
     * The webhook verification/dispatch is intentionally not implemented
     * here because this module does not own the application's Stripe client.
     *
     * Keep this explicit rather than accepting an unverified Stripe request.
     */
    throw new Error(
      'Wire this handler to the existing Stripe webhook verification service before processing Music payment events.',
    );
  }
}