import React, { useEffect, useState } from 'react';

import { Elements } from '@stripe/react-stripe-js';

import {
  loadStripe,
  type Stripe,
} from '@stripe/stripe-js';

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
        style={{
          margin: '20px 0',
          padding: 18,
          border: '1px solid #dc2626',
          borderRadius: 8,
          background: '#fff7f7',
          color: '#991b1b',
        }}
      >
        <strong>Stripe payment unavailable</strong>

        <p
          style={{
            margin: '8px 0 0',
            fontSize: 13,
          }}
        >
          {error}
        </p>
      </div>
    );
  }

  if (!stripeReady) {
    return (
      <div
        role="status"
        style={{
          margin: '20px 0',
          padding: 12,
          color: '#6b7280',
          fontSize: 13,
        }}
      >
        Initializing secure payment…
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