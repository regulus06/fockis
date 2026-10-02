import { api } from '../../../api/api';

import type {
  CreatePaymentInput,
  UniversalPaymentResponse,
  ConfirmPaymentResponse,
} from '../types/universalPayment';

export const universalPaymentApi = {
  /**
   * Creates a universal Fockis payment.
   *
   * The backend:
   * - determines the user's charged currency from country
   * - performs FX conversion
   * - creates the Stripe PaymentIntent
   * - stores the payment record
   */
  async create(
    input: CreatePaymentInput,
  ): Promise<UniversalPaymentResponse> {
    const response = await api.post<UniversalPaymentResponse>(
      '/payments/create',
      input,
    );

    return response.data;
  },

  /**
   * Confirms/verifies a Stripe PaymentIntent on the backend.
   */
  async confirm(
    paymentIntentId: string,
  ): Promise<ConfirmPaymentResponse> {
    const response = await api.post<ConfirmPaymentResponse>(
      '/payments/confirm',
      {
        paymentIntentId,
      },
    );

    return response.data;
  },

  /**
   * Convenience method for creating an idempotency key.
   */
  createIdempotencyKey(
    purpose: string,
    referenceId: string,
  ): string {
    const random =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    return `${purpose}-${referenceId}-${random}`;
  },
};

export default universalPaymentApi;