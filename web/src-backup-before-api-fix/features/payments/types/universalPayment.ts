/**
 * Universal Payment Types
 *
 * Shared frontend contract for the Fockis payment system.
 *
 * This file intentionally does not import PaymentPurpose from another
 * frontend file. That keeps the payment module self-contained and prevents
 * path/module errors when the payment system is used by multiple services.
 */

/**
 * Supported payment purposes across Fockis.
 *
 * Additional purposes can still be sent because CreatePaymentInput.purpose
 * accepts `string` as well.
 */
export type PaymentPurpose =
  | 'fockis_id'
  | 'marketplace'
  | 'coins'
  | 'travel'
  | 'music'
  | 'event'
  | 'meeting'
  | 'subscription'
  | 'booking'
  | 'service'
  | 'other';

/**
 * Data required to create a universal payment.
 */
export interface CreatePaymentInput {
  /**
   * Identifies the service or feature being paid for.
   *
   * Examples:
   * - fockis_id
   * - marketplace
   * - coins
   * - travel
   * - music
   * - event
   */
  purpose: PaymentPurpose | string;

  /**
   * ID identifying what the payment is for.
   *
   * Examples:
   * - Fockis ID access record
   * - marketplace order
   * - coin package
   * - travel booking
   * - music purchase
   * - event ticket
   */
  referenceId: string;

  /**
   * Amount in the service's original/base currency.
   *
   * IMPORTANT:
   * For production marketplace/order payments, the backend should
   * eventually calculate this amount itself instead of trusting the
   * frontend.
   */
  baseAmount: number;

  /**
   * Currency of the original service price.
   *
   * Examples:
   * - USD
   * - HTG
   * - CAD
   */
  baseCurrency: string;

  /**
   * ISO 3166-1 alpha-2 country code.
   *
   * Examples:
   * - HT = Haiti
   * - US = United States
   * - CA = Canada
   * - DO = Dominican Republic
   */
  country: string;

  /**
   * Prevents duplicate payment creation.
   *
   * The backend should use this value for idempotent payment creation.
   */
  idempotencyKey?: string;

  /**
   * Additional server-side information.
   *
   * Do not put sensitive information such as card numbers,
   * CVV codes, passwords, or authentication secrets here.
   */
  metadata?: Record<string, string>;
}

/**
 * Response returned by the universal payment creation endpoint.
 */
export interface UniversalPaymentResponse {
  /**
   * Fockis internal payment record ID.
   */
  paymentId: string;

  /**
   * Stripe PaymentIntent client secret.
   *
   * Can be null for payment methods that do not use Stripe.
   */
  clientSecret: string | null;

  /**
   * Payment purpose.
   */
  purpose: string;

  /**
   * Service/order/booking/etc. reference.
   */
  referenceId: string;

  /**
   * Original amount before currency conversion.
   */
  baseAmount: number;

  /**
   * Original/base currency.
   */
  baseCurrency: string;

  /**
   * Amount actually charged to the customer.
   */
  chargedAmount: number;

  /**
   * Currency actually charged.
   *
   * For example:
   * USD for a US customer
   * HTG for a Haiti customer, if the backend/payment provider
   * supports charging in HTG.
   */
  chargedCurrency: string;

  /**
   * Customer country used by the currency/payment rules.
   */
  country: string;

  /**
   * Exchange rate used by the backend.
   *
   * Usually:
   *
   * chargedAmount = baseAmount * exchangeRate
   */
  exchangeRate: number;

  /**
   * Current Fockis payment status.
   */
  status: string;

  /**
   * Stripe PaymentIntent ID.
   *
   * Can be null when Stripe is not involved.
   */
  stripePaymentIntentId: string | null;
}

/**
 * Response returned after confirming a payment.
 */
export type ConfirmPaymentResponse = UniversalPaymentResponse;

/**
 * Universal payment statuses.
 */
export type UniversalPaymentStatus =
  | 'requires_payment'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'partially_refunded';