import { api } from "../../../api/api";

const BASE_URL = "/payments";

export interface PaymentIntentResponse {
  success?: boolean;
  clientSecret: string;
  paymentIntentId?: string;
}

export interface FockisIdPaymentIntentResponse
  extends PaymentIntentResponse {
  price: number;
  currency: string;
  alreadyPaid: boolean;
  fockisId?: string | null;
  oneTime: boolean;
}

export interface ConfirmFockisIdPaymentResponse {
  success: boolean;
  paid: boolean;
  fockisId: string;
  paymentIntentId: string;
}

/**
 * Fockis payment service.
 *
 * IMPORTANT:
 * - Generic marketplace payments may provide an amount.
 * - Fockis ID payments NEVER provide an amount from the frontend.
 * - The backend is authoritative for Fockis ID price and currency.
 * - Stripe only processes/confirms the payment.
 */
export const stripeService = {
  /**
   * Existing generic payment intent.
   *
   * Used by existing marketplace checkout.
   */
  async createPaymentIntent(
    amount: number,
    currency = "usd",
  ): Promise<PaymentIntentResponse> {
    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      throw new Error(
        "Invalid payment amount.",
      );
    }

    const response =
      await api.post(
        `${BASE_URL}/create-payment-intent`,
        {
          amount,
          currency,
        },
      );

    return response.data as PaymentIntentResponse;
  },

  /**
   * Create a Fockis ID PaymentIntent.
   *
   * NO amount is accepted from the frontend.
   *
   * The backend determines:
   * - price
   * - currency
   * - whether the user already paid
   */
  async createFockisIdPaymentIntent(): Promise<FockisIdPaymentIntentResponse> {
    const response =
      await api.post(
        `${BASE_URL}/fockis-id-access/payment-intent`,
      );

    return response.data as FockisIdPaymentIntentResponse;
  },

  /**
   * Confirm a successful Fockis ID payment.
   *
   * The backend verifies the PaymentIntent directly with Stripe
   * before unlocking the Fockis ID.
   */
  async confirmFockisIdPayment(
    paymentIntentId: string,
  ): Promise<ConfirmFockisIdPaymentResponse> {
    if (!paymentIntentId?.trim()) {
      throw new Error(
        "Payment intent ID is required.",
      );
    }

    const response =
      await api.post(
        `${BASE_URL}/fockis-id-access/confirm`,
        {
          paymentIntentId:
            paymentIntentId.trim(),
        },
      );

    return response.data as ConfirmFockisIdPaymentResponse;
  },
};

export default stripeService;