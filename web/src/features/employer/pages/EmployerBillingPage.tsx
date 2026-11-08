import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Info, Receipt, Rocket } from 'lucide-react';
import ui from '../styles/EmployerShared.module.scss';
import styles from '../styles/EmployerResources.module.scss';
import { EmployerPageHeader } from '../components/EmployerPageHeader';
import { EmployerLoading } from '../components/shared/EmployerLoading';
import { EmployerError } from '../components/shared/EmployerError';
import { EmployerEmptyState } from '../components/shared/EmployerEmptyState';
import { ConfirmActionModal } from '../components/shared/ConfirmActionModal';
import { Badge } from '../components/shared/EmployerStatusBadge';
import { useEmployerBilling } from '../hooks/useEmployerBilling';
import { useNotify } from '../store/employerNotificationStore';
import { employerApi } from '../services/employerApi';
import { getErrorMessage } from '../hooks/useEmployerQuery';
import type { EmployerPlan } from '../types';
import { formatEmployerDate } from '../utils/employerFormatters';

const money = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
};
const perPeriod = (m: number) => (m === 0 ? 'one-time' : m === 1 ? '/ month' : m === 12 ? '/ year' : `every ${m} months`);
const jobsText = (n: number) => (n ? `Up to ${n} open job${n === 1 ? '' : 's'} at a time` : 'Unlimited open jobs');

/**
 * Employer plans. Prices and limits are set by Fockis in the Admin Center;
 * paid plans are bought through the existing Fockis checkout
 * (/careers/employer/billing/pay?plan=…).
 */
export function EmployerBillingPage() {
  const notify = useNotify();
  const navigate = useNavigate();
  const { data, setData, loading, error, refetch } = useEmployerBilling();
  const [switchTo, setSwitchTo] = useState<EmployerPlan | null>(null);

  if (loading && !data) return <div className={ui.card}><EmployerLoading label="Loading billing…" /></div>;
  if (error || !data) return <div className={ui.card}><EmployerError message={error ?? 'Billing is unavailable.'} onRetry={refetch} /></div>;

  const state = data.planState;
  const currency = data.currency || 'USD';
  const currentId = data.currentPlan.id;
  const stateBadge =
    !state || state.state === 'free'
      ? <Badge tone="success">Active</Badge>
      : state.state === 'exempt'
        ? <Badge tone="violet">Free of charge</Badge>
        : state.state === 'grace'
          ? <Badge tone="warning">Payment due</Badge>
          : state.state === 'expired'
            ? <Badge tone="danger">Not paid</Badge>
            : <Badge tone="success">Paid</Badge>;

  const choose = (plan: EmployerPlan) => {
    if (plan.price > 0) navigate(`/careers/employer/billing/pay?plan=${encodeURIComponent(plan.id)}`);
    else setSwitchTo(plan);
  };

  return (
    <div className={ui.page}>
      <EmployerPageHeader title="Billing & Plans" description="Your Employer Center plan and payments." />

      {!data.paymentsConnected && (
        <p className={ui.notice} style={{ margin: 0 }}>
          <Info size={16} />
          Every plan is free right now — switch plans at no cost.
        </p>
      )}
      {data.note && (
        <p className={ui.notice} style={{ margin: 0 }}>
          <Info size={16} />
          {data.note}
        </p>
      )}

      <div className={ui.grid2}>
        <div className={ui.card}>
          <div className={ui.cardHeader}>
            <div>
              <h2>Current plan</h2>
              <p>{data.currentPlan.description}</p>
            </div>
            {stateBadge}
          </div>
          <p style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 750 }}>{data.currentPlan.name}</p>
          <p className={ui.muted} style={{ margin: '0 0 12px' }}>
            {jobsText(state?.maxActiveJobs ?? data.currentPlan.maxActiveJobs)} · {data.liveJobs} open now
          </p>
          {state?.state === 'active' && state.paidUntil && (
            <p style={{ margin: '0 0 10px' }}>Paid until <strong>{formatEmployerDate(state.paidUntil)}</strong>.</p>
          )}
          {state?.state === 'grace' && (
            <p className={ui.noticeWarning} style={{ margin: '0 0 10px' }}>
              <Info size={16} /> Payment is due. Renew before {formatEmployerDate(state.graceEndsAt ?? undefined)} to keep your plan.
            </p>
          )}
          {state?.state === 'expired' && (
            <p className={ui.noticeError} style={{ margin: '0 0 10px' }}>
              <Info size={16} /> This plan isn&apos;t paid, so Free plan limits apply. If you have more open jobs than Free allows, they&apos;re hidden from Careers until you pay or close some.
            </p>
          )}
          <ul className={styles.points} style={{ listStyle: 'none', paddingLeft: 0 }}>
            {data.currentPlan.features.map((feature) => (
              <li key={feature}><Check size={14} color="#15803d" style={{ verticalAlign: -2, marginRight: 6 }} />{feature}</li>
            ))}
          </ul>
          {data.currentPlan.price > 0 && (state?.state === 'grace' || state?.state === 'expired' || state?.renewSoon) && (
            <div className={ui.formActions} style={{ justifyContent: 'flex-start' }}>
              <button type="button" className={ui.btnPrimary} disabled={!data.canManage} onClick={() => choose(data.currentPlan)}>
                <Rocket size={15} /> {state?.state === 'expired' ? 'Pay' : 'Renew'} · {money(data.currentPlan.price, currency)}
              </button>
            </div>
          )}
        </div>

        <div className={ui.cardFlush}>
          <div className={ui.cardHeaderPadded}><div><h2>Payments</h2></div></div>
          {data.payments.length ? (
            <div className={ui.tableWrap}>
              <table className={ui.table}>
                <thead><tr><th>Date</th><th>Plan</th><th>Amount</th><th>Covers until</th></tr></thead>
                <tbody>
                  {data.payments.map((p, i) => (
                    <tr key={i}>
                      <td>{formatEmployerDate(p.at)}</td>
                      <td>{data.plans.find((x) => x.id === p.plan)?.name ?? p.plan ?? '—'}</td>
                      <td>{p.amount !== undefined ? money(p.amount, p.currency || currency) : '—'}{p.method === 'manual' ? ' (recorded by Fockis)' : ''}</td>
                      <td>{p.to ? formatEmployerDate(p.to) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmployerEmptyState icon={<Receipt size={22} />} title="No payments yet" description="Payments for paid plans show here." />
          )}
        </div>
      </div>

      <div role="region" aria-labelledby="plans-heading">
        <h2 id="plans-heading" className={ui.sectionTitle}>Plans</h2>
        <div className={ui.grid3}>
          {data.plans.map((plan) => {
            const current = plan.id === currentId;
            return (
              <div key={plan.id} className={ui.card} style={current ? { borderColor: '#1677e8', boxShadow: '0 0 0 1px #1677e8' } : undefined}>
                <div className={ui.row} style={{ marginBottom: 6 }}>
                  <h3 style={{ margin: 0, fontSize: 17 }}>{plan.name}</h3>
                  {current && <Badge tone="violet">Current plan</Badge>}
                </div>
                <p className={ui.muted} style={{ margin: '0 0 12px', fontSize: 13 }}>{plan.description}</p>
                <p style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 750 }}>
                  {plan.price > 0 ? money(plan.price, currency) : 'Free'}
                  {plan.price > 0 && <span className={ui.muted} style={{ fontSize: 13, fontWeight: 500 }}> {perPeriod(plan.periodMonths)}</span>}
                </p>
                <p className={ui.muted} style={{ margin: '0 0 12px', fontSize: 13 }}>{jobsText(plan.maxActiveJobs)}</p>
                <ul className={styles.points} style={{ listStyle: 'none', paddingLeft: 0, marginBottom: 16 }}>
                  {plan.features.map((feature) => (
                    <li key={feature}><Check size={14} color="#1677e8" style={{ verticalAlign: -2, marginRight: 6 }} />{feature}</li>
                  ))}
                </ul>
                {!current && (
                  <button
                    type="button"
                    className={plan.price > 0 ? ui.btnPrimary : ui.btnSecondary}
                    style={{ width: '100%' }}
                    disabled={!data.canManage || data.employerStatus === 'blocked'}
                    title={!data.canManage ? 'Only the account owner or an admin can change the plan.' : undefined}
                    onClick={() => choose(plan)}
                  >
                    <Rocket size={15} /> {plan.price > 0 ? `Choose ${plan.name} · ${money(plan.price, currency)}` : `Switch to ${plan.name}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <ConfirmActionModal
        open={Boolean(switchTo)}
        title={`Switch to ${switchTo?.name ?? ''}?`}
        description={switchTo ? `${jobsText(switchTo.maxActiveJobs)}. Nothing is charged.` : ''}
        confirmLabel="Switch plan"
        onConfirm={async () => {
          if (!switchTo) return;
          try {
            const result = await employerApi.choosePlan(switchTo.id);
            if (result.billing) setData(result.billing);
            notify(`You're now on ${switchTo.name}.`);
          } catch (err) {
            notify(getErrorMessage(err), 'error');
          }
          setSwitchTo(null);
        }}
        onCancel={() => setSwitchTo(null)}
      />
    </div>
  );
}

export default EmployerBillingPage;
