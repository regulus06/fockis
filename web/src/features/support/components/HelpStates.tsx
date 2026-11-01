import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { CircleAlert, LoaderCircle, LogIn } from "lucide-react";

import { useHelpUser, type HelpUser } from "../hooks/useHelpUser";

export function HelpLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="fk-help-state" role="status">
      <LoaderCircle className="fk-help-spin" size={26} aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}

export function HelpError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="fk-help-state fk-help-state--error" role="alert">
      <span className="fk-help-state__icon"><CircleAlert size={24} /></span>
      <h3>Something went wrong</h3>
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="fk-help-btn fk-help-btn--secondary" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function HelpEmpty({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="fk-help-state">
      <span className="fk-help-state__icon">{icon}</span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}

export function HelpSignIn({ what }: { what: string }) {
  return (
    <div className="fk-help-state">
      <span className="fk-help-state__icon"><LogIn size={24} /></span>
      <h3>Sign in to continue</h3>
      <p>Sign in to your Fockis account to {what}.</p>
      <Link to="/login" state={{ from: window.location.pathname + window.location.search }} className="fk-help-btn fk-help-btn--primary">
        Sign in
      </Link>
    </div>
  );
}

/** Renders children only for a signed-in account. */
export function SignedInOnly({ what, children }: { what: string; children: (user: HelpUser) => ReactNode }) {
  const { user, status } = useHelpUser();
  if (status === "loading") return <div className="fk-help-card"><HelpLoading label="Loading your account…" /></div>;
  if (!user) return <div className="fk-help-card"><HelpSignIn what={what} /></div>;
  return <>{children(user)}</>;
}

/** Shows loading / error states until the Help Center content has arrived. */
export function HelpContentGate({ status, error, onRetry, children }: { status: string; error: string | null; onRetry: () => void; children: ReactNode }) {
  if (status === "idle" || status === "loading") return <div className="fk-help-card"><HelpLoading label="Loading the Help Center…" /></div>;
  if (status === "error") return <div className="fk-help-card"><HelpError message={error ?? "The Help Center couldn't be loaded."} onRetry={onRetry} /></div>;
  return <>{children}</>;
}
