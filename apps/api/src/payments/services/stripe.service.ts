import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

import Stripe from 'stripe';

@Injectable()
export class FockisStripeService {
  private readonly stripe: Stripe;

  constructor() {
    const key = process.env.STRIPE_SECRET_KEY?.trim();

    if (!key) {
      throw new InternalServerErrorException(
        'STRIPE_SECRET_KEY is not configured.',
      );
    }

    if (
      !key.startsWith('sk_test_') &&
      !key.startsWith('sk_live_')
    ) {
      throw new InternalServerErrorException(
        'STRIPE_SECRET_KEY must be a valid Stripe secret key.',
      );
    }

    this.stripe = new Stripe(key, {
      apiVersion: '2026-05-27.dahlia',
    });
  }

  get client(): Stripe {
    return this.stripe;
  }
}