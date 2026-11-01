import { useState } from 'react';
import { Check, CreditCard, Info, Receipt, Rocket } from 'lucide-react';
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
import type { EmployerPlan } from '../types';
import { formatEmployerDate } from '../utils/employerFormatters';

export function EmployerBillingPage() {
  const notify = useNotify();
  const { data, setData, loading, error, refetch } = useEmployerBilling();
  const [upgradeTo, setUpgradeTo] = useState<EmployerPlan | null>(null);
  const [cancelRequest, setCancelRequest] = useState(false);

  if (loading && !data) return <div className={ui.card}><EmployerLoading label="Loading billing…" /></div>;
  if (error || !data) return <div className={ui.card}><EmployerError message={error ?? 'Billing is unavailable.'} onRetry={refetch} /></div>;

  const pending = data.pendingUpgrade;
  const pendingPlanName = pending ? data.plans.find((plan) => plan.id === pending.plan)?.name ?? pending.plan : '';
  const isFree = data.currentPlan.id === 'free';

  return (
    <div className={ui.page}>
      <EmployerPageHeader title="Billing & Plans" description="Your Employer Center plan, invoices and payment methods." />

      {!data.paymentsConnected && (
        <p className={ui.noticeWarning} style={{ margin: 0 }}>
          <Info size={16} />
          Online payments for employer plans are not connected yet. Upgrade requests are sent to the Fockis team, who will
          contact you to set up the plan. No charges are made from this page.
        </p>
      )}

      <div className={ui.grid2}>
        <div className={ui.card}>
          <div className={ui.cardHeader}>
            <div>
              <h2>Current subscription</h2>
              <p>{data.currentPlan.description}</p>
            </div>
            <Badge tone="success">Active</Badge>
          </div>
          <p style={{ margin: '0 0 12px', fontSize: 26, fontWeight: 750 }}>{data.currentPlan.name}</p>
          <ul className={styles.points} style={{ listStyle: 'none', paddingLeft: 0 }}>
            {data.currentPlan.features.map((feature) => (
              <li key={feature}><Check size={14} color="#15803d" style={{ verticalAlign: -2, marginRight: 6 }} />{feature}</li>
            ))}
          </ul>
          <div className={ui.formActions} style={{ justifyContent: 'flex-start' }}>
            <button
              type="button"
              className={ui.btnSecondary}
              disabled={isFree || !data.canManage}
              title={isFree ? 'You are on the free plan — there is no paid subscription to cancel.' : undefined}
              onClick={() => (window.location.href = 'mailto:support@fockis.com?subject=Cancel%20employer%20plan')}
            >
              Cancel subscription
            </button>
            {isFree && <span className={ui.hint}>Free plan — nothing to cancel.</span>}
          </div>
        </div>

        <div className={ui.card}>
          <div className={ui.cardHeader}>
            <div>
              <h2>Plan requests</h2>
              <p>Your upgrade requests to the Fockis team</p>
            </div>
          </div>
          {pending ? (
            <div className={ui.noticeSuccess}>
              <Rocket size={16} />
              <span style={{ flex: 1 }}>
                Upgrade to <strong>{pendingPlanName}</strong> requested on {formatEmployerDate(pending.requestedAt)}. The Fockis team will reach out.
              </span>
              {data.canManage && (
                <button type="button" className={`${ui.btnSecondary} ${ui.btnSm}`} onClick={() => setCancelRequest(true)}>Cancel request</button>
              )}
            </div>
          ) : (
            <p className={ui.muted} style={{ margin: 0, fontSize: 13.5 }}>No pending requests.</p>
          )}
          {data.upgradeRequests.filter((req) => req.status === 'cancelled').length > 0 && (
            <ul className={ui.list} style={{ marginTop: 10 }}>
              {data.upgradeRequests.filter((req) => req.status === 'cancelled').slice(0, 4).map((req) => (
                <li key={req.requestedAt} style={{ fontSize: 13 }}>
                  <span style={{ flex: 1 }}>{data.plans.find((p) => p.id === req.plan)?.name ?? req.plan} request</span>
                  <span className={ui.muted}>Cancelled {formatEmployerDate(req.cancelledAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div role="region" aria-labelledby="plans-heading">
        <h2 id="plans-heading" className={ui.sectionTitle}>Available plans</h2>
        <div className={ui.grid3}>
          {data.plans.map((plan) => {
            const current = plan.id === data.currentPlan.id;
            return (
              <div key={plan.id} className={ui.card} style={current ? { borderColor: '#1677e8', boxShadow: '0 0 0 1px #1677e8' } : undefined}>
                <div className={ui.row} style={{ marginBottom: 6 }}>
                  <h3 style={{ margin: 0, fontSize: 17 }}>{plan.name}</h3>
                  {current && <Badge tone="violet">Current plan</Badge>}
                </div>
                <p className={ui.muted} style={{ margin: '0 0 12px', fontSize: 13 }}>{plan.description}</p>
                <p style={{ margin: '0 0 12px', fontSize: 13.5, fontWeight: 650 }}>{plan.id === 'free' ? 'Free' : 'Pricing on request'}</p>
                <ul className={styles.points} style={{ listStyle: 'none', paddingLeft: 0, marginBottom: 16 }}>
                  {plan.features.map((feature) => (
                    <li key={feature}><Check size={14} color="#1677e8" style={{ verticalAlign: -2, marginRight: 6 }} />{feature}</li>
                  ))}
                </ul>
                {!current && plan.id !== 'free' && (
                  <button
                    type="button"
                    className={ui.btnPrimary}
                    style={{ width: '100%' }}
                    disabled={!data.canManage || Boolean(pending)}
                    title={!data.canManage ? 'Only the account owner can change the plan.' : pending ? 'You already have a pending request.' : undefined}
                    onClick={() => setUpgradeTo(plan)}
                  >
                    <Rocket size={15} /> Upgrade plan
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className={ui.grid2}>
        <div className={ui.cardFlush}>
          <div className={ui.cardHeaderPadded}><div><h2>Billing history & invoices</h2></div></div>
          {data.invoices.length ? (
            <div className={ui.tableWrap}>
              <table className={ui.table}>
                <thead><tr><th>Invoice</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
                <tbody>
                  {data.invoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td>{invoice.url ? <a href={invoice.url} target="_blank" rel="noopener noreferrer">{invoice.number}</a> : invoice.number}</td>
                      <td>{formatEmployerDate(invoice.issuedAt)}</td>
                      <td>{invoice.amount}</td>
                      <td>{invoice.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmployerEmptyState icon={<Receipt size={22} />} title="No invoices" description="You haven't been billed for an employer plan." />
          )}
        </div>
        <div className={ui.cardFlush}>
          <div className={ui.cardHeaderPadded}><div><h2>Payment methods</h2></div></div>
          {data.paymentMethods.length ? (
            <ul className={ui.list} style={{ padding: '0 20px' }}>
              {data.paymentMethods.map((method) => (
                <li key={method.id}><CreditCard size={16} /> {method.brand} •••• {method.last4} <span className={ui.muted}>exp. {method.expires}</span></li>
              ))}
            </ul>
          ) : (
            <EmployerEmptyState icon={<CreditCard size={22} />} title="No payment methods" description="Payment methods can be added once online billing is enabled for employer plans." />
          )}
        </div>
      </div>

      <ConfirmActionModal
        open={Boolean(upgradeTo)}
        title={`Request the ${upgradeTo?.name ?? ''} plan?`}
        description="We'll send your request to the Fockis team. They will contact you with pricing and activate the plan. You won't be charged now."
        confirmLabel="Send request"
        onConfirm={async () => {
          if (!upgradeTo) return;
          const updated = await employerApi.requestUpgrade(upgradeTo.id as 'growth' | 'enterprise');
          setData(updated);
          notify(`Upgrade to ${upgradeTo.name} requested.`);
          setUpgradeTo(null);
        }}
        onCancel={() => setUpgradeTo(null)}
      />

      <ConfirmActionModal
        open={cancelRequest}
        title="Cancel your plan request?"
        description="Your pending upgrade request will be withdrawn. You stay on your current plan."
        confirmLabel="Cancel request"
        cancelLabel="Keep request"
        variant="danger"
        onConfirm={async () => {
          const updated = await employerApi.cancelUpgradeRequest();
          setData(updated);
          notify('Plan request cancelled.');
          setCancelRequest(false);
        }}
        onCancel={() => setCancelRequest(false)}
      />
    </div>
  );
}

export default EmployerBillingPage;
