import { useState } from "react";
import axios from "axios";

import { accountRecoveryRequest } from "./loginApi";

/**
 * Public "I can't get into my account" form. The response never says
 * whether the address has an account.
 */
export default function AccountRecoveryRequest({ initialEmail, onBack }: { initialEmail: string; onBack: () => void }) {
  const [email, setEmail] = useState(initialEmail);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const { data } = await accountRecoveryRequest(email, message.trim());
      setDone(data.message);
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      setError(status === 429 ? "Too many requests. Try again later." : status === 400 ? "Enter a valid email address and a short description." : "We couldn't send your request. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fockis-mfa-flow" style={{ display: "flex", flexDirection: "column", gap: 16, padding: "24px 0" }}>
      <div>
        <h2 style={{ marginBottom: 8 }}>Request account recovery</h2>
        <p style={{ margin: 0, opacity: 0.78, lineHeight: 1.5 }}>
          If you can't sign in even after resetting your password, our security team can review your account. Don't include your password.
        </p>
      </div>

      {done ? (
        <p role="status" style={{ margin: 0, lineHeight: 1.5 }}>
          {done}
        </p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!busy) void submit();
          }}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <div className="field">
            <label htmlFor="recovery-email">Account email</label>
            <div className="input-shell">
              <input id="recovery-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={busy} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="recovery-message">What happened?</label>
            <textarea
              id="recovery-message"
              rows={4}
              required
              maxLength={1000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={busy}
              style={{ width: "100%", padding: 12, borderRadius: 12, font: "inherit", boxSizing: "border-box" }}
            />
          </div>
          <button type="submit" className={`btn-primary${busy ? " is-loading" : ""}`} disabled={busy || !email.trim() || !message.trim()}>
            <span className="spinner" />
            <span className="btn-label">Send request</span>
            <span className="loading-label">Sending…</span>
          </button>
          {error && (
            <p role="alert" style={{ margin: 0, color: "#d93025" }}>
              {error}
            </p>
          )}
        </form>
      )}

      <button type="button" className="forgot-password-link" onClick={onBack} style={{ background: "none", border: 0, cursor: "pointer", alignSelf: "flex-start" }}>
        Back to sign in
      </button>
    </div>
  );
}
