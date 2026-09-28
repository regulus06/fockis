import { useCallback, useState } from 'react';
import { musicPurchaseApi } from '../services/musicPurchaseApi';

export type PurchaseStatus = 'idle' | 'loading' | 'awaiting_confirmation' | 'succeeded' | 'error';

/**
 * Drives the "Unlock" purchase flow. `awaiting_confirmation` means the
 * PaymentIntent was created and the frontend should hand `clientSecret` to
 * your EXISTING Stripe Elements confirmation flow (reuse it — do not build
 * a second checkout UI). This hook does not itself decide when a purchase
 * has succeeded; call `useMusicEntitlement.refresh()` after Stripe confirms
 * on the client, since the true grant only happens once the webhook lands.
 */
export function useMusicPurchase() {
  const [status, setStatus] = useState<PurchaseStatus>('idle');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startPurchase = useCallback(async (contentId: string) => {
    setStatus('loading');
    setError(null);
    try {
      const result = await musicPurchaseApi.initiate(contentId);
      setClientSecret(result.clientSecret);
      setStatus('awaiting_confirmation');
      return result;
    } catch (err: any) {
      const message =
        err?.response?.status === 409
          ? 'You already own this content.'
          : err?.response?.status === 401
            ? 'Please sign in to make a purchase.'
            : 'Could not start checkout. Please try again.';
      setError(message);
      setStatus('error');
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setClientSecret(null);
    setError(null);
  }, []);

  return { status, clientSecret, error, startPurchase, reset };
}
