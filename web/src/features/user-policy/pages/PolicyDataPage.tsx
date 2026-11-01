import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { CircleAlert, Database, Download, FileWarning, LoaderCircle, PencilLine, Trash2, UserRound } from "lucide-react";

import api from "../../../api/api";
import { HelpError, HelpLoading, SignedInOnly } from "../../support/components/HelpStates";
import { useHelpToast } from "../../support/hooks/useHelpToast";
import type { HelpUser } from "../../support/hooks/useHelpUser";
import { apiMessage, policyCenterApi, type DataRequest } from "../api/policyCenterApi";
import PolicyShell from "../components/PolicyShell";
import { Card, Pill } from "../components/PolicyUi";
import { CORRECTION_FIELDS, fmtBytes, fmtDate, fmtTime, useLoad } from "../components/policyUtils";

export const DELETION_NOTICE =
  "When you request account deletion, your profile and eligible personal information will be removed from Fockis. Certain financial, security, fraud-prevention and legal records may be retained when required or permitted by applicable law. Retained information will be restricted, protected and deleted when it is no longer needed. Backup copies may remain temporarily until the backup retention cycle expires.";

const STATUS_TONE: Record<DataRequest["status"], "green" | "amber" | "red" | "blue" | "gray"> = {
  pending: "amber",
  processing: "blue",
  completed: "green",
  rejected: "red",
  expired: "gray",
};
const STATUS_LABEL: Record<DataRequest["status"], string> = { pending: "Pending", processing: "Preparing", completed: "Ready", rejected: "Declined", expired: "Expired" };
const fieldLabel = (v: string) => CORRECTION_FIELDS.find((f) => f.value === v)?.label ?? v;

function Requests({ list, onDownload }: { list: DataRequest[]; onDownload: (r: DataRequest) => void }) {
  if (!list.length) return <p className="fk-pol-muted">No requests yet.</p>;
  return (
    <ul className="fk-pol-requests">
      {list.map((r) => (
        <li key={r.id}>
          <div>
            <strong>{r.type === "export" ? "Data download" : `Correction: ${fieldLabel(r.field)}`}</strong>
            <span>
              {r.number} · {fmtDate(r.createdAt)} {fmtTime(r.createdAt)}
              {r.type === "export" && r.status === "completed" && r.expiresAt ? ` · Available until ${fmtDate(r.expiresAt)}` : ""}
              {r.fileBytes ? ` · ${fmtBytes(r.fileBytes)}` : ""}
            </span>
            {r.response && <p className="fk-pol-response">Fockis: {r.response}</p>}
          </div>
          <Pill tone={STATUS_TONE[r.status]}>
            {r.status === "processing" && <LoaderCircle size={13} className="fk-help-spin" aria-hidden />} {STATUS_LABEL[r.status]}
          </Pill>
          {r.type === "export" && r.status === "completed" && (
            <button type="button" className="fk-pol-btn fk-pol-btn--outline fk-pol-btn--sm" onClick={() => onDownload(r)}>
              <Download size={15} aria-hidden /> Download
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

function DeleteAccount({ user }: { user: HelpUser }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [phrase, setPhrase] = useState("");
  const [understood, setUnderstood] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const userId = String(user._id ?? user.id ?? localStorage.getItem("userId") ?? "");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!password || phrase !== "DELETE MY ACCOUNT" || !understood) {
      setError('Enter your password, type "DELETE MY ACCOUNT" exactly and tick the box to continue.');
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.delete<{ reference?: string }>(`/users/${encodeURIComponent(userId)}/account`, { data: { currentPassword: password, confirmation: phrase } });
      setDone(data?.reference ?? "");
      for (const key of ["token", "accessToken", "refreshToken", "userId", "user", "currentUser"]) {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      }
    } catch (e) {
      setError(apiMessage(e, "We couldn't delete your account. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  if (done !== "") {
    return (
      <Card title="Your account was deleted" icon={<Trash2 size={22} />} className="fk-pol-card--danger">
        <p className="fk-pol-intro">Your deletion reference is <strong>{done || "recorded"}</strong>. Keep it if you need to contact Fockis about this request.</p>
        <button type="button" className="fk-pol-btn fk-pol-btn--primary" onClick={() => navigate("/login", { replace: true })}>
          Go to sign in
        </button>
      </Card>
    );
  }

  return (
    <Card title="Request account deletion" icon={<Trash2 size={22} />} className="fk-pol-card--danger">
      <p className="fk-pol-notice-text">{DELETION_NOTICE}</p>
      <div className="fk-pol-two-lists">
        <div>
          <h3>Removed from Fockis</h3>
          <ul>
            <li>Your profile, photos and account details</li>
            <li>Your posts and comments (unless a legal hold applies)</li>
            <li>Your privacy settings, consent choices and data downloads</li>
            <li>Your muted list and Policy Center activity</li>
          </ul>
        </div>
        <div>
          <h3>May be kept for a limited time</h3>
          <ul>
            <li>Payment, order, refund and chargeback records</li>
            <li>Security and fraud-prevention records</li>
            <li>Records of which policy versions you accepted</li>
            <li>Anything covered by a legal hold or legal claim</li>
          </ul>
        </div>
      </div>
      {!open ? (
        <button type="button" className="fk-pol-btn fk-pol-btn--danger" onClick={() => setOpen(true)}>
          <Trash2 size={17} aria-hidden /> Delete my account
        </button>
      ) : (
        <form className="fk-pol-form" onSubmit={(e) => void submit(e)}>
          <div className="fk-pol-alert fk-pol-alert--danger">
            <CircleAlert size={18} aria-hidden /> This can't be undone. Shop orders in progress, subscriptions and wallet balances should be settled first.
          </div>
          <label className="fk-pol-field">
            <span>Current password</span>
            <input className="fk-pol-input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <label className="fk-pol-field">
            <span>
              Type <strong>DELETE MY ACCOUNT</strong> to confirm
            </span>
            <input className="fk-pol-input" value={phrase} onChange={(e) => setPhrase(e.target.value)} autoComplete="off" />
          </label>
          <label className="fk-pol-check">
            <input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} />
            <span>I understand that my account will be deleted and some records may be kept as described above.</span>
          </label>
          {error && <p className="fk-pol-error" role="alert">{error}</p>}
          <div className="fk-pol-form__actions">
            <button type="button" className="fk-pol-btn fk-pol-btn--ghost" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="fk-pol-btn fk-pol-btn--danger" disabled={busy}>
              {busy ? "Deleting…" : "Permanently delete my account"}
            </button>
          </div>
        </form>
      )}
    </Card>
  );
}

function DataContent({ user }: { user: HelpUser }) {
  const notify = useHelpToast();
  const requests = useLoad(() => policyCenterApi.dataRequests());
  const info = useLoad(() => policyCenterApi.myInformation());
  const [busy, setBusy] = useState(false);
  const [field, setField] = useState("name");
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);
  const list = requests.data ?? [];
  const exportOpen = list.some((r) => r.type === "export" && (r.status === "pending" || r.status === "processing"));

  async function requestExport() {
    setBusy(true);
    try {
      await policyCenterApi.requestExport();
      notify("We're preparing your data. You'll get a notification when it's ready.");
      await requests.reload();
      // The file is usually ready within seconds.
      window.setTimeout(() => void requests.reload(), 4000);
    } catch (e) {
      notify(apiMessage(e, "We couldn't start your download."), "error");
    } finally {
      setBusy(false);
    }
  }

  async function download(r: DataRequest) {
    try {
      const { url } = await policyCenterApi.downloadLink(r.id);
      window.location.assign(url);
    } catch (e) {
      notify(apiMessage(e, "That download isn't available."), "error");
      void requests.reload();
    }
  }

  async function sendCorrection(event: FormEvent) {
    event.preventDefault();
    if (details.trim().length < 10) {
      notify("Tell us what is wrong and what it should be (at least 10 characters).", "error");
      return;
    }
    setSending(true);
    try {
      await policyCenterApi.requestCorrection(field, details.trim());
      setDetails("");
      notify("Correction request sent. We'll notify you when it's reviewed.");
      void requests.reload();
    } catch (e) {
      notify(apiMessage(e, "We couldn't send your request."), "error");
    } finally {
      setSending(false);
    }
  }

  const account = info.data?.account ?? {};
  const rows: [string, string][] = [
    ["Name", String(account.name || "—")],
    ["Username", account.username ? `@${account.username}` : "—"],
    ["Email", String(account.email || "—")],
    ["Phone", String(account.phone || "—")],
    ["Date of birth", account.birthDate ? fmtDate(String(account.birthDate)) : "—"],
    ["Location", String(account.location || "—")],
    ["Fockis ID", String(account.fockisId || "—")],
    ["Member since", fmtDate(account.memberSince)],
    ["Profile", info.data?.privacy.profileVisibility === "private" ? "Private" : "Public"],
  ];

  return (
    <div className="fk-pol-grid2">
      <div className="fk-pol-stack">
        <Card title="Download my data" icon={<Database size={22} />}>
          <p className="fk-pol-intro">Get a copy of your profile, posts, comments, policy acceptances, consent history and data requests as a JSON file. Download links stay available for 7 days.</p>
          <button type="button" className="fk-pol-btn fk-pol-btn--primary" onClick={() => void requestExport()} disabled={busy || exportOpen}>
            <Download size={17} aria-hidden /> {exportOpen ? "Preparing your data…" : busy ? "Starting…" : "Request my data"}
          </button>
          <h3 className="fk-pol-subtitle">Your requests</h3>
          {requests.loading && !requests.data ? <HelpLoading /> : requests.error ? <HelpError message={requests.error} onRetry={() => void requests.reload()} /> : <Requests list={list} onDownload={(r) => void download(r)} />}
        </Card>

        <Card title="Request a correction" icon={<PencilLine size={22} />}>
          <p className="fk-pol-intro">Most details can be changed yourself in Account Settings. Use this if something is wrong that you can't edit.</p>
          <form className="fk-pol-form" onSubmit={(e) => void sendCorrection(e)}>
            <label className="fk-pol-field">
              <span>What needs correcting?</span>
              <select className="fk-pol-select" value={field} onChange={(e) => setField(e.target.value)}>
                {CORRECTION_FIELDS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="fk-pol-field">
              <span>Details</span>
              <textarea className="fk-pol-input fk-pol-textarea" rows={4} maxLength={2000} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="What is wrong, and what should it be?" />
            </label>
            <div className="fk-pol-form__actions">
              <button type="submit" className="fk-pol-btn fk-pol-btn--primary" disabled={sending}>
                {sending ? "Sending…" : "Send request"}
              </button>
            </div>
          </form>
        </Card>
      </div>

      <div className="fk-pol-stack">
        <Card title="My information" icon={<UserRound size={22} />}>
          {info.loading && !info.data ? (
            <HelpLoading />
          ) : info.error ? (
            <HelpError message={info.error} onRetry={() => void info.reload()} />
          ) : (
            <dl className="fk-pol-dl">
              {rows.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          )}
          <p className="fk-pol-muted fk-pol-small">
            <FileWarning size={14} aria-hidden /> Your full record, including posts and history, is in the data download.
          </p>
        </Card>
        <DeleteAccount user={user} />
      </div>
    </div>
  );
}

export default function PolicyDataPage() {
  return (
    <PolicyShell>
      <SignedInOnly what="manage your personal data">{(user) => <DataContent user={user} />}</SignedInOnly>
    </PolicyShell>
  );
}
