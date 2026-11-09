/**
 * OrganizationsPage.tsx
 * -----------------------------------------------------------------------------
 * /organizations — find organizations of every kind (churches, schools,
 * businesses, clubs, nonprofits…), filter by category and type, and open,
 * join or create one. Search, category, type and page live in the URL.
 * -----------------------------------------------------------------------------
 */

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { listOrganizations } from "../api/organizationsApi";
import {
  MembershipStatus,
  OrganizationType,
  type OrganizationSummary,
} from "../types/organization.types";
import {
  ALL_CATEGORIES,
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  getCategoryForOrganizationType,
  typeLabel,
  type OrganizationCategory,
} from "../ui/orgCategories";
import { Empty, ErrorNote, Loading, OrgLogo, OrgShell, PageHead, errorText, orgPath } from "../ui/OrgShell";

const PAGE_SIZE = 12;
const ALL_TYPES = Object.values(OrganizationType) as OrganizationType[];

function membershipBadge(status?: string | null) {
  if (status === MembershipStatus.Active) return <span className="fko-badge fko-badge--ok">Member</span>;
  if (status === MembershipStatus.Pending) return <span className="fko-badge fko-badge--warn">Request sent</span>;
  return null;
}

export default function OrganizationsPage(): React.JSX.Element {
  const [params, setParams] = useSearchParams();
  const search = params.get("search") ?? "";
  const rawCategory = params.get("category") as OrganizationCategory | null;
  const category: OrganizationCategory | "" = rawCategory && ALL_CATEGORIES.includes(rawCategory) ? rawCategory : "";
  const rawType = params.get("type") as OrganizationType | null;
  const type = rawType && ALL_TYPES.includes(rawType) ? rawType : "";
  const page = Math.max(1, Math.floor(Number(params.get("page") ?? "1")) || 1);

  const [query, setQuery] = useState(search);
  const [items, setItems] = useState<OrganizationSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setQuery(search), [search]);

  const typesInCategory = useMemo(
    () => (category ? ALL_TYPES.filter((t) => getCategoryForOrganizationType(t) === category) : ALL_TYPES),
    [category],
  );

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    listOrganizations(
      { search: search.trim() || undefined, organizationType: type || undefined, page, pageSize: PAGE_SIZE },
      controller.signal,
    )
      .then((res) => {
        if (controller.signal.aborted) return;
        const list = Array.isArray(res?.items) ? res.items : [];
        const filtered = category ? list.filter((o) => getCategoryForOrganizationType(o.organizationType) === category) : list;
        setItems(filtered);
        setTotal(category ? filtered.length : Number(res?.total) || filtered.length);
        setHasMore(Boolean(res?.hasMore) || page * PAGE_SIZE < (Number(res?.total) || 0));
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setItems([]);
        setTotal(0);
        setError(errorText(err, "Organizations could not be loaded."));
      })
      .finally(() => !controller.signal.aborted && setLoading(false));
    return () => controller.abort();
  }, [search, category, type, page]);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    if (key === "category") next.delete("type");
    setParams(next);
  }

  function submitSearch(e: FormEvent) {
    e.preventDefault();
    setParam("search", query.trim());
  }

  const filtered = Boolean(search || category || type);

  return (
    <OrgShell>
      <PageHead
        eyebrow="Fockis Organizations"
        title="Organizations"
        subtitle="Churches, schools, businesses, clubs, nonprofits and more. Find one to join or visit, or open an account for yours."
        actions={
          <>
            <Link to="/organization/me" className="fko-btn fko-btn--secondary">
              My organizations
            </Link>
            <Link to="/organizations/new" className="fko-btn fko-btn--primary">
              + Create an organization
            </Link>
          </>
        }
      />

      <form className="fko-filters" onSubmit={submitSearch} role="search">
        <input
          className="church-input"
          type="search"
          placeholder="Search by name or description"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onBlur={() => query.trim() !== search && setParam("search", query.trim())}
          aria-label="Search organizations"
        />
        <select className="church-input" value={category} onChange={(e) => setParam("category", e.target.value)} aria-label="Category">
          <option value="">All categories</option>
          {ALL_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
        <select className="church-input" value={type} onChange={(e) => setParam("type", e.target.value)} aria-label="Type">
          <option value="">All types</option>
          {typesInCategory.map((t) => (
            <option key={t} value={t}>
              {typeLabel(t)}
            </option>
          ))}
        </select>
      </form>

      <div className="fko-chiprow" aria-label="Categories">
        <button type="button" className={"fko-tab" + (!category ? " is-active" : "")} onClick={() => setParam("category", "")}>
          All
        </button>
        {ALL_CATEGORIES.filter((c) => c !== "other").map((c) => (
          <button key={c} type="button" className={"fko-tab" + (category === c ? " is-active" : "")} onClick={() => setParam("category", c)}>
            <span aria-hidden="true">{CATEGORY_ICONS[c]}</span> {CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      {loading ? (
        <Loading rows={6} />
      ) : items.length === 0 ? (
        <Empty
          title={filtered ? "No organizations match your search." : "No organizations yet."}
          text={filtered ? "Try another word or category." : "Be the first: open an account for your organization."}
        >
          {filtered && (
            <button type="button" className="fko-btn fko-btn--secondary" onClick={() => setParams(new URLSearchParams())}>
              Clear filters
            </button>
          )}
          <Link to="/organizations/new" className="fko-btn fko-btn--primary">
            Create an organization
          </Link>
        </Empty>
      ) : (
        <>
          <p className="fko-hint">
            {total} organization{total === 1 ? "" : "s"}
          </p>
          <div className="fko-orgs">
            {items.map((o) => {
              const cat = getCategoryForOrganizationType(o.organizationType);
              const status = o.currentUserMembershipStatus ?? null;
              return (
                <article key={o.id} className="fko-orgcard">
                  <Link to={orgPath(o.id)} className="fko-orgcard__top">
                    {o.logoUrl ? (
                      <OrgLogo name={o.name} url={o.logoUrl} />
                    ) : (
                      <span className="fko-orgcard__logo" aria-hidden="true">
                        {CATEGORY_ICONS[cat]}
                      </span>
                    )}
                    <span>
                      <span className="fko-orgcard__name">{o.name}</span>
                      <br />
                      <span className="fko-orgcard__type">
                        {typeLabel(o.organizationType)}
                        {o.mainLocation?.city ? ` · ${o.mainLocation.city}` : ""}
                      </span>
                    </span>
                  </Link>
                  <p className="fko-orgcard__desc">{o.description || "No description yet."}</p>
                  <div className="fko-orgcard__foot">
                    <Link to={orgPath(o.id)} className="fko-btn fko-btn--secondary fko-btn--sm">
                      View
                    </Link>
                    {status ? (
                      membershipBadge(status)
                    ) : (
                      <Link to={orgPath(o.id, "/join")} className="fko-btn fko-btn--ghost fko-btn--sm">
                        Ask to join
                      </Link>
                    )}
                    {typeof o.memberCount === "number" && o.memberCount > 0 && (
                      <span className="fko-hint" style={{ marginLeft: "auto" }}>
                        {o.memberCount} member{o.memberCount === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          {(page > 1 || hasMore) && (
            <nav className="fko-pager" aria-label="Pages">
              <button type="button" className="fko-btn fko-btn--secondary fko-btn--sm" disabled={page <= 1} onClick={() => setParam("page", String(page - 1))}>
                ← Previous
              </button>
              <span>Page {page}</span>
              <button type="button" className="fko-btn fko-btn--secondary fko-btn--sm" disabled={!hasMore} onClick={() => setParam("page", String(page + 1))}>
                Next →
              </button>
            </nav>
          )}
        </>
      )}
    </OrgShell>
  );
}
