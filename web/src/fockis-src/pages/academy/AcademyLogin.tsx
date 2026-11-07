import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Icon } from "../../components/academy/market/Icon";
import { Logo, Person, PEOPLE } from "../../components/academy/market/Shared";
import { homeFor, registerAcademy, signInAcademy, useAcademySession } from "../../lib/academySession";
import { useSiteInfo } from "../../lib/siteInfo";
import "../../styles/academy-market.scss";

/**
 * /academy/login and /academy/register — Academy accounts for students and
 * instructors (POST /academy/auth/login, POST /academy/auth/register).
 * New accounts are always created as students by the API; instructors are
 * approved through the instructor application.
 */
export default function AcademyLogin({ mode: initialMode = "signin" }: { mode?: "signin" | "register" }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const session = useAcademySession();
  const { info } = useSiteInfo();
  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const next = params.get("next");
  const safeNext = next && next.startsWith("/academy") && !next.startsWith("/academy/login") ? next : null;

  useEffect(() => setMode(initialMode), [initialMode]);

  // Already signed in → go on.
  useEffect(() => {
    if (session.status === "user") navigate(safeNext ?? homeFor(session.user), { replace: true });
  }, [session, safeNext, navigate]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (mode === "register") {
      if (name.trim().length < 2) return setError("Please enter your full name.");
      if (password.length < 8) return setError("Password must be at least 8 characters.");
      if (password !== confirm) return setError("Passwords don’t match.");
    }
    setBusy(true);
    try {
      const user = mode === "signin" ? await signInAcademy(email, password) : await registerAcademy(name, email, password);
      navigate(safeNext ?? homeFor(user), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const academy = info.name || "Fockis Academy";

  return (
    <div className="fa-root">
    <div className="fa-auth">
      <aside className="fa-auth__brand">
        <Logo light />
        <div className="fa-auth__pitch">
          <h1>{mode === "signin" ? "Welcome back." : `Join ${academy}.`}</h1>
          <p>Courses, live classes, seminars and verified certificates — all in one place.</p>
          <ul>
            {["Learn at your own pace or live", "Earn certificates with QR verification", "Track your progress and enrollment IDs"].map((t) => (
              <li key={t}>
                <Icon name="checkCircle" size={17} /> {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="fa-auth__people" aria-hidden="true">
          <Person look={{ ...PEOPLE.elince, shirt: "#1d4fcf" }} size={150} bg="transparent" round={false} />
          <Person look={{ skin: 2, hair: 1, shirt: "#ffffff", style: "long" }} size={150} bg="transparent" round={false} />
        </div>
      </aside>

      <main className="fa-auth__main">
        <div className="fa-auth__card">
          <div className="fa-seg fa-auth__tabs" role="tablist">
            <button role="tab" aria-selected={mode === "signin"} className={mode === "signin" ? "is-on" : ""} onClick={() => (setMode("signin"), setError(null))}>
              Sign in
            </button>
            <button role="tab" aria-selected={mode === "register"} className={mode === "register" ? "is-on" : ""} onClick={() => (setMode("register"), setError(null))}>
              Create account
            </button>
          </div>

          <h2>{mode === "signin" ? `Sign in to ${academy}` : "Create your student account"}</h2>
          <p className="fa-muted">{mode === "signin" ? "Use your Academy email and password." : "Free to join. Instructors apply after signing up."}</p>

          {error && (
            <p className="fa-error" role="alert">
              {error}
            </p>
          )}

          <form className="fa-fields" onSubmit={submit}>
            {mode === "register" && (
              <label className="fa-field">
                <span>Full name</span>
                <input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </label>
            )}
            <label className="fa-field">
              <span>Email</span>
              <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
            </label>
            <label className="fa-field">
              <span>Password</span>
              <div className="fa-pass">
                <input type={show ? "text" : "password"} autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={mode === "register" ? 8 : undefined} />
                <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}>
                  {show ? "Hide" : "Show"}
                </button>
              </div>
            </label>
            {mode === "register" && (
              <label className="fa-field">
                <span>Confirm password</span>
                <input type={show ? "text" : "password"} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
              </label>
            )}
            <button className="fa-btn fa-btn--primary fa-auth__submit" disabled={busy || session.status === "loading"}>
              {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <div className="fa-auth__foot">
            {mode === "signin" ? (
              <span>
                New here?{" "}
                <button className="fa-link" onClick={() => setMode("register")}>
                  Create an account
                </button>
              </span>
            ) : (
              <span>
                Already have an account?{" "}
                <button className="fa-link" onClick={() => setMode("signin")}>
                  Sign in
                </button>
              </span>
            )}
            <span>
              Want to teach? <Link className="fa-link" to="/academy/teach">Become an instructor</Link>
            </span>
            <span className="fa-muted">
              Academy staff? <Link className="fa-link" to="/academy/admin/login">Admin sign-in</Link>
            </span>
          </div>
        </div>
        <Link to="/academy" className="fa-link fa-auth__back">
          <Icon name="left" size={14} /> Back to Academy
        </Link>
      </main>
    </div>
    </div>
  );
}
