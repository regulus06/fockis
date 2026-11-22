import { useState } from "react";
import { KeyRound, LockKeyhole, LogOut, Search, ShieldOff, Unlock, UserCog } from "lucide-react";

import { Card, Pager, SmEmpty, SmError, SmLoading, formatDateTime, useAdminQuery } from "../../support/components/SmParts";
import { useSecurityContext } from "../SecurityLayout";
import { Dialog, ReauthDialog } from "./SecurityControls";
import { needsReauth, securityAdminApi, securityError, type UserLookup } from "../securityAdminApi";

type Action = "unlock" | "revoke" | "reset-mfa" | "require-password-change";

const ACTIONS: Record<Action, { title: string; label: string; description: string; danger?: boolean; minReason: number }> = {
  unlock: {
    title: "Unlock account",
    label: "Unlock",
    description: "Clears the lockout and failed-attempt counters. The user is notified.",
    minReason: 3,
  },
  revoke: {
    title: "Sign out of all sessions",
    label: "Sign out everywhere",
    description: "Every signed-in session of this account ends immediately. The user is notified.",
    minReason: 3,
  },
  "reset-mfa": {
    title: "Reset two-factor (account recovery)",
    label: "Reset two-factor",
    description:
      "Removes the authenticator and recovery codes and signs the user out everywhere. If policy requires two-factor, the user must enroll again at the next sign-in — the requirement is not bypassed. Only use this after verifying the person's identity.",
    danger: true,
    minReason: 10,
  },
  "require-password-change": {
    title: "Require a password change",
    label: "Require change",
    description: "The user must choose a new password before doing anything else after their next request.",
    minReason: 3,
  },
};

function useAccountAction(onDone: () => void) {
  const [state, setState] = useState<{ action: Action; user: { id: string; label: string } } | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reauth, setReauth] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const run = async () => {
    if (!state) return;
    setBusy(true);
    setError(null);

    try {
      const call = {
        unlock: securityAdminApi.unlock,
        revoke: securityAdminApi.revokeSessions,
        "reset-mfa": securityAdminApi.resetMfa,
        "require-password-change": securityAdminApi.requirePasswordChange,
      }[state.action];

      await call(state.user.id, reason.trim());
      setDone(`${ACTIONS[state.action].title}: done for ${state.user.label}.`);
      setState(null);
      setReason("");
      onDone();
    } catch (err) {
      if (needsReauth(err)) {
        setReauth(true);
        return;
      }
      setError(securityError(err, "That action failed."));
    } finally {
      setBusy(false);
    }
  };

  const meta = state ? ACTIONS[state.action] : null;

  const element = (
    <>
      {state && meta && (
        <Dialog
          title={meta.title}
          tone={meta.danger ? "danger" : undefined}
          busy={busy}
          onClose={() => {
            setState(null);
            setError(null);
          }}
          footer={
            <>
              <button type="button" className="fksm-btn fksm-btn--secondary" onClick={() => setState(null)} disabled={busy}>
                Cancel
              </button>
              <button
                type="button"
                className={`fksm-btn ${meta.danger ? "fksm-btn--danger" : "fksm-btn--primary"}`}
                onClick={() => void run()}
                disabled={busy || reason.trim().length < meta.minReason}
              >
                {busy ? "Working…" : meta.label}
              </button>
            </>
          }
        >
          <p className="fksm-dialog__text">
            <strong>{state.user.label}</strong> — {meta.description}
          </p>
          <label className="fksm-field">
            <span>
              Reason (recorded in the audit log) <b className="fksm-required">*</b>
            </span>
            <textarea rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
          {error && (
            <p className="fksm-notice fksm-notice--error" role="alert">
              {error}
            </p>
          )}
        </Dialog>
      )}
      {reauth && (
        <ReauthDialog
          reason="Confirm it's you before this account action."
          onCancel={() => setReauth(false)}
          onDone={() => {
            setReauth(false);
            void run();
          }}
        />
      )}
    </>
  );

  return {
    open: (action: Action, user: { id: string; label: string }) => {
      setDone(null);
      setReason("");
      setError(null);
      setState({ action, user });
    },
    done,
    element,
  };
}

/* ============================================================================
   LOCKED ACCOUNTS (Login Protection page)
============================================================================ */

export function LockedAccountsCard() {
  const { view } = useSecurityContext();
  const [page, setPage] = useState(1);
  const locked = useAdminQuery(() => securityAdminApi.lockedAccounts(page), [page]);
  const action = useAccountAction(() => void locked.refetch());
  const canRecover = Boolean(view?.permissions.accountRecovery);

  return (
    <Card title="Locked accounts" icon={<LockKeyhole size={18} aria-hidden="true" />} className="fksec-anchor">
      <span id="locked" />
      {action.done && (
        <p className="fksm-notice fksm-notice--ok" role="status">
          {action.done}
        </p>
      )}
      {locked.loading && !locked.data ? (
        <SmLoading />
      ) : locked.error ? (
        <SmError message={locked.error} onRetry={() => void locked.refetch()} />
      ) : !locked.data?.items.length ? (
        <SmEmpty icon={<Unlock size={22} />} title="No locked accounts" text="Accounts unlock automatically when their lockout ends." />
      ) : (
        <>
          <div className="fksm-table-wrap">
            <table className="fksm-table">
              <thead>
                <tr>
                  <th scope="col">Account</th>
                  <th scope="col">Locked until</th>
                  <th scope="col">Lockouts</th>
                  <th scope="col">Last failure</th>
                  <th scope="col">
                    <span className="fksm-sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {locked.data.items.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <strong>@{user.username || "—"}</strong>
                      <small className="fksec-block">{user.email}</small>
                    </td>
                    <td>{formatDateTime(user.lockedUntil)}</td>
                    <td>{user.lockoutCount}</td>
                    <td>{formatDateTime(user.lastFailedLoginAt)}</td>
                    <td className="fksec-right">
                      {canRecover ? (
                        <button type="button" className="fksm-btn fksm-btn--secondary fksm-btn--sm" onClick={() => action.open("unlock", { id: user.id, label: `@${user.username}` })}>
                          <Unlock size={14} aria-hidden="true" /> Unlock
                        </button>
                      ) : (
                        <span className="fksm-muted">Needs recovery permission</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={page} total={locked.data.total} hasMore={page * locked.data.pageSize < locked.data.total} onPage={setPage} />
        </>
      )}
      {action.element}
    </Card>
  );
}

/* ============================================================================
   ACCOUNT RECOVERY (Account Protection page)
============================================================================ */

export function AccountRecoveryCard() {
  const { view } = useSecurityContext();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<UserLookup[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canRecover = Boolean(view?.permissions.accountRecovery);
  const canSessions = Boolean(view?.permissions.sessions) || canRecover;

  const search = async () => {
    setSearching(true);
    setError(null);
    try {
      const res = await securityAdminApi.lookupUser(q.trim());
      setResults(res.items);
    } catch (err) {
      setError(securityError(err, "Search failed."));
    } finally {
      setSearching(false);
    }
  };

  const action = useAccountAction(() => void (q.trim().length >= 3 && search()));

  return (
    <Card title="Account recovery" icon={<UserCog size={18} aria-hidden="true" />}>
      <p className="fksm-muted">
        Find an account by its exact email address, username or ID. Every action requires a reason, may require you to confirm your password, and is recorded
        in the security audit log.
      </p>
      <form
        className="fksm-filters"
        onSubmit={(event) => {
          event.preventDefault();
          if (q.trim().length >= 3) void search();
        }}
      >
        <label className="fksm-search">
          <Search size={16} aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="name@example.com, username or user ID" aria-label="Find account" />
        </label>
        <button type="submit" className="fksm-btn fksm-btn--secondary" disabled={searching || q.trim().length < 3}>
          {searching ? "Searching…" : "Find"}
        </button>
      </form>

      {action.done && (
        <p className="fksm-notice fksm-notice--ok" role="status">
          {action.done}
        </p>
      )}
      {error && (
        <p className="fksm-notice fksm-notice--error" role="alert">
          {error}
        </p>
      )}

      {results && !results.length && <p className="fksm-muted">No account matches exactly.</p>}

      {results?.map((user) => {
        const label = `@${user.username || user.id.slice(-6)}`;

        return (
          <div key={user.id} className="fksec-recovery">
            <div>
              <strong>{label}</strong>
              <small>
                {user.email} · {user.role} · two-factor {user.mfaEnabled ? "on" : "off"}
                {user.lockedUntil ? ` · locked until ${formatDateTime(user.lockedUntil)}` : ""}
              </small>
            </div>
            <div className="fksec-recovery__actions">
              {user.lockedUntil && canRecover && (
                <button type="button" className="fksm-btn fksm-btn--secondary fksm-btn--sm" onClick={() => action.open("unlock", { id: user.id, label })}>
                  <Unlock size={14} aria-hidden="true" /> Unlock
                </button>
              )}
              {canSessions && (
                <button type="button" className="fksm-btn fksm-btn--secondary fksm-btn--sm" onClick={() => action.open("revoke", { id: user.id, label })}>
                  <LogOut size={14} aria-hidden="true" /> Sign out everywhere
                </button>
              )}
              {canRecover && (
                <button type="button" className="fksm-btn fksm-btn--secondary fksm-btn--sm" onClick={() => action.open("require-password-change", { id: user.id, label })}>
                  <KeyRound size={14} aria-hidden="true" /> Require password change
                </button>
              )}
              {canRecover && user.mfaEnabled && (
                <button type="button" className="fksm-btn fksm-btn--danger-ghost fksm-btn--sm" onClick={() => action.open("reset-mfa", { id: user.id, label })}>
                  <ShieldOff size={14} aria-hidden="true" /> Reset two-factor
                </button>
              )}
              {!canRecover && !canSessions && <span className="fksm-muted">Needs the account recovery permission</span>}
            </div>
          </div>
        );
      })}
      {action.element}
    </Card>
  );
}
