import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { CircleAlert, CircleCheck, History, LoaderCircle, Monitor, RefreshCw, ShieldAlert, Smartphone, Tablet } from "lucide-react";

import api from "../../../api/api";

import "./LoginHistorySection.scss";

/**
 * Login history on the account settings page (/settings/account#login-history).
 * Data: GET /users/me/login-history — only ever the signed-in person's own
 * sign-ins, kept for 180 days.
 */

interface LoginHistoryItem {
  id: string;
  at: string;
  success: boolean;
  reason: string | null;
  ip: string | null;
  browser: string;
  os: string;
  device: "desktop" | "mobile" | "tablet" | "unknown";
  current: boolean;
}

interface LoginHistoryView {
  items: LoginHistoryItem[];
  lastSuccessfulAt: string | null;
  failedLast30Days: number;
  retentionDays: number;
}

const PAGE = 10;

const when = (iso: string) =>
  new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso));

function message(err: unknown): string {
  const data = (err as { response?: { data?: { message?: unknown } } })?.response?.data;
  const m = Array.isArray(data?.message) ? data?.message[0] : data?.message;
  return typeof m === "string" && m ? m : "We couldn't load your login history.";
}

function DeviceIcon({ device }: { device: LoginHistoryItem["device"] }) {
  if (device === "mobile") return <Smartphone size={20} aria-hidden="true" />;
  if (device === "tablet") return <Tablet size={20} aria-hidden="true" />;
  return <Monitor size={20} aria-hidden="true" />;
}

export default function LoginHistorySection() {
  const location = useLocation();
  const ref = useRef<HTMLElement>(null);
  const [data, setData] = useState<LoginHistoryView | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [shown, setShown] = useState(PAGE);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .get("/users/me/login-history")
      .then((r) => {
        if (!active) return;
        setData(r.data as LoginHistoryView);
        setError("");
      })
      .catch((e) => active && setError(message(e)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [tick]);

  // Opened from a "Login history" link: bring the section into view.
  useEffect(() => {
    if (location.hash !== "#login-history" || loading) return;
    const t = window.setTimeout(() => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
    return () => window.clearTimeout(t);
  }, [location.hash, loading]);

  const items = data?.items ?? [];

  return (
    <section ref={ref} id="login-history" className="fk-account-settings__card fk-login-history" aria-labelledby="fk-login-history-title">
      <div className="fk-account-settings__card-heading">
        <span className="fk-account-settings__icon fk-account-settings__icon--blue" aria-hidden="true">
          <History size={22} />
        </span>
        <div>
          <h2 id="fk-login-history-title">Login history</h2>
          <p>Recent sign-ins to your Fockis account. Only you can see this.</p>
        </div>
      </div>

      {loading && !data ? (
        <div className="fk-account-settings__loading fk-login-history__state" role="status">
          <LoaderCircle size={18} className="fk-login-history__spin" aria-hidden="true" /> Loading login history…
        </div>
      ) : error && !data ? (
        <div className="fk-login-history__error" role="alert">
          <CircleAlert size={18} aria-hidden="true" />
          <span>{error}</span>
          <button type="button" onClick={() => setTick((t) => t + 1)}>
            <RefreshCw size={15} aria-hidden="true" /> Try again
          </button>
        </div>
      ) : (
        <>
          <div className="fk-login-history__summary">
            <div>
              <small>Last successful sign-in</small>
              <strong>{data?.lastSuccessfulAt ? when(data.lastSuccessfulAt) : "—"}</strong>
            </div>
            <div className={data && data.failedLast30Days > 0 ? "is-warn" : ""}>
              <small>Failed attempts (30 days)</small>
              <strong>{data?.failedLast30Days ?? 0}</strong>
            </div>
          </div>

          {items.length === 0 ? (
            <p className="fk-login-history__empty">No sign-ins recorded yet. New sign-ins will appear here from now on.</p>
          ) : (
            <ul className="fk-login-history__list">
              {items.slice(0, shown).map((i) => (
                <li key={i.id} className={i.success ? "" : "is-failed"}>
                  <span className="fk-login-history__device">
                    <DeviceIcon device={i.device} />
                  </span>
                  <div className="fk-login-history__main">
                    <strong>
                      {i.browser} on {i.os}
                      {i.current && <span className="fk-login-history__this">This device</span>}
                    </strong>
                    <small>
                      {when(i.at)}
                      {i.ip ? ` · IP ${i.ip}` : ""}
                    </small>
                  </div>
                  {i.success ? (
                    <span className="fk-login-history__status fk-login-history__status--ok">
                      <CircleCheck size={15} aria-hidden="true" /> Signed in
                    </span>
                  ) : (
                    <span className="fk-login-history__status fk-login-history__status--bad">
                      <ShieldAlert size={15} aria-hidden="true" /> {i.reason === "locked" ? "Blocked · account locked" : "Failed · wrong password"}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}

          {items.length > shown && (
            <button type="button" className="fk-login-history__more" onClick={() => setShown((n) => n + PAGE)}>
              Show more ({items.length - shown})
            </button>
          )}

          <p className="fk-login-history__note">
            Don't recognize a sign-in? Change your password above and turn on two-factor authentication. History is kept for {data?.retentionDays ?? 180} days.
          </p>
        </>
      )}
    </section>
  );
}
