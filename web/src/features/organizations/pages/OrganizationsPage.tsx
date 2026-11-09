/**
 * OrganizationsPage.tsx
 * -----------------------------------------------------------------------------
 * /organizations/discover (and /organizations?search=… for older links) —
 * Discover Organizations: search, filter by category and type, open, join or
 * create. Search, category, type and page live in the URL.
 * Education is not a category here: schools use Fockis Academy.
 * -----------------------------------------------------------------------------
 */

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Compass, MapPin, Plus, Search, UsersRound } from "lucide-react";

import { listOrganizations } from "../api/organizationsApi";
import { MembershipStatus, OrganizationType, type OrganizationSummary } from "../types/organization.types";
import { typeLabel } from "../ui/orgCategories";
import OrgAppShell from "../ui/OrgAppShell";
import { PLATFORM_CATEGORIES, categoryInfo, platformCategoryOf, typesForCategory, type PlatformCategory } from "../ui/orgTerminology";
import { Alert, EmptyState, OrgLogoBox, Skeleton, errorMessage } from "../ui/orgUi";
import "../styles/OrganizationDiscover.scss";

const PAGE_SIZE = 12;
const ALL_TYPES = Object.values(OrganizationType) as OrganizationType[];
const CATEGORY_IDS = PLATFORM_CATEGORIES.map((c) => c.id);

export default function OrganizationsPage(): React.JSX.Element {
  const [params, setParams] = useSearchParams();
  const search = params.get("search") ?? "";
  const rawCategory = params.get("category") as PlatformCategory | null;
  const category: PlatformCategory | "" = rawCategory && CATEGORY_IDS.includes(rawCategory) ? rawCategory : "";
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

  const typesInCategory = useMemo(() => (category ? typesForCategory(category) : []), [category]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    // The server filters by type; a category filter (many types) is applied
    // to each page here, so the count shown is for this page.
    listOrganizations({ search: search.trim() || undefined, organizationType: type || undefined, page, pageSize: PAGE_SIZE }, controller.signal)
      .then((res) => {
        if (controller.signal.aborted) return;
        const list = Array.isArray(res?.items) ? res.items : [];
        const filtered = category && !type ? list.filter((o) => platformCategoryOf(o.organizationType) === category) : list;
        setItems(filtered);
        setTotal(category && !type ? filtered.length : Number(res?.total) || filtered.length);
        setHasMore(Boolean(res?.hasMore) || page * PAGE_SIZE < (Number(res?.total) || 0));
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setItems([]);
        setTotal(0);
        setError(errorMessage(err, "Organizations could not be loaded."));
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
    <OrgAppShell variant="platform">
      <div className="fo-pagehead">
        <div>
          <h1>Discover Organizations</h1>
          <p>Churches, businesses, nonprofits, teams, clubs, communities and more.</p>
        </div>
        <div className="fo-pagehead__actions">
          <Link to="/organization/me" className="fo-btn fo-btn--secondary">
            My organizations
          </Link>
          <Link to="/organizations/new" className="fo-btn fo-btn--primary">
            <Plus aria-hidden="true" /> Create Organization
          </Link>
        </div>
      </div>

      <form className="fo-toolbar" onSubmit={submitSearch} role="search">
        <label className="fo-search">
          <span className="fo-sr">Search organizations</span>
          <Search aria-hidden="true" />
          <input
            className="fo-input"
            type="search"
            placeholder="Search by name or description"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onBlur={() => query.trim() !== search && setParam("search", query.trim())}
          />
        </label>
        <select className="fo-select" value={category} onChange={(e) => setParam("category", e.target.value)} aria-label="Category">
          <option value="">All categories</option>
          {PLATFORM_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        {category && (
          <select className="fo-select" value={type} onChange={(e) => setParam("type", e.target.value)} aria-label="Type">
            <option value="">All types</option>
            {typesInCategory.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        )}
        <button type="submit" className="fo-btn fo-btn--primary">
          Search
        </button>
      </form>

      <div className="fod-chips" aria-label="Categories">
        <button type="button" className={"fod-chip" + (!category ? " is-active" : "")} onClick={() => setParam("category", "")}>
          <Compass aria-hidden="true" /> All
        </button>
        {PLATFORM_CATEGORIES.map((c) => (
          <button key={c.id} type="button" className={"fod-chip" + (category === c.id ? " is-active" : "")} onClick={() => setParam("category", c.id)}>
            <c.icon aria-hidden="true" /> {c.label}
          </button>
        ))}
      </div>

      {error && <Alert>{error}</Alert>}

      {loading ? (
        <div className="fod-grid" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} height={190} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="fo-card">
          <EmptyState
            icon={Compass}
            title={filtered ? "No organizations match your search." : "No organizations yet."}
            text={filtered ? "Try another word or category." : "Be the first: create an account for your organization."}
          >
            {filtered && (
              <button type="button" className="fo-btn fo-btn--secondary" onClick={() => setParams(new URLSearchParams())}>
                Clear filters
              </button>
            )}
            <Link to="/organizations/new" className="fo-btn fo-btn--primary">
              Create an organization
            </Link>
          </EmptyState>
        </div>
      ) : (
        <>
          <p className="fo-muted fod-count">
            {total} organization{total === 1 ? "" : "s"}
            {category && !type ? " on this page" : ""}
          </p>
          <div className="fod-grid">
            {items.map((o) => {
              const cat = categoryInfo(o.organizationType);
              const status = o.currentUserMembershipStatus ?? null;
              const to = `/organizations/${encodeURIComponent(o.id)}`;
              return (
                <article key={o.id} className="fod-card">
                  <Link to={to} className="fod-card__top">
                    <OrgLogoBox name={o.name} url={o.logoUrl} icon={cat.icon} className="fod-card__logo" />
                    <span>
                      <strong>{o.name}</strong>
                      <small>{typeLabel(o.organizationType)}</small>
                    </span>
                  </Link>
                  <p className="fod-card__desc">{o.description || "No description yet."}</p>
                  <div className="fod-card__meta">
                    {o.mainLocation?.city && (
                      <span>
                        <MapPin aria-hidden="true" /> {o.mainLocation.city}
                      </span>
                    )}
                    {typeof o.memberCount === "number" && o.memberCount > 0 && (
                      <span>
                        <UsersRound aria-hidden="true" /> {o.memberCount.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div className="fod-card__foot">
                    <Link to={to} className="fo-btn fo-btn--secondary fo-btn--sm">
                      View
                    </Link>
                    {status === MembershipStatus.Active ? (
                      <span className="fo-badge fo-badge--ok">Member</span>
                    ) : status === MembershipStatus.Pending ? (
                      <span className="fo-badge fo-badge--warn">Request sent</span>
                    ) : (
                      <Link to={`${to}/join`} className="fo-btn fo-btn--ghost fo-btn--sm">
                        Ask to join
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          {(page > 1 || hasMore) && (
            <nav className="fo-pager fod-pager" aria-label="Pages">
              <span>Page {page}</span>
              <span className="fo-pager__pages">
                <button type="button" disabled={page <= 1} onClick={() => setParam("page", String(page - 1))} aria-label="Previous page">
                  <ArrowLeft aria-hidden="true" />
                </button>
                <button type="button" disabled={!hasMore} onClick={() => setParam("page", String(page + 1))} aria-label="Next page">
                  <ArrowRight aria-hidden="true" />
                </button>
              </span>
            </nav>
          )}
        </>
      )}
    </OrgAppShell>
  );
}
