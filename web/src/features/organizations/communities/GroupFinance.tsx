/**
 * GroupFinance.tsx — Finance and Fundraising tabs.
 *
 * Contributions use the existing Fockis Stripe checkout (StripeProvider +
 * CheckoutForm + confirmCardPayment); the server verifies the payment with
 * Stripe before marking it paid. Leaders cannot withdraw money here: expenses
 * need a second approver and fund requests need church leadership.
 */

import { useState, type FormEvent } from "react";
import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { CheckCircle2, DollarSign, HandCoins, Loader2, Lock, Paperclip, Pencil, Plus, Receipt, Target, Wallet } from "lucide-react";

import StripeProvider from "../../payments/StripeProvider";
import CheckoutForm from "../../payments/components/CheckoutForm";
import { mediaUrl } from "../api/dashboardApi";
import { communitiesApi, type Campaign, type ContributionStart, type Transaction } from "./communitiesApi";
import { Empty, Field, Modal, Tone, fmtDate, money } from "./GroupParts";
import { ErrorBox, Loading, act, todayIso, useLoad, type TabProps } from "./GroupTabKit";

const KIND: Record<Transaction["kind"], string> = { contribution: "Contribution", donation: "Donation", offering: "Offering", expense: "Expense", fund_request: "Fund request" };
const STATUS_TONE: Record<string, "gray" | "blue" | "green" | "red" | "amber" | "purple"> = {
  pending: "gray",
  recorded: "green",
  paid: "green",
  submitted: "amber",
  under_review: "purple",
  approved: "blue",
  rejected: "red",
  cancelled: "gray",
  failed: "red",
};

/* ============================================================================
 * Finance tab
 * ========================================================================== */

export function FinanceTab({ organizationId, group, notify }: TabProps) {
  const [kind, setKind] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const seesTotals = group.viewer.canViewFinance;
  // Group totals are for the leader, treasurer and church leadership only (enforced by the API).
  const summary = useLoad((s) => (seesTotals ? communitiesApi.finance(organizationId, group.id, s) : Promise.resolve(null)), [organizationId, group.id, seesTotals]);
  const tx = useLoad((s) => communitiesApi.transactions(organizationId, group.id, { kind, status, page }, s), [organizationId, group.id, kind, status, page]);
  const [recording, setRecording] = useState<null | "income" | "expense" | "fund_request">(null);
  const [giving, setGiving] = useState(false);
  const [deciding, setDeciding] = useState<{ t: Transaction; action: string } | null>(null);
  const canManage = tx.data?.canManage ?? false;
  const reload = () => {
    summary.reload();
    tx.reload();
  };

  const s = summary.data;
  return (
    <div className="mn-stack">
      {summary.error && <ErrorBox text={summary.error} />}
      {seesTotals && !s && !summary.error && <Loading rows={1} height={90} />}
      {s && (
        <div className="mn-kpis gc-kpis3">
          <Kpi icon={HandCoins} label="Total contributions" value={money(s.totalContributions, s.currency)} />
          <Kpi icon={Wallet} label="Funds from church" value={money(s.fundsFromChurch, s.currency)} />
          <Kpi icon={Receipt} label="Total expenses" value={money(s.totalExpenses, s.currency)} />
          <Kpi icon={DollarSign} label="Available balance" value={money(s.availableBalance, s.currency)} strong />
          <Kpi icon={CheckCircle2} label="Contributors" value={String(s.totalContributors)} />
          <Kpi icon={Target} label="Fundraising" value={money(s.fundraising.collected, s.currency)} sub={s.fundraising.goal ? `${s.fundraising.progress ?? 0}% of ${money(s.fundraising.goal, s.currency)} goal` : `${s.fundraising.campaigns} campaigns`} />
        </div>
      )}
      {s?.annualBudget ? (
        <p className="mn-muted">
          Annual budget: <b>{money(s.annualBudget, s.currency)}</b> · spent {money(s.totalExpenses, s.currency)} ({Math.round((s.totalExpenses / s.annualBudget) * 100)}%)
        </p>
      ) : null}
      <p className="mn-muted gc-privacy">
        <Lock aria-hidden="true" /> {canManage ? "Expenses need a second approver; fund requests are approved by church leadership. Funds can't be withdrawn from here." : "You can only see your own contributions."}
      </p>

      <div className="mn-row mn-row--between">
        <div className="mn-row">
          <select className="mn-input gc-narrow" value={kind} onChange={(e) => (setKind(e.target.value), setPage(1))} aria-label="Type">
            <option value="">All types</option>
            {Object.entries(KIND).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
          <select className="mn-input gc-narrow" value={status} onChange={(e) => (setStatus(e.target.value), setPage(1))} aria-label="Status">
            <option value="">Any status</option>
            {["paid", "recorded", "submitted", "under_review", "approved", "rejected", "cancelled", "pending"].map((x) => (
              <option key={x} value={x}>
                {x.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <div className="mn-row">
          {group.settings.services.contributions && group.viewer.isMember && (
            <button type="button" className="mn-btn mn-btn--primary mn-btn--sm" onClick={() => setGiving(true)}>
              <HandCoins aria-hidden="true" /> Contribute
            </button>
          )}
          {canManage && (
            <>
              <button type="button" className="mn-btn mn-btn--outline mn-btn--sm" onClick={() => setRecording("income")}>
                <Plus aria-hidden="true" /> Record income
              </button>
              <button type="button" className="mn-btn mn-btn--outline mn-btn--sm" onClick={() => setRecording("expense")}>
                <Receipt aria-hidden="true" /> Submit expense
              </button>
              <button type="button" className="mn-btn mn-btn--outline mn-btn--sm" onClick={() => setRecording("fund_request")}>
                <Wallet aria-hidden="true" /> Request church funds
              </button>
            </>
          )}
        </div>
      </div>

      {tx.error && <ErrorBox text={tx.error} />}
      {!tx.data && !tx.error && <Loading />}
      {tx.data && tx.data.items.length === 0 && (
        <div className="mn-panel">
          <Empty icon={Wallet} title="No financial records" text={canManage ? "Contributions, expenses and fund requests will appear here." : "Your contributions to this group will appear here."} />
        </div>
      )}
      {tx.data && tx.data.items.length > 0 && (
        <section className="mn-panel mn-panel--flush">
          <div className="mn-tablewrap">
            <table className="mn-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Purpose</th>
                  <th>Person</th>
                  <th className="mn-num">Amount</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {tx.data.items.map((t) => (
                  <tr key={t.id}>
                    <td>{fmtDate(t.date || t.createdAt)}</td>
                    <td>
                      {KIND[t.kind]}
                      <small>{t.source === "stripe" ? "Online" : "Manual"}</small>
                    </td>
                    <td>
                      <b>{t.purpose || t.campaignTitle || "—"}</b>
                      {t.description && <small>{t.description}</small>}
                      {t.receiptNumber && <small>Receipt {t.receiptNumber}</small>}
                    </td>
                    <td>{t.personName || "—"}</td>
                    <td className={"mn-num" + (t.kind === "expense" ? " gc-neg" : "")}>{(t.kind === "expense" ? "−" : "") + money(t.amount, t.currency)}</td>
                    <td>
                      <Tone tone={STATUS_TONE[t.status] ?? "gray"}>{t.status.replace("_", " ")}</Tone>
                      {t.steps.length > 1 && <small title={t.steps.map((x) => `${x.action} by ${x.byName}${x.note ? `: ${x.note}` : ""}`).join("\n")}>{t.steps.length} steps</small>}
                    </td>
                    <td>
                      <div className="mn-row">
                        {t.receiptUrl && (
                          <a className="mn-iconbtn" href={mediaUrl(t.receiptUrl) ?? t.receiptUrl} target="_blank" rel="noreferrer" aria-label="Receipt">
                            <Paperclip aria-hidden="true" />
                          </a>
                        )}
                        {decisionsFor(t, canManage, tx.data?.canApproveChurchFunds ?? false).map(([a, label]) => (
                          <button key={a} type="button" className={"mn-btn mn-btn--sm " + (a === "reject" || a === "cancel" ? "mn-btn--ghost" : "mn-btn--outline")} onClick={() => setDeciding({ t, action: a })}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {tx.data.total > tx.data.items.length && (
            <div className="mn-row mn-row--between gc-pager">
              <button type="button" className="mn-btn mn-btn--ghost mn-btn--sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </button>
              <span className="mn-muted">Page {page}</span>
              <button type="button" className="mn-btn mn-btn--ghost mn-btn--sm" disabled={page * 50 >= tx.data.total} onClick={() => setPage((p) => p + 1)}>
                Next
              </button>
            </div>
          )}
        </section>
      )}

      {recording && (
        <RecordDialog
          organizationId={organizationId}
          groupId={group.id}
          mode={recording}
          currency={group.settings.currency}
          onClose={() => setRecording(null)}
          onDone={(msg) => {
            setRecording(null);
            notify("ok", msg);
            reload();
          }}
        />
      )}
      {deciding && (
        <DecideDialog
          t={deciding.t}
          action={deciding.action}
          onClose={() => setDeciding(null)}
          onConfirm={async (note) => {
            const ok = await act(notify, () => communitiesApi.decide(organizationId, group.id, deciding.t.id, deciding.action, note), "Updated.", "The record could not be updated.");
            if (ok) {
              setDeciding(null);
              reload();
            }
          }}
        />
      )}
      {giving && (
        <ContributeDialog
          organizationId={organizationId}
          groupId={group.id}
          currency={group.settings.currency}
          onClose={() => setGiving(false)}
          onPaid={(receipt) => {
            setGiving(false);
            notify("ok", `Thank you! Your contribution was received${receipt ? ` (receipt ${receipt})` : ""}.`);
            reload();
          }}
        />
      )}
    </div>
  );
}

function decisionsFor(t: Transaction, canManage: boolean, canApproveChurch: boolean): [string, string][] {
  const out: [string, string][] = [];
  if (t.isMine && ["submitted", "under_review"].includes(t.status)) out.push(["cancel", "Cancel"]);
  if (t.kind === "expense" && canManage && !(t.isMine && !canApproveChurch)) {
    if (t.status === "submitted") out.push(["approve", "Approve"], ["reject", "Reject"]);
    if (t.status === "approved") out.push(["mark_paid", "Mark paid"]);
  }
  if (t.kind === "fund_request" && canApproveChurch) {
    if (t.status === "submitted") out.push(["review", "Review"], ["approve", "Approve"], ["reject", "Reject"]);
    if (t.status === "under_review") out.push(["approve", "Approve"], ["reject", "Reject"]);
    if (t.status === "approved") out.push(["mark_paid", "Mark disbursed"]);
  }
  return out;
}

function Kpi({ icon: Icon, label, value, sub, strong }: { icon: typeof Wallet; label: string; value: string; sub?: string; strong?: boolean }) {
  return (
    <div className={strong ? "gc-kpi--strong" : undefined}>
      <small className="gc-kpi__label">
        <Icon aria-hidden="true" /> {label}
      </small>
      <b>{value}</b>
      {sub && <span>{sub}</span>}
    </div>
  );
}

function RecordDialog({ organizationId, groupId, mode, currency, onClose, onDone }: { organizationId: string; groupId: string; mode: "income" | "expense" | "fund_request"; currency: string; onClose: () => void; onDone: (msg: string) => void }) {
  const campaigns = useLoad((s) => (mode === "income" ? communitiesApi.campaigns(organizationId, groupId, s) : Promise.resolve(null)), [organizationId, groupId, mode]);
  const members = useLoad((s) => (mode === "income" ? communitiesApi.members(organizationId, groupId, {}, s) : Promise.resolve(null)), [organizationId, groupId, mode]);
  const [f, setF] = useState({ kind: mode === "income" ? "contribution" : mode, amount: "", purpose: "", category: "", description: "", date: todayIso(), membershipId: "", personName: "", campaignId: "", receiptUrl: "" });
  const [busy, setBusy] = useState<null | "save" | "file">(null);
  const [error, setError] = useState<string | null>(null);
  const title = mode === "income" ? "Record income" : mode === "expense" ? "Submit an expense" : "Request church funds";
  async function attach(file: File) {
    setBusy("file");
    try {
      const up = await communitiesApi.uploadFile(organizationId, groupId, file);
      setF((x) => ({ ...x, receiptUrl: up.fileUrl }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "The receipt could not be uploaded.");
    } finally {
      setBusy(null);
    }
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    const amount = Number(f.amount);
    if (!(amount > 0)) return setError("Enter an amount greater than zero.");
    if (!f.purpose.trim() && !f.description.trim()) return setError("Describe the purpose.");
    setBusy("save");
    setError(null);
    try {
      await communitiesApi.createRecord(organizationId, groupId, { ...f, amount, campaignId: f.campaignId || undefined, membershipId: f.membershipId || undefined });
      onDone(mode === "income" ? "Income recorded." : mode === "expense" ? "Expense submitted for approval." : "Fund request sent to church leadership.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "It could not be saved.");
    } finally {
      setBusy(null);
    }
  }
  return (
    <Modal
      title={title}
      subtitle={mode === "expense" ? "Another group manager approves it before it's marked paid." : mode === "fund_request" ? "Church leadership reviews and disburses approved requests." : undefined}
      onClose={onClose}
      busy={busy === "save"}
      footer={
        <>
          <button type="button" className="mn-btn mn-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="gc-record" className="mn-btn mn-btn--primary" disabled={Boolean(busy)}>
            {busy === "save" && <Loader2 className="mn-spin" aria-hidden="true" />} {mode === "income" ? "Record" : "Submit"}
          </button>
        </>
      }
    >
      <form id="gc-record" className="mn-form" onSubmit={save}>
        <div className="mn-form__row">
          {mode === "income" && (
            <Field label="Type">
              <select className="mn-input" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
                <option value="contribution">Contribution</option>
                <option value="donation">Donation</option>
                <option value="offering">Offering</option>
              </select>
            </Field>
          )}
          <Field label={`Amount (${currency})`} required>
            <input className="mn-input" type="number" min="0.01" step="0.01" inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
          </Field>
          <Field label="Date">
            <input className="mn-input" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
          </Field>
        </div>
        <Field label="Purpose" required>
          <input className="mn-input" value={f.purpose} maxLength={200} onChange={(e) => setF({ ...f, purpose: e.target.value })} />
        </Field>
        {mode !== "income" && (
          <Field label="Category">
            <input className="mn-input" value={f.category} maxLength={60} placeholder="Supplies, travel, outreach…" onChange={(e) => setF({ ...f, category: e.target.value })} />
          </Field>
        )}
        {mode === "income" && (
          <div className="mn-form__row">
            <Field label="Member (optional)">
              <select className="mn-input" value={f.membershipId} onChange={(e) => setF({ ...f, membershipId: e.target.value })}>
                <option value="">Not a member / anonymous</option>
                {members.data?.items.map((m) => (
                  <option key={m.membershipId} value={m.membershipId}>
                    {m.displayName}
                  </option>
                ))}
              </select>
            </Field>
            {!f.membershipId && (
              <Field label="Name (optional)">
                <input className="mn-input" value={f.personName} maxLength={120} onChange={(e) => setF({ ...f, personName: e.target.value })} />
              </Field>
            )}
          </div>
        )}
        {mode === "income" && (campaigns.data?.items.length ?? 0) > 0 && (
          <Field label="Campaign (optional)">
            <select className="mn-input" value={f.campaignId} onChange={(e) => setF({ ...f, campaignId: e.target.value })}>
              <option value="">None</option>
              {campaigns.data?.items.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Notes">
          <textarea className="mn-input" rows={3} maxLength={2000} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        </Field>
        <label className="mn-btn mn-btn--outline mn-btn--sm gc-attach">
          {busy === "file" ? <Loader2 className="mn-spin" aria-hidden="true" /> : <Paperclip aria-hidden="true" />} {f.receiptUrl ? "Receipt attached" : "Attach receipt"}
          <input type="file" accept="image/*,application/pdf" hidden onChange={(e) => e.target.files?.[0] && attach(e.target.files[0])} />
        </label>
        {error && <p className="mn-form-error">{error}</p>}
      </form>
    </Modal>
  );
}

function DecideDialog({ t, action, onClose, onConfirm }: { t: Transaction; action: string; onClose: () => void; onConfirm: (note: string) => Promise<void> }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const label: Record<string, string> = { approve: "Approve", reject: "Reject", review: "Start review", mark_paid: t.kind === "fund_request" ? "Mark disbursed" : "Mark paid", cancel: "Cancel request" };
  return (
    <Modal
      title={`${label[action] ?? action} — ${t.purpose || KIND[t.kind]}`}
      subtitle={`${KIND[t.kind]} · ${money(t.amount, t.currency)} · ${t.personName}`}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="mn-btn mn-btn--ghost" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className={"mn-btn " + (action === "reject" || action === "cancel" ? "mn-btn--danger" : "mn-btn--primary")}
            disabled={busy || (action === "reject" && !note.trim())}
            onClick={async () => {
              setBusy(true);
              await onConfirm(note.trim());
              setBusy(false);
            }}
          >
            {busy && <Loader2 className="mn-spin" aria-hidden="true" />} {label[action] ?? action}
          </button>
        </>
      }
    >
      {t.description && <p className="gc-pre">{t.description}</p>}
      {t.steps.length > 0 && (
        <ol className="mn-history">
          {t.steps.map((s, i) => (
            <li key={i}>
              <b>{s.action.replace("_", " ")}</b> by {s.byName} · {fmtDate(s.at, true)}
              {s.note && <p>{s.note}</p>}
            </li>
          ))}
        </ol>
      )}
      <Field label={action === "reject" ? "Reason (required)" : "Note (optional)"}>
        <textarea className="mn-input" rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
    </Modal>
  );
}

/* ============================================================================
 * Contribute (Stripe)
 * ========================================================================== */

export function ContributeDialog({ organizationId, groupId, currency, campaign, onClose, onPaid }: { organizationId: string; groupId: string; currency: string; campaign?: Campaign | null; onClose: () => void; onPaid: (receiptNumber: string) => void }) {
  const [amount, setAmount] = useState("");
  const [kind, setKind] = useState("contribution");
  const [purpose, setPurpose] = useState("");
  const [showName, setShowName] = useState(true);
  const [start, setStart] = useState<ContributionStart | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardComplete, setCardComplete] = useState(false);

  async function begin(e: FormEvent) {
    e.preventDefault();
    const n = Number(amount);
    if (!(n >= 1)) return setError("Enter an amount of at least 1.");
    setBusy(true);
    setError(null);
    try {
      setStart(await communitiesApi.startContribution(organizationId, groupId, { amount: n, kind, purpose: purpose.trim() || undefined, campaignId: campaign?.id, showName }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "The payment could not be started.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={campaign ? `Support "${campaign.title}"` : "Contribute to this group"} subtitle="Secure card payment through Fockis. Only you and the group's finance team can see your contribution." onClose={onClose} busy={busy}>
      {!start ? (
        <form className="mn-form" onSubmit={begin}>
          <div className="mn-form__row">
            <Field label={`Amount (${(campaign?.currency ?? currency).toUpperCase()})`} required>
              <input className="mn-input" type="number" min="1" step="0.01" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
            </Field>
            {!campaign && (
              <Field label="Type">
                <select className="mn-input" value={kind} onChange={(e) => setKind(e.target.value)}>
                  <option value="contribution">Contribution</option>
                  <option value="donation">Donation</option>
                  <option value="offering">Offering</option>
                </select>
              </Field>
            )}
          </div>
          <div className="gc-amounts">
            {[10, 25, 50, 100].map((v) => (
              <button key={v} type="button" className={"mn-chip" + (Number(amount) === v ? " is-on" : "")} onClick={() => setAmount(String(v))}>
                {money(v, campaign?.currency ?? currency)}
              </button>
            ))}
          </div>
          {!campaign && (
            <Field label="Purpose (optional)">
              <input className="mn-input" value={purpose} maxLength={200} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. Outreach supplies" />
            </Field>
          )}
          {campaign && (
            <label className="mn-check">
              <input type="checkbox" checked={showName} onChange={(e) => setShowName(e.target.checked)} /> Show my name among the campaign's supporters
            </label>
          )}
          {error && <p className="mn-form-error">{error}</p>}
          <div className="mn-row mn-row--end">
            <button type="button" className="mn-btn mn-btn--ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="mn-btn mn-btn--primary" disabled={busy}>
              {busy ? <Loader2 className="mn-spin" aria-hidden="true" /> : <Lock aria-hidden="true" />} Continue to payment
            </button>
          </div>
        </form>
      ) : (
        <div className="gc-checkout">
          <StripeProvider>
            <CheckoutForm total={start.amount} currency={start.currency} onCardCompleteChange={setCardComplete} />
            <PayButton organizationId={organizationId} groupId={groupId} start={start} cardComplete={cardComplete} onPaid={onPaid} />
          </StripeProvider>
        </div>
      )}
    </Modal>
  );
}

function PayButton({ organizationId, groupId, start, cardComplete, onPaid }: { organizationId: string; groupId: string; start: ContributionStart; cardComplete: boolean; onPaid: (receipt: string) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function pay() {
    if (!stripe || !elements) return;
    const card = elements.getElement(CardElement);
    if (!card) return;
    setBusy(true);
    setError("");
    try {
      const result = await stripe.confirmCardPayment(start.clientSecret, { payment_method: { card } });
      if (result.error) throw new Error(result.error.message || "Your card was declined.");
      const intentId = result.paymentIntent?.id ?? start.paymentIntentId;
      if (!intentId) throw new Error("The payment could not be verified.");
      // The server re-checks the payment with Stripe before recording it.
      const done = await communitiesApi.confirmContribution(organizationId, groupId, start.transactionId, intentId);
      onPaid(done.receiptNumber);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The payment didn't go through.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {error && (
        <p className="mn-form-error" role="alert">
          {error}
        </p>
      )}
      <button type="button" className="mn-btn mn-btn--primary gc-paybtn" disabled={!stripe || !cardComplete || busy} onClick={() => void pay()}>
        {busy ? <Loader2 className="mn-spin" aria-hidden="true" /> : <Lock aria-hidden="true" />} {busy ? "Processing payment…" : `Pay ${money(start.amount, start.currency)}`}
      </button>
    </>
  );
}

/* ============================================================================
 * Fundraising
 * ========================================================================== */

export function FundraisingTab({ organizationId, group, notify }: TabProps) {
  const list = useLoad((s) => communitiesApi.campaigns(organizationId, group.id, s), [organizationId, group.id]);
  const [editing, setEditing] = useState<Campaign | "new" | null>(null);
  const [giving, setGiving] = useState<Campaign | null>(null);
  if (list.error) return <ErrorBox text={list.error} />;
  if (!list.data) return <Loading rows={2} height={120} />;
  return (
    <div className="mn-stack">
      <div className="mn-row mn-row--between">
        <p className="mn-muted">Campaigns with goals, deadlines and live progress. Online gifts are processed by Fockis payments.</p>
        {list.data.canManage && (
          <button type="button" className="mn-btn mn-btn--primary mn-btn--sm" onClick={() => setEditing("new")}>
            <Plus aria-hidden="true" /> New campaign
          </button>
        )}
      </div>
      {list.data.items.length === 0 ? (
        <div className="mn-panel">
          <Empty icon={Target} title="No campaigns" text={list.data.canManage ? "Create a campaign for a project, mission trip or outreach." : "Fundraising campaigns will appear here."} />
        </div>
      ) : (
        <div className="gc-campaigns">
          {list.data.items.map((c) => {
            const pct = Math.min(100, c.progress);
            const ended = c.status === "closed" || (c.deadline && c.deadline < todayIso());
            return (
              <article key={c.id} className="mn-panel gc-campaign">
                {c.coverUrl && <img src={mediaUrl(c.coverUrl) ?? c.coverUrl} alt="" className="gc-campaign__cover" />}
                <div className="gc-campaign__body">
                  <header className="gc-post__head">
                    <div>
                      <b>{c.title}</b>
                      <span>{c.deadline ? `Ends ${fmtDate(c.deadline)}` : "No deadline"}</span>
                    </div>
                    <Tone tone={c.status === "active" && !ended ? "green" : c.status === "draft" ? "gray" : "blue"}>{c.status === "active" && ended ? "ended" : c.status}</Tone>
                  </header>
                  {c.description && <p className="gc-pre">{c.description}</p>}
                  <div className="gc-progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progress">
                    <span style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mn-row mn-row--between">
                    <span>
                      <b>{money(c.collected, c.currency)}</b> of {money(c.goalAmount, c.currency)}
                    </span>
                    <span className="mn-muted">
                      {c.progress}% · {c.donors} {c.donors === 1 ? "donor" : "donors"}
                    </span>
                  </div>
                  {c.supporters.length > 0 && <p className="mn-muted gc-supporters">Supporters: {c.supporters.join(", ")}</p>}
                  <div className="mn-row">
                    {list.data?.canContribute && c.status === "active" && !ended && (
                      <button type="button" className="mn-btn mn-btn--primary mn-btn--sm" onClick={() => setGiving(c)}>
                        <HandCoins aria-hidden="true" /> Contribute
                      </button>
                    )}
                    {list.data?.canManage && (
                      <button type="button" className="mn-btn mn-btn--outline mn-btn--sm" onClick={() => setEditing(c)}>
                        <Pencil aria-hidden="true" /> Edit
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {editing && (
        <CampaignDialog
          organizationId={organizationId}
          groupId={group.id}
          campaign={editing === "new" ? null : editing}
          currency={group.settings.currency}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            notify("ok", "Campaign saved.");
            list.reload();
          }}
        />
      )}
      {giving && (
        <ContributeDialog
          organizationId={organizationId}
          groupId={group.id}
          currency={group.settings.currency}
          campaign={giving}
          onClose={() => setGiving(null)}
          onPaid={(receipt) => {
            setGiving(null);
            notify("ok", `Thank you for supporting ${giving.title}!${receipt ? ` Receipt ${receipt}.` : ""}`);
            list.reload();
          }}
        />
      )}
    </div>
  );
}

function CampaignDialog({ organizationId, groupId, campaign, currency, onClose, onDone }: { organizationId: string; groupId: string; campaign: Campaign | null; currency: string; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ title: campaign?.title ?? "", description: campaign?.description ?? "", goalAmount: campaign ? String(campaign.goalAmount) : "", deadline: campaign?.deadline ?? "", status: campaign?.status ?? "active", coverUrl: campaign?.coverUrl ?? "" });
  const [busy, setBusy] = useState<null | "save" | "file">(null);
  const [error, setError] = useState<string | null>(null);
  async function cover(file: File) {
    if (!file.type.startsWith("image/")) return setError("Choose an image.");
    setBusy("file");
    try {
      const up = await communitiesApi.uploadFile(organizationId, groupId, file);
      setF((x) => ({ ...x, coverUrl: up.fileUrl }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "The image could not be uploaded.");
    } finally {
      setBusy(null);
    }
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!f.title.trim()) return setError("Give the campaign a title.");
    if (!(Number(f.goalAmount) > 0)) return setError("Set a goal greater than zero.");
    setBusy("save");
    setError(null);
    try {
      await communitiesApi.saveCampaign(organizationId, groupId, campaign?.id ?? null, { ...f, goalAmount: Number(f.goalAmount) });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The campaign could not be saved.");
    } finally {
      setBusy(null);
    }
  }
  return (
    <Modal
      title={campaign ? "Edit campaign" : "New fundraising campaign"}
      onClose={onClose}
      busy={busy === "save"}
      footer={
        <>
          <button type="button" className="mn-btn mn-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="gc-campaign" className="mn-btn mn-btn--primary" disabled={Boolean(busy)}>
            {busy === "save" && <Loader2 className="mn-spin" aria-hidden="true" />} Save campaign
          </button>
        </>
      }
    >
      <form id="gc-campaign" className="mn-form" onSubmit={save}>
        <Field label="Title" required>
          <input className="mn-input" value={f.title} maxLength={140} onChange={(e) => setF({ ...f, title: e.target.value })} />
        </Field>
        <Field label="Description">
          <textarea className="mn-input" rows={4} maxLength={4000} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        </Field>
        <div className="mn-form__row">
          <Field label={`Goal (${currency})`} required>
            <input className="mn-input" type="number" min="1" step="0.01" value={f.goalAmount} onChange={(e) => setF({ ...f, goalAmount: e.target.value })} />
          </Field>
          <Field label="Deadline">
            <input className="mn-input" type="date" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} />
          </Field>
          <Field label="Status">
            <select className="mn-input" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as Campaign["status"] })}>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
            </select>
          </Field>
        </div>
        <label className="mn-btn mn-btn--outline mn-btn--sm gc-attach">
          {busy === "file" ? <Loader2 className="mn-spin" aria-hidden="true" /> : <Paperclip aria-hidden="true" />} {f.coverUrl ? "Cover image added" : "Add a cover image"}
          <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && cover(e.target.files[0])} />
        </label>
        {error && <p className="mn-form-error">{error}</p>}
      </form>
    </Modal>
  );
}
