import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, CircleCheck, FileText, History, Printer, Search } from "lucide-react";

import { HelpError, HelpLoading } from "../../support/components/HelpStates";
import { useHelpToast } from "../../support/hooks/useHelpToast";
import { useHelpUser } from "../../support/hooks/useHelpUser";
import { apiMessage, policyCenterApi, type MyPolicy } from "../api/policyCenterApi";
import PolicyShell from "../components/PolicyShell";
import { AcceptancePill, Card, PolicyDocument, policyIcon } from "../components/PolicyUi";
import { CATEGORY_LABELS, fmtDate, useLoad } from "../components/policyUtils";

/** Signed in: the user's view with acceptance status. Signed out: the public list. */
function usePolicyList(signedIn: boolean) {
  return useLoad<MyPolicy[]>(
    async () => (signedIn ? policyCenterApi.myPolicies() : (await policyCenterApi.publicPolicies()).map((p) => ({ ...p, acceptedAt: null, previouslyAccepted: null, status: "not_required" as const }))),
    [signedIn],
  );
}

function PolicyList() {
  const { user, status } = useHelpUser();
  const signedIn = Boolean(user);
  const { data, error, loading, reload } = usePolicyList(signedIn);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data ?? []).filter((p) => (category === "all" || p.category === category) && (!q || `${p.title} ${p.description}`.toLowerCase().includes(q)));
  }, [data, query, category]);
  const categories = useMemo(() => Array.from(new Set((data ?? []).map((p) => p.category))), [data]);

  if (status === "loading" || (loading && !data)) return <div className="fk-pol-card"><HelpLoading label="Loading policies…" /></div>;
  if (error && !data) return <div className="fk-pol-card"><HelpError message={error} onRetry={() => void reload()} /></div>;

  return (
    <Card title="Policies & Guidelines" icon={<FileText size={24} />}>
      <p className="fk-pol-intro">These are the policies currently in effect on Fockis. {signedIn ? "Policies marked “Review needed” changed since you last accepted them." : "Sign in to see which versions you've accepted."}</p>
      <div className="fk-pol-filters">
        <label className="fk-pol-search">
          <Search size={18} aria-hidden />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search policies" aria-label="Search policies" />
        </label>
        <select className="fk-pol-select" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c] ?? c}
            </option>
          ))}
        </select>
      </div>

      {!items.length ? (
        <p className="fk-pol-muted fk-pol-pad">{data?.length ? "No policies match your search." : "No policies have been published yet."}</p>
      ) : (
        <ul className="fk-pol-plist fk-pol-plist--full">
          {items.map((p) => {
            const Icon = policyIcon(p.slug, p.category);
            return (
              <li key={p.id}>
                <span className="fk-pol-plist__icon"><Icon size={20} aria-hidden /></span>
                <div className="fk-pol-plist__text">
                  <strong>{p.title}</strong>
                  <span>{p.description}</span>
                  <small>
                    {CATEGORY_LABELS[p.category] ?? p.category} · Effective {fmtDate(p.effectiveDate)}
                  </small>
                </div>
                {signedIn && p.requiredAcceptance && <AcceptancePill status={p.status} />}
                <span className="fk-pol-version">v{p.version}</span>
                <Link to={`/settings/policy/guidelines/${p.slug}`} className="fk-pol-btn fk-pol-btn--outline fk-pol-btn--sm" aria-label={`Read ${p.title}`}>
                  Read
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

export function PolicyReader({ slug, backTo, backLabel }: { slug: string; backTo: string; backLabel: string }) {
  const { user } = useHelpUser();
  const notify = useHelpToast();
  const policy = useLoad(() => policyCenterApi.publicPolicy(slug), [slug]);
  const versions = useLoad(() => policyCenterApi.publicVersions(slug), [slug]);
  const mine = useLoad(async () => (user ? (await policyCenterApi.myPolicies()).find((p) => p.slug === policy.data?.slug || p.slug === slug) ?? null : null), [user, slug, policy.data?.slug]);
  const [busy, setBusy] = useState(false);

  async function accept() {
    if (!policy.data) return;
    setBusy(true);
    try {
      const updated = await policyCenterApi.accept(policy.data.slug, policy.data.versionId);
      mine.setData(updated ?? null);
      notify(`You accepted ${policy.data.title} v${policy.data.version}.`);
    } catch (e) {
      notify(apiMessage(e, "We couldn't record your acceptance."), "error");
      void policy.reload();
    } finally {
      setBusy(false);
    }
  }

  if (policy.loading && !policy.data) return <div className="fk-pol-card"><HelpLoading label="Loading policy…" /></div>;
  if (policy.error || !policy.data) {
    return (
      <div className="fk-pol-card">
        <HelpError message={policy.error || "That policy was not found."} />
        <p className="fk-pol-center">
          <Link to={backTo} className="fk-pol-link">
            <ArrowLeft size={16} aria-hidden /> {backLabel}
          </Link>
        </p>
      </div>
    );
  }
  const p = policy.data;
  const status = mine.data?.status;

  return (
    <div className="fk-pol-reader">
      <article className="fk-pol-card fk-pol-reader__main">
        <Link to={backTo} className="fk-pol-link fk-pol-back">
          <ArrowLeft size={16} aria-hidden /> {backLabel}
        </Link>
        <header className="fk-pol-reader__head">
          <h1>{p.title}</h1>
          <div className="fk-pol-reader__meta">
            <span className="fk-pol-version">Version {p.version}</span>
            <span>
              <CalendarDays size={15} aria-hidden /> Effective {fmtDate(p.effectiveDate)}
            </span>
            <span>Last updated {fmtDate(p.updatedAt)}</span>
            {status && p.requiredAcceptance && <AcceptancePill status={status} />}
          </div>
          {p.description && <p className="fk-pol-reader__lead">{p.description}</p>}
        </header>

        {status === "action_needed" && (
          <div className="fk-pol-alert">
            <span>
              This policy changed{mine.data?.previouslyAccepted ? ` since you accepted v${mine.data.previouslyAccepted.version}` : ""}.{p.changeSummary ? ` What changed: ${p.changeSummary}` : ""}
            </span>
          </div>
        )}

        <PolicyDocument sections={p.sections} />

        <footer className="fk-pol-reader__foot">
          {user && p.requiredAcceptance ? (
            status === "accepted" ? (
              <span className="fk-pol-ok">
                <CircleCheck size={18} aria-hidden /> You accepted this version on {fmtDate(mine.data?.acceptedAt)}.
              </span>
            ) : (
              <button type="button" className="fk-pol-btn fk-pol-btn--primary" onClick={() => void accept()} disabled={busy || mine.loading}>
                {busy ? "Saving…" : `I have read and accept ${p.title} v${p.version}`}
              </button>
            )
          ) : null}
          <button type="button" className="fk-pol-btn fk-pol-btn--ghost" onClick={() => window.print()}>
            <Printer size={17} aria-hidden /> Print
          </button>
        </footer>
      </article>

      <aside className="fk-pol-reader__side">
        {p.sections.length > 1 && (
          <Card title="On this page">
            <ol className="fk-pol-toc">
              {p.sections.map((s, i) => (
                <li key={i}>
                  <a href={`#section-${i + 1}`}>{s.heading.replace(/^\d+[.)]\s*/, "")}</a>
                </li>
              ))}
            </ol>
          </Card>
        )}
        <Card title="Version history" icon={<History size={20} />}>
          {versions.loading && !versions.data ? (
            <HelpLoading />
          ) : (
            <ul className="fk-pol-vlist">
              {(versions.data ?? []).map((v) => (
                <li key={v.version}>
                  <strong>
                    v{v.version} {v.current && <em>Current</em>}
                  </strong>
                  <span>Published {fmtDate(v.publishedAt)}</span>
                  {v.changeSummary && <p>{v.changeSummary}</p>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </aside>
    </div>
  );
}

export default function PolicyGuidelinesPage() {
  const { slug } = useParams();
  return <PolicyShell>{slug ? <PolicyReader slug={slug} backTo="/settings/policy/guidelines" backLabel="All policies" /> : <PolicyList />}</PolicyShell>;
}
