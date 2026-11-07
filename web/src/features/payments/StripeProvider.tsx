import React, { useEffect, useState } from 'react';

import { Elements } from '@stripe/react-stripe-js';

import {
  loadStripe,
  type Stripe,
} from '@stripe/stripe-js';

import './styles/CheckoutPage.scss';

interface Props {
  children: React.ReactNode;
}

const publishableKey = String(
  import.meta.env.VITE_STRIPE_PUBLIC_KEY ?? '',
).trim();

const stripePromise = publishableKey
  ? loadStripe(publishableKey)
  : Promise.resolve(null);

const StripeProvider: React.FC<Props> = ({ children }) => {
  const [stripeReady, setStripeReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    console.info(
      '[FOCKIS STRIPE] Publishable key configured:',
      Boolean(publishableKey),
    );

    if (!publishableKey) {
      setError(
        'Stripe publishable key is missing. Add VITE_STRIPE_PUBLIC_KEY to the web .env file.',
      );
      return;
    }

    if (!/^pk_(test|live)_/.test(publishableKey)) {
      setError(
        'Invalid Stripe publishable key format. The key must start with pk_test_ or pk_live_.',
      );
      return;
    }

    stripePromise
      .then((instance: Stripe | null) => {
        if (!active) return;

        if (!instance) {
          setError('Stripe failed to initialize.');
          return;
        }

        setStripeReady(true);

        console.info(
          '[FOCKIS STRIPE] Stripe initialized successfully.',
        );
      })
      .catch((stripeError: unknown) => {
        if (!active) return;

        console.error(
          '[FOCKIS STRIPE] Initialization error:',
          stripeError,
        );

        setError(
          stripeError instanceof Error
            ? stripeError.message
            : 'Stripe failed to initialize. Check your publishable key and network connection.',
        );
      });

    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return (
      <div
        role="alert"
        className="fockis-stripe-state fockis-stripe-state--error"
      >
        <span className="fockis-stripe-state__icon" aria-hidden="true">
          !
        </span>

        <div>
          <strong>Secure payment unavailable</strong>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!stripeReady) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fockis-stripe-state"
      >
        <span className="fockis-stripe-state__icon" aria-hidden="true">
          <span className="fockis-stripe-state__spinner" />
        </span>

        <div>
          <strong>Preparing secure checkout…</strong>
          <p>Connecting to Stripe. This only takes a moment.</p>
        </div>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      {children}
    </Elements>
  );
};

export default StripeProvider;
