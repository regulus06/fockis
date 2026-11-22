import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, CheckCircle2, Search, SlidersHorizontal } from "lucide-react";

import { Card, Pager, SmEmpty, SmError, SmLoading, useAdminQuery } from "../../support/components/SmParts";
import { useSecurityContext } from "../SecurityLayout";
import { ReauthDialog } from "../components/SecurityControls";
import {
  SECTION_TITLES,
  formatPolicyValue,
  needsReauth,
  securityAdminApi,
  securityError,
  type PolicySectionKey,
} from "../securityAdminApi";

const ORDER: PolicySectionKey[] = ["password", "login", "sessions", "twoFactor", "alerts", "protection"];

/**
 * Organization Identity Policies
 *
 * - Which managed-identity settings organization administrators may tighten
 *   (delegation). Organizations can never make a setting weaker than the
 *   Fockis baseline, and non-delegated settings are locked.
 * - Every organization that uses managed identities, with the settings it
 *   has tightened.
 */
export default function OrganizationPoliciesPage() {
  const { view, viewError, reloadPolicy } = useSecurityContext();
  const [selected, setSelected] = useState<Set<string> | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [reauth, setReauth] = useState(false);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const orgs = useAdminQuery(() => securityAdminApi.organizations({ search: query, page }), [query, page]);

  useEffect(() => {
    if (view) setSelected(new Set(view.policy.delegatedFields));
  }, [view]);

  const delegable = useMemo(
    () => (view ? view.fields.filter((f) => f.delegable && f.profiles.includes("managed")) : []),
    [view],
  );

  if (viewError && !view) return <SmError message={viewError} onRetry={() => void reloadPolicy()} />;
  if (!view || !selected) return <SmLoading label="Loading security policy…" />;

  const saved = new Set(view.policy.delegatedFields);
  const dirty = selected.size !== saved.size || [...selected].some((key) => !saved.has(key));
  const canEdit = view.permissions.organizationDefaults;
  const fieldByKey = new Map(view.fields.map((f) => [f.key, f]));

  const save = async () => {
    setBusy(true);
    setMessage(null);

    try {
      await securityAdminApi.update({
        expectedVersion: view.policy.version,
        delegatedFields: [...selected],
      });
      await reloadPolicy();
      void orgs.refetch();
      setMessage({ tone: "ok", text: "Delegation saved. Organizations see the change the next time they open their security settings." });
    } catch (error) {
      if (needsReauth(error)) {
        setReauth(true);
        return;
      }

      setMessage({ tone: "error", text: securityError(error, "The delegation could not be saved.") });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fksec-page">
      <header className="fksec-page__head">
        <div>
          <h2>Organization Identity Policies</h2>
          <p>
            Organizations that create managed users can make the settings you allow here <strong>stricter</strong> for their own users. They can never weaken
            the Fockis baseline. Domains and managed users are still managed in each organization's Identity area.
          </p>
        </div>
      </header>

      <Card
        title="What organizations may tighten"
        icon={<SlidersHorizontal size={18} aria-hidden="true" />}
        action={
          canEdit ? (
            <span className="fksec-inline-actions">
              {dirty && (
                <button type="button" className="fksm-btn fksm-btn--secondary fksm-btn--sm" disabled={busy} onClick={() => setSelected(new Set(saved))}>
                  Discard
                </button>
              )}
              <button type="button" className="fksm-btn fksm-btn--primary fksm-btn--sm" disabled={!dirty || busy} onClick={() => void save()}>
                {busy ? "Saving…" : "Save delegation"}
              </button>
            </span>
          ) : null
        }
      >
        {!canEdit && <p className="fksm-notice fksm-notice--info">Changing delegation needs the security.org_defaults.manage permission.</p>}
        {message && (
          <p className={`fksm-notice fksm-notice--${message.tone === "ok" ? "ok" : "error"}`} role={message.tone === "ok" ? "status" : "alert"}>
            {message.tone === "ok" && <CheckCircle2 size={15} aria-hidden="true" />} {message.text}
          </p>
        )}

        <div className="fksec-delegation">
          {ORDER.map((section) => {
            const fields = delegable.filter((f) => f.section === section);
            if (!fields.length) return null;

            return (
              <fieldset key={section} className="fksec-delegation__group">
                <legend>{SECTION_TITLES[section]}</legend>
                {fields.map((field) => (
                  <label key={field.key} className="fksm-check fksec-delegation__item">
                    <input
                      type="checkbox"
                      checked={selected.has(field.key)}
                      disabled={!canEdit || busy}
                      onChange={(event) => {
                        const next = new Set(selected);
                        if (event.target.checked) next.add(field.key);
                        else next.delete(field.key);
                        setSelected(next);
                      }}
                    />
                    <span>
                      {field.label}
                      <small>Baseline: {formatPolicyValue(field, view.policy.managed[field.key])}</small>
                    </span>
                  </label>
                ))}
              </fieldset>
            );
          })}
        </div>
        <p className="fksm-muted fksec-small">
          Not listed (always locked by Fockis): owner and last-administrator protection, security auditing, verified email, recovery codes and administrator
          session limits. Change the baseline values on each section page under <em>Organization-managed identities</em>.
        </p>
      </Card>

      <Card title="Organizations" icon={<Building2 size={18} aria-hidden="true" />}>
        <form
          className="fksm-filters"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            setQuery(search.trim());
          }}
        >
          <label className="fksm-search">
            <Search size={16} aria-hidden="true" />
            <input type="search" placeholder="Search organizations" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search organizations" />
          </label>
          <button type="submit" className="fksm-btn fksm-btn--secondary">
            Search
          </button>
        </form>

        {orgs.loading && !orgs.data ? (
          <SmLoading />
        ) : orgs.error ? (
          <SmError message={orgs.error} onRetry={() => void orgs.refetch()} />
        ) : !orgs.data?.items.length ? (
          <SmEmpty icon={<Building2 size={22} />} title="No organizations" text={query ? "No organization matches that search." : "No organization uses managed identities yet."} />
        ) : (
          <>
            <div className="fksm-table-wrap">
              <table className="fksm-table">
                <thead>
                  <tr>
                    <th scope="col">Organization</th>
                    <th scope="col">Managed users</th>
                    <th scope="col">Min. password</th>
                    <th scope="col">Two-factor</th>
                    <th scope="col">Inactivity</th>
                    <th scope="col">Tightened settings</th>
                  </tr>
                </thead>
                <tbody>
                  {orgs.data.items.map((org) => (
                    <tr key={org.id}>
                      <td>
                        <Link to={`/organizations/${org.id}/identity`} className="fksm-link">
                          {org.name}
                        </Link>
                      </td>
                      <td>{org.managedUsers.toLocaleString()}</td>
                      <td>{formatPolicyValue(fieldByKey.get("minimumPasswordLength"), org.minimumPasswordLength)}</td>
                      <td>{org.requireTwoFactor ? "Everyone" : org.requireTwoFactorForAdministrators ? "Administrators" : "Optional"}</td>
                      <td>{formatPolicyValue(fieldByKey.get("inactivityTimeoutMinutes"), org.inactivityTimeoutMinutes)}</td>
                      <td>
                        {!org.customized ? (
                          <span className="fksm-muted">Uses Fockis baseline</span>
                        ) : !org.overriddenFields.length ? (
                          <span className="fksm-muted">None</span>
                        ) : (
                          org.overriddenFields.map((key) => fieldByKey.get(key)?.label ?? key).join(", ")
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={page} total={orgs.data.total} hasMore={page * orgs.data.pageSize < orgs.data.total} onPage={setPage} />
          </>
        )}
      </Card>

      {reauth && (
        <ReauthDialog
          onCancel={() => setReauth(false)}
          onDone={() => {
            setReauth(false);
            void save();
          }}
        />
      )}
    </div>
  );
}
