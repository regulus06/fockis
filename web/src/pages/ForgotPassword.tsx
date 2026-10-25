import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import "../styles/PasswordReset.scss";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:3000"
).replace(/\/+$/, "");

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof data.message === "string"
            ? data.message
            : "We couldn't process your request. Please try again.",
        );
      }

      setMessage(
        typeof data.message === "string"
          ? data.message
          : "If an account exists for that email, a password reset link will be sent shortly.",
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to contact Fockis. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="password-reset-page">
      <section className="password-reset-card" aria-labelledby="forgot-password-title">
        <Link className="password-reset-brand" to="/login" aria-label="Fockis home">Fockis</Link>
        <div className="password-reset-icon" aria-hidden="true">✉</div>
        <h1 id="forgot-password-title">Forgot your password?</h1>
        <p className="password-reset-description">
          Enter the email address associated with your Fockis account. If an account matches, we'll send you a secure reset link.
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="forgot-password-email">Email address</label>
          <input
            id="forgot-password-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            maxLength={254}
          />
          {error && <p className="password-reset-message is-error" role="alert">{error}</p>}
          {message && <p className="password-reset-message is-success" role="status">{message}</p>}
          <button type="submit" disabled={loading}>
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>

        <Link className="password-reset-back-link" to="/login">← Back to login</Link>
      </section>
    </main>
  );
}
