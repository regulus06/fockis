import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Icon } from "../../components/academy/market/Icon";
import { Logo } from "../../components/academy/market/Shared";
import { changeAcademyPassword } from "../../lib/institutionsApi";
import { homeFor, refreshSession, signOutAcademy, useAcademySession } from "../../lib/academySession";

/**
 * /academy/change-password — required at first sign-in for accounts a school
 * created with a temporary password; also usable any time to change it.
 */
export default function ChangePassword() {
  const session = useAcademySession();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [cur, setCur] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const user = session.user as (typeof session.user & { mustChangePassword?: boolean; email?: string }) | null;
  const first = !!user?.mustChangePassword;
  const strong = pw.length >= 8 && /[A-Za-z]/.test(pw) && /\d/.test(pw);

  if (session.status === "loading") return <div className="fa-root fa-page" />;
  if (session.status === "guest")
    return (
      <div className="fa-root fa-page fa-page--soft">
        <div className="fa-container fa-narrow">
          <div className="fa-card fa-gate">
            <h2>Change password</h2>
            <p className="fa-muted">Sign in first.</p>
            <Link className="fa-btn fa-btn--primary" to="/academy/login?next=/academy/change-password">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!strong) return setErr("Use at least 8 characters with letters and numbers.");
    if (pw !== pw2) return setErr("The two new passwords don't match.");
    setBusy(true);
    setErr(null);
    try {
      await changeAcademyPassword(cur, pw);
      setDone(true);
      // Changing the password signs out every session — sign in again with the new one.
      signOutAcademy();
      await refreshSession();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Could not change the password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fa-root fa-page fa-page--soft fa-pw">
      <div className="fa-container fa-pw__wrap">
        <div className="fa-card fa-pad fa-pw__card">
          <Logo />
          {done ? (
            <div className="fa-pw__done">
              <span className="fa-st-empty__ic">
                <Icon name="check" size={26} />
              </span>
              <h2>Password changed</h2>
              <p className="fa-muted">Sign in again with your login and your new password.</p>
              <button className="fa-btn fa-btn--primary" onClick={() => navigate(`/academy/login?next=${encodeURIComponent(params.get("next") || homeFor(null))}`, { replace: true })}>
                Sign in
              </button>
            </div>
          ) : (
            <>
              <h2>{first ? "Choose your own password" : "Change password"}</h2>
              <p className="fa-muted">
                {first ? (
                  <>
                    Welcome! Your school gave you a temporary password. Choose a new one to start using <b>{user?.email}</b>.
                  </>
                ) : (
                  "Enter your current password and a new one."
                )}
              </p>
              <form className="fa-fields" onSubmit={submit}>
                <label className="fa-field">
                  <span>{first ? "Temporary password" : "Current password"}</span>
                  <input type="password" autoComplete="current-password" required value={cur} onChange={(e) => setCur(e.target.value)} />
                </label>
                <label className="fa-field">
                  <span>New password</span>
                  <input type="password" autoComplete="new-password" required value={pw} onChange={(e) => setPw(e.target.value)} />
                  <small className={pw ? (strong ? "fa-st-ok" : "fa-error") : "fa-muted"}>At least 8 characters, with letters and numbers.</small>
                </label>
                <label className="fa-field">
                  <span>Repeat new password</span>
                  <input type="password" autoComplete="new-password" required value={pw2} onChange={(e) => setPw2(e.target.value)} />
                </label>
                {err && <p className="fa-error">{err}</p>}
                <button className="fa-btn fa-btn--primary" disabled={busy}>
                  {busy ? "Saving…" : "Save new password"}
                </button>
                {first && (
                  <button
                    type="button"
                    className="fa-link"
                    onClick={() => {
                      signOutAcademy();
                      navigate("/academy", { replace: true });
                    }}
                  >
                    Sign out
                  </button>
                )}
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
