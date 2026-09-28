import React, { useEffect, useState } from 'react';

import {
Elements,
} from '@stripe/react-stripe-js';

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

const StripeProvider: React.FC<Props> = ({
children,
}) => {
const [stripe, setStripe] =
useState<Stripe | null>(null);

const [error, setError] =
useState<string | null>(null);

useEffect(() => {
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

if (
  !publishableKey.startsWith('pk_')
) {
  setError(
    'Invalid Stripe publishable key. VITE_STRIPE_PUBLIC_KEY must start with pk_.',
  );
  return;
}

stripePromise
  .then((instance) => {
    if (!instance) {
      setError(
        'Stripe failed to initialize.',
      );
      return;
    }

    setStripe(instance);

    console.info(
      '[FOCKIS STRIPE] Stripe initialized successfully.',
    );
  })
  .catch((stripeError) => {
    console.error(
      '[FOCKIS STRIPE] Initialization error:',
      stripeError,
    );

    setError(
      stripeError instanceof Error
        ? stripeError.message
        : 'Stripe failed to initialize.',
    );
  });

}, []);

if (error) {
return (
<div
style={{
margin: '20px 0',
padding: 18,
border: '1px solid #dc2626',
borderRadius: 8,
background: '#fff7f7',
color: '#991b1b',
}}
> <strong>
Stripe payment unavailable </strong>
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

return ( <Elements
   stripe={stripePromise}
 >
{children} </Elements>
);
};

export default StripeProvider;
