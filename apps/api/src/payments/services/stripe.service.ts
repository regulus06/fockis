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

    const validPrefixes = [
      'sk_test_',
      'sk_live_',
      'rk_test_',
      'rk_live_',
    ];

    if (!validPrefixes.some((prefix) => key.startsWith(prefix))) {
      throw new InternalServerErrorException(
        'STRIPE_SECRET_KEY must be a valid Stripe secret or restricted key.',
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