import { useEffect, useState } from "react";
import axios from "axios";

import type { AuthResponse, VerificationMethod, VerificationState } from "./loginTypes";
import { verificationEmailRequest, verificationRecoveryRequest, verificationVerifyRequest } from "./loginApi";

type Props = {
  verification: VerificationState;
  onVerified: (data: AuthResponse) => Promise<void>;
  onCancel: () => void;
};

function errorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const message = err.response?.data?.message;
    if (typeof message === "string" && message.trim()) return message;
    if (Array.isArray(message) && message.length) return String(message[0]);
    if (!err.response) return "Can't reach Fockis. Check your connection and try again.";
  }
  return fallback;
}

const METHOD_LABEL: Record<VerificationMethod, string> = {
  totp: "Authenticator app",
  email: "Email code",
  recovery: "I can't use these",
};

/**
 * Extra sign-in check after unusual activity on the account. The backend
 * decides which methods are offered (recently changed email addresses and
 * newly added authenticators are not trusted) and enforces everything.
 */
export default function LoginVerification({ verification, onVerified, onCancel }: Props) {
  const firstMethod = verification.methods.find((m) => m !== "recovery") ?? "recovery";
  const [method, setMethod] = useState<VerificationMethod>(firstMethod);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  const choose = (next: VerificationMethod) => {
    setMethod(next);
    setCode("");
    setError(null);
    setInfo(null);
  };

  const sendEmail = async () => {
    setBusy(true);
    setError(null);
    try {
      const { data } = await verificationEmailRequest(verification.token);
      setEmailSent(true);
      setResendIn(data.resendAfterSeconds || 60);
      setInfo(`We sent a 6-digit code to ${data.maskedEmail}. It expires in ${Math.round((data.expiresInSeconds || 600) / 60)} minutes.`);
    } catch (err) {
      setError(errorMessage(err, "We couldn't send the code. Try again."));
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (code.length !== 6 || (method !== "totp" && method !== "email")) return;
    setBusy(true);
    setError(null);
    try {
      const { data } = await verificationVerifyRequest(verification.token, method, code);
      await onVerified(data);
    } catch (err) {
      setCode("");
      setError(errorMessage(err, "That code isn't correct."));
    } finally {
      setBusy(false);
    }
  };

  const requestRecovery = async () => {
    setBusy(true);
    setError(null);
    try {
      const { data } = await verificationRecoveryRequest(verification.token, message.trim());
      setSubmitted(`${data.message}${data.caseNumber ? ` Your case number is ${data.caseNumber}.` : ""}`);
    } catch (err) {
      setError(errorMessage(err, "We couldn't send your request. Try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fockis-mfa-flow fockis-verify" style={{ display: "flex", flexDirection: "column", gap: 18, padding: "24px 0" }}>
      <div>
        <h2 style={{ marginBottom: 8 }}>Unusual sign-in activity detected</h2>
        <p style={{ margin: 0, opacity: 0.78, lineHeight: 1.5 }}>
          For your protection, this sign-in requires additional verification before you can continue.
        </p>
      </div>

      {verification.methods.length > 1 && !submitted && (
        <div role="radiogroup" aria-label="Verification method" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {verification.methods.map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={method === m}
              onClick={() => choose(m)}
              disabled={busy}
              className="fockis-verify__method"
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                border: method === m ? "2px solid currentColor" : "1px solid rgba(127,127,127,0.4)",
                background: "transparent",
                font: "inherit",
                fontWeight: method === m ? 700 : 500,
                cursor: "pointer",
              }}
            >
              {METHOD_LABEL[m]}
            </button>
          ))}
        </div>
      )}

      {submitted ? (
        <>
          <p role="status" style={{ margin: 0, lineHeight: 1.5 }}>
            {submitted}
          </p>
          <button type="button" className="btn-primary" onClick={onCancel}>
            <span className="btn-label">Back to sign in</span>
          </button>
        </>
      ) : method === "recovery" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!busy) void requestRecovery();
          }}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <p style={{ margin: 0, opacity: 0.85, lineHeight: 1.5 }}>
            Tell our security team what happened. Don't include your password. A reviewer will check the request and let you know the result.
          </p>
          <div className="field">
            <label htmlFor="verify-recovery-message">What happened?</label>
            <textarea
              id="verify-recovery-message"
              rows={4}
              maxLength={1000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={busy}
              style={{ width: "100%", padding: 12, borderRadius: 12, font: "inherit", boxSizing: "border-box" }}
            />
          </div>
          <button type="submit" className={`btn-primary${busy ? " is-loading" : ""}`} disabled={busy}>
            <span className="spinner" />
            <span className="btn-label">Send recovery request</span>
            <span className="loading-label">Sending…</span>
          </button>
        </form>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!busy) void verify();
          }}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          {method === "email" && !emailSent ? (
            <>
              <p style={{ margin: 0, opacity: 0.85 }}>
                We'll email a one-time code to {verification.maskedEmail ?? "your account's email address"}.
              </p>
              <button type="button" className={`btn-primary${busy ? " is-loading" : ""}`} onClick={() => void sendEmail()} disabled={busy}>
                <span className="spinner" />
                <span className="btn-label">Send code</span>
                <span className="loading-label">Sending…</span>
              </button>
            </>
          ) : (
            <>
              <div className="field">
                <label htmlFor="verify-code">{method === "totp" ? "Code from your authenticator app" : "Code from the email"}</label>
                <input
                  id="verify-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  disabled={busy}
                  autoFocus
                  style={{ letterSpacing: 6, fontSize: 20, textAlign: "center", padding: 12, borderRadius: 12, width: "100%", boxSizing: "border-box" }}
                />
              </div>
              <button type="submit" className={`btn-primary${busy ? " is-loading" : ""}`} disabled={busy || code.length !== 6}>
                <span className="spinner" />
                <span className="btn-label">Verify and continue</span>
                <span className="loading-label">Checking…</span>
              </button>
              {method === "email" && (
                <button type="button" className="forgot-password-link" onClick={() => void sendEmail()} disabled={busy || resendIn > 0} style={{ background: "none", border: 0, cursor: "pointer", alignSelf: "flex-start" }}>
                  {resendIn > 0 ? `Send a new code in ${resendIn}s` : "Send a new code"}
                </button>
              )}
            </>
          )}
        </form>
      )}

      {info && !submitted && (
        <p role="status" style={{ margin: 0, opacity: 0.85 }}>
          {info}
        </p>
      )}
      {error && (
        <p role="alert" style={{ margin: 0, color: "#d93025" }}>
          {error}
        </p>
      )}

      {!submitted && (
        <button type="button" className="forgot-password-link" onClick={onCancel} disabled={busy} style={{ background: "none", border: 0, cursor: "pointer", alignSelf: "flex-start" }}>
          Cancel and go back
        </button>
      )}
    </div>
  );
}
