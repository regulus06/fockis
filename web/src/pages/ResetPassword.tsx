import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import "../styles/PasswordReset.scss";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:3000"
).replace(/\/+$/, "");

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token")?.trim() ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!token) {
      setError("This password reset link is missing its token. Request a new link.");
      return;
    }
    if (password.length < 8 || password.length > 128) {
      setError("Your password must be between 8 and 128 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof data.message === "string"
            ? data.message
            : "This reset link may have expired. Request a new one and try again.",
        );
      }

      setSuccess(true);
      window.setTimeout(() => navigate("/login", { replace: true }), 1800);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to reset your password. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="password-reset-page">
      <section className="password-reset-card" aria-labelledby="reset-password-title">
        <Link className="password-reset-brand" to="/login" aria-label="Fockis home">Fockis</Link>
        <div className="password-reset-icon" aria-hidden="true">🔒</div>
        <h1 id="reset-password-title">Create a new password</h1>
        <p className="password-reset-description">
          Choose a strong password you don't use for other accounts.
        </p>

        {!token && (
          <p className="password-reset-message is-error" role="alert">
            This reset link is missing its token. Please request a new password reset link.
          </p>
        )}

        {success ? (
          <div className="password-reset-message is-success" role="status">
            Your password has been updated. Taking you to login…
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label htmlFor="new-password">New password</label>
            <input
              id="new-password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              maxLength={128}
              required
              disabled={!token || loading}
            />
            <p className="password-reset-hint">Use 8–128 characters.</p>

            <label htmlFor="confirm-new-password">Confirm new password</label>
            <input
              id="confirm-new-password"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={8}
              maxLength={128}
              required
              disabled={!token || loading}
            />

            {error && <p className="password-reset-message is-error" role="alert">{error}</p>}
            <button type="submit" disabled={!token || loading}>
              {loading ? "Updating password…" : "Reset password"}
            </button>
          </form>
        )}

        <Link className="password-reset-back-link" to="/login">← Back to login</Link>
        {!token && <Link className="password-reset-back-link" to="/forgot-password">Request a new reset link</Link>}
      </section>
    </main>
  );
}
