import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

// Existing Fockis payment system — used as-is (no changes to shared payment code).
import StripeProvider from '../../payments/StripeProvider';
import CheckoutPage, { type ConfirmPaymentResponse } from '../../payments/pages/CheckoutPage';

import ui from '../styles/EmployerShared.module.scss';
import { EmployerLoading } from '../components/shared/EmployerLoading';
import { EmployerError } from '../components/shared/EmployerError';
import { employerApi } from '../services/employerApi';
import { getErrorMessage } from '../hooks/useEmployerQuery';
import type { EmployerPlanCheckout } from '../types';

/**
 * /careers/employer/billing/pay?plan=growth
 * 1. The API prices the plan (Admin Center → Careers → Employer plans) and
 *    returns a reference for this employer.
 * 2. The existing Fockis CheckoutPage takes the payment.
 * 3. The API checks the paid record and switches the plan. If this page closes
 *    early, Billing applies the payment the next time it loads.
 */
export function EmployerPlanCheckoutPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const planId = params.get('plan') ?? '';
  const [quote, setQuote] = useState<EmployerPlanCheckout | null>(null);
  const [error, setError] = useState('');
  const [finishing, setFinishing] = useState(false);
  const done = useRef(false);

  useEffect(() => {
    let alive = true;
    employerApi
      .choosePlan(planId)
      .then((r) => {
        if (!alive) return;
        if (r.checkout) setQuote(r.checkout);
        else navigate('/careers/employer/billing', { replace: true });
      })
      .catch((e) => alive && setError(getErrorMessage(e)));
    return () => {
      alive = false;
    };
  }, [planId, navigate]);

  async function onSuccess(payment: ConfirmPaymentResponse) {
    if (done.current) return;
    done.current = true;
    setFinishing(true);
    const p = payment as ConfirmPaymentResponse & { stripePaymentIntentId?: string };
    const intent = p.stripePaymentIntentId || p.paymentIntentId;
    try {
      if (intent) await employerApi.claimPlanPayment(intent);
    } catch {
      // Not fatal: Billing applies the paid record when it loads.
    }
    navigate('/careers/employer/billing', { replace: true });
  }

  if (error) {
    return (
      <div className={ui.card}>
        <EmployerError message={error} />
        <p style={{ textAlign: 'center' }}>
          <Link to="/careers/employer/billing">Back to Billing</Link>
        </p>
      </div>
    );
  }
  if (!quote) return <div className={ui.card}><EmployerLoading label="Preparing checkout…" /></div>;

  const details = [
    { label: 'Plan', value: quote.plan.name },
    { label: 'Open jobs', value: quote.plan.maxActiveJobs ? `Up to ${quote.plan.maxActiveJobs} at a time` : 'Unlimited' },
    { label: 'Billing', value: quote.plan.periodMonths === 0 ? 'One-time' : `${quote.plan.periodLabel} — renew from Billing, no automatic charges` },
  ];
  if (quote.note) details.push({ label: 'Note', value: quote.note });

  return (
    <div>
      {finishing && (
        <p className={ui.noticeSuccess} role="status" style={{ margin: '0 0 12px' }}>
          Payment received — updating your plan…
        </p>
      )}
      <StripeProvider>
        <CheckoutPage
          amount={quote.amount}
          currency={quote.currency}
          purpose={quote.purpose}
          referenceId={quote.referenceId}
          title={`${quote.renewal ? 'Renew' : 'Upgrade to'} ${quote.plan.name}`}
          description={`Fockis Careers employer plan for ${quote.companyName}`}
          metadata={quote.metadata}
          item={{ typeLabel: 'Employer plan', provider: quote.companyName, details }}
          onSuccess={onSuccess}
          onCancel={() => navigate('/careers/employer/billing')}
        />
      </StripeProvider>
    </div>
  );
}

export default EmployerPlanCheckoutPage;
