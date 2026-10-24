import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  Link,
  useLocation,
  useSearchParams,
} from "react-router-dom";

import {
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  Circle,
  Eye,
  ExternalLink,
  Flame,
  Globe,
  LayoutDashboard,
  Loader2,
  Lock,
  MessageSquare,
  MousePointerClick,
  Newspaper,
  Pencil,
  Plus,
  Settings,
  ShoppingBag,
  Star,
  Tag,
  Trash2,
  Users,
  Wrench,
} from "lucide-react";

import { businessesApi } from "../services/businessesApi";

import type {
  Business,
  BusinessDeal,
} from "../types/business.types";

import BusinessDealForm, {
  type BusinessDealFormValues,
} from "../components/BusinessDealForm";
import BusinessDestinationButtons from "../components/BusinessDestinationButtons";
import BusinessForm from "../components/BusinessForm";
import {
  BusinessLogo,
  EmptyState,
  ErrorState,
  Toast,
  useToast,
} from "../components/BusinessUi";

import {
  CREATE_BUSINESS_ROUTE,
  formatDealExpiry,
  getActiveDeals,
  getBusinessDestinations,
  getBusinessRoute,
  getCategoryLabel,
  getDisplayUrl,
  getProfileCompleteness,
  getStatusLabel,
  isBusinessPublished,
  isDealActive,
} from "../utils/businessUtils";

import "../styles/BusinessUi.scss";
import "../styles/BusinessManagerPage.scss";


/* ============================================================================
   BUSINESS MANAGER

   Routes: /business/manager, /businesses/manager (and legacy aliases)
   URL state: ?business=<id>&section=<overview|profile|deals|settings>

   Everything shown here comes from GET /businesses/mine. Sections without a
   backend yet are listed as "Not available yet" instead of showing fake data.
============================================================================ */

type SectionId = "overview" | "profile" | "deals" | "settings";

const SECTIONS: Array<{ id: SectionId; label: string; icon: ReactNode }> = [
  { id: "overview", label: "Overview", icon: <LayoutDashboard size={18} aria-hidden="true" /> },
  { id: "profile", label: "Business profile", icon: <Pencil size={18} aria-hidden="true" /> },
  { id: "deals", label: "Deals & promotions", icon: <Tag size={18} aria-hidden="true" /> },
  { id: "settings", label: "Visibility & settings", icon: <Settings size={18} aria-hidden="true" /> },
];

/*
 * Requested dashboard areas that need backend work before they can be
 * offered. Shown disabled so owners know they are planned, not broken.
 */
const UNAVAILABLE_SECTIONS: Array<{ label: string; icon: ReactNode }> = [
  { label: "Business posts", icon: <Newspaper size={18} aria-hidden="true" /> },
  { label: "Services", icon: <Wrench size={18} aria-hidden="true" /> },
  { label: "Reviews", icon: <Star size={18} aria-hidden="true" /> },
  { label: "Messages", icon: <MessageSquare size={18} aria-hidden="true" /> },
  { label: "Events", icon: <CalendarDays size={18} aria-hidden="true" /> },
  { label: "Team & permissions", icon: <Users size={18} aria-hidden="true" /> },
  { label: "Detailed analytics", icon: <BarChart3 size={18} aria-hidden="true" /> },
];

function isSection(value: string | null): value is SectionId {
  return SECTIONS.some((section) => section.id === value);
}

export default function BusinessManagerPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { pathname } = useLocation();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const [toast, showToast] = useToast();

  /* --------------------------------------------------------------------------
     LOAD
  -------------------------------------------------------------------------- */

  useEffect(() => {
    let mounted = true;

    setLoading(true);
    setError(null);
    setNeedsLogin(false);

    businessesApi
      .getMine()
      .then((data) => {
        if (mounted) {
          setBusinesses(data);
        }
      })
      .catch((err: unknown) => {
        if (!mounted) {
          return;
        }

        const message = err instanceof Error ? err.message : "";

        if (/logged in|401|unauthor/i.test(message)) {
          setNeedsLogin(true);
        } else {
          setError(message || "Unable to load your businesses.");
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [attempt]);

  /* --------------------------------------------------------------------------
     SELECTION (URL state)
  -------------------------------------------------------------------------- */

  const requestedId = searchParams.get("business");
  const sectionParam = searchParams.get("section");
  // Legacy routes /business(es)/deals and /business(es)/spotlight open the
  // matching section.
  const routeSection: SectionId = pathname.endsWith("/deals")
    ? "deals"
    : pathname.endsWith("/spotlight")
      ? "settings"
      : "overview";
  const section: SectionId = isSection(sectionParam) ? sectionParam : routeSection;

  const selected =
    businesses.find((business) => business.id === requestedId) ?? businesses[0] ?? null;

  const navigate = useCallback(
    (changes: { business?: string; section?: SectionId }, replace = false) => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);

          next.delete("created");

          if (changes.business) {
            next.set("business", changes.business);
          }

          if (changes.section) {
            next.set("section", changes.section);
          }

          return next;
        },
        { replace },
      );
    },
    [setSearchParams],
  );

  const replaceBusiness = (updated: Business) => {
    setBusinesses((previous) =>
      previous.map((business) => (business.id === updated.id ? { ...business, ...updated } : business)),
    );
  };

  const refresh = async () => {
    try {
      setBusinesses(await businessesApi.getMine());
    } catch {
      // Keep the current data; the action that triggered the refresh has
      // already reported its own result.
    }
  };

  /* --------------------------------------------------------------------------
     STATES
  -------------------------------------------------------------------------- */

  const header = (
    <header className="fkb-manager__header">
      <div>
        <span className="fkb-eyebrow">Fockis Businesses</span>
        <h1>Business Manager</h1>
        <p>Manage your business profiles, links, deals and visibility.</p>
      </div>

      <Link to={CREATE_BUSINESS_ROUTE} className="fkb-btn fkb-btn--dark">
        <Plus size={16} aria-hidden="true" />
        Create business
      </Link>
    </header>
  );

  if (loading) {
    return (
      <main className="fkb fkb-page fkb-manager">
        <div className="fkb-container">
          {header}
          <div className="fkb-manager__loading" role="status" aria-label="Loading your businesses">
            <div className="fkb-skeleton" style={{ height: 360, borderRadius: 16 }} />
            <div className="fkb-skeleton" style={{ height: 360, borderRadius: 16 }} />
          </div>
        </div>
      </main>
    );
  }

  if (needsLogin) {
    return (
      <main className="fkb fkb-page fkb-manager">
        <div className="fkb-container">
          {header}
          <EmptyState
            icon={<Lock size={22} />}
            title="Sign in to manage your businesses"
            message="Business Manager is available to signed-in Fockis members."
            actions={
              <Link to="/login" className="fkb-btn fkb-btn--primary">
                Sign in
              </Link>
            }
          />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="fkb fkb-page fkb-manager">
        <div className="fkb-container">
          {header}
          <ErrorState
            title="Your businesses could not be loaded"
            message={error}
            onRetry={() => setAttempt((value) => value + 1)}
          />
        </div>
      </main>
    );
  }

  if (!selected) {
    return (
      <main className="fkb fkb-page fkb-manager">
        <div className="fkb-container">
          {header}
          <EmptyState
            icon={<Building2 size={24} />}
            title="You haven't created a business yet"
            message="Create a business profile to appear in the Fockis directory, share deals and link your website or Fockis Shop store."
            actions={
              <Link to={CREATE_BUSINESS_ROUTE} className="fkb-btn fkb-btn--primary">
                <Plus size={16} aria-hidden="true" />
                Create your first business
              </Link>
            }
          />
        </div>
      </main>
    );
  }

  /* --------------------------------------------------------------------------
     DASHBOARD
  -------------------------------------------------------------------------- */

  const status = getStatusLabel(selected);

  return (
    <main className="fkb fkb-page fkb-manager">
      <div className="fkb-container">
        {header}

        {searchParams.get("created") === "1" && (
          <div className="fkb-alert fkb-alert--success fkb-manager__notice" role="status">
            <CheckCircle2 size={18} aria-hidden="true" />
            <span>
              <strong>{selected.name}</strong> was created.{" "}
              {isBusinessPublished(selected)
                ? "It's now live in the Businesses directory."
                : "Publish it when you're ready for customers to see it."}
            </span>
          </div>
        )}

        <div className="fkb-manager__layout">
          {/* ============================================================
              SIDEBAR
          ============================================================ */}

          <aside className="fkb-manager__sidebar">
            {businesses.length > 1 && (
              <div className="fkb-field fkb-manager__switcher">
                <label className="fkb-field__label" htmlFor="fkb-business-switcher">
                  Business
                </label>
                <select
                  id="fkb-business-switcher"
                  className="fkb-input"
                  value={selected.id}
                  onChange={(event) => navigate({ business: event.target.value, section: "overview" })}
                >
                  {businesses.map((business) => (
                    <option key={business.id} value={business.id}>
                      {business.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="fkb-manager__identity">
              <BusinessLogo business={selected} size={48} />
              <div>
                <strong>{selected.name}</strong>
                <span className={`fkb-badge fkb-badge--${status.tone}`}>{status.label}</span>
              </div>
            </div>

            <nav className="fkb-manager__nav" aria-label="Business Manager sections">
              {SECTIONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="fkb-manager__nav-item"
                  aria-current={section === item.id ? "page" : undefined}
                  onClick={() => navigate({ business: selected.id, section: item.id })}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}

              <Link to={getBusinessRoute(selected.id)} className="fkb-manager__nav-item">
                <Eye size={18} aria-hidden="true" />
                View public profile
              </Link>
            </nav>

            <div className="fkb-manager__unavailable">
              <span className="fkb-manager__unavailable-title">Not available yet</span>
              <ul>
                {UNAVAILABLE_SECTIONS.map((item) => (
                  <li key={item.label}>
                    {item.icon}
                    {item.label}
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* ============================================================
              CONTENT
          ============================================================ */}

          <div className="fkb-manager__content">
            {section === "overview" && (
              <OverviewSection
                business={selected}
                onEdit={() => navigate({ business: selected.id, section: "profile" })}
                onDeals={() => navigate({ business: selected.id, section: "deals" })}
                onSettings={() => navigate({ business: selected.id, section: "settings" })}
              />
            )}

            {section === "profile" && (
              <section aria-labelledby="fkb-profile-title">
                <div className="fkb-section-head">
                  <div>
                    <h2 id="fkb-profile-title">Business profile</h2>
                    <p>Details, images, contact info, Business Card Links, hours and social links.</p>
                  </div>
                </div>

                <BusinessForm
                  business={selected}
                  onCancel={() => navigate({ business: selected.id, section: "overview" })}
                  onSuccess={(updated) => {
                    replaceBusiness(updated);
                    void refresh();
                    showToast("Business profile saved");
                    navigate({ business: updated.id, section: "overview" });
                  }}
                />
              </section>
            )}

            {section === "deals" && (
              <DealsSection
                business={selected}
                onChanged={async (message) => {
                  await refresh();
                  showToast(message);
                }}
              />
            )}

            {section === "settings" && (
              <SettingsSection
                business={selected}
                onUpdated={(updated, message) => {
                  replaceBusiness(updated);
                  showToast(message);
                }}
                onDeleted={async () => {
                  const remaining = businesses.filter((business) => business.id !== selected.id);

                  setBusinesses(remaining);
                  showToast("Business deleted");
                  setSearchParams(remaining[0] ? { business: remaining[0].id } : {}, { replace: true });
                }}
              />
            )}
          </div>
        </div>
      </div>

      <Toast message={toast} />
    </main>
  );
}


/* ============================================================================
   OVERVIEW
============================================================================ */

function OverviewSection({
  business,
  onEdit,
  onDeals,
  onSettings,
}: {
  business: Business;
  onEdit: () => void;
  onDeals: () => void;
  onSettings: () => void;
}) {
  const completeness = getProfileCompleteness(business);
  const destinations = getBusinessDestinations(business);
  const activeDeals = getActiveDeals(business);
  const published = isBusinessPublished(business);

  return (
    <div className="fkb-manager__stack">
      {!published && (
        <div className="fkb-alert fkb-alert--warning" role="status">
          <Lock size={18} aria-hidden="true" />
          <span>
            This business is not published, so customers can't find it yet.{" "}
            <button type="button" className="fkb-manager__inline-link" onClick={onSettings}>
              Publish it
            </button>
          </span>
        </div>
      )}

      <section className="fkb-manager__stats" aria-label="Performance">
        <Stat icon={<Eye size={18} />} label="Profile views" value={business.views} />
        <Stat icon={<MousePointerClick size={18} />} label="Website clicks" value={business.websiteClicks} />
        <Stat icon={<ShoppingBag size={18} />} label="Store visits" value={business.storeClicks} />
        <Stat icon={<Tag size={18} />} label="Active deals" value={activeDeals.length} />
      </section>
      <p className="fkb-field__hint fkb-manager__stats-note">
        Views and clicks are counted from visitors while the business is published.
      </p>

      <div className="fkb-manager__grid">
        <section className="fkb-manager__card" aria-labelledby="fkb-completeness-title">
          <div className="fkb-manager__card-head">
            <h2 id="fkb-completeness-title">Profile completeness</h2>
            <strong>{completeness.percent}%</strong>
          </div>

          <div
            className="fkb-progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={completeness.percent}
            aria-labelledby="fkb-completeness-title"
          >
            <span style={{ width: `${completeness.percent}%` }} />
          </div>

          {completeness.missing.length > 0 ? (
            <>
              <p className="fkb-manager__card-text">Complete profiles get more trust from customers. Still missing:</p>
              <ul className="fkb-checklist">
                {completeness.missing.map((item) => (
                  <li key={item}>
                    <Circle size={14} aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
              <button type="button" className="fkb-btn fkb-btn--secondary fkb-btn--sm" onClick={onEdit}>
                <Pencil size={15} aria-hidden="true" />
                Complete profile
              </button>
            </>
          ) : (
            <p className="fkb-manager__card-text fkb-manager__complete">
              <CheckCircle2 size={16} aria-hidden="true" />
              Your profile is complete.
            </p>
          )}
        </section>

        <section className="fkb-manager__card" aria-labelledby="fkb-links-title">
          <div className="fkb-manager__card-head">
            <h2 id="fkb-links-title">Business Card Links</h2>
            <button type="button" className="fkb-btn fkb-btn--ghost fkb-btn--sm" onClick={onEdit}>
              Edit
            </button>
          </div>

          <dl className="fkb-manager__facts">
            <div>
              <dt>
                <Globe size={15} aria-hidden="true" /> Website
              </dt>
              <dd>{destinations.websiteUrl ? getDisplayUrl(destinations.websiteUrl) : "Not set"}</dd>
            </div>
            <div>
              <dt>
                <ShoppingBag size={15} aria-hidden="true" /> Fockis Shop
              </dt>
              <dd>
                {destinations.store
                  ? destinations.store.name
                  : business.storeId
                    ? "Connected store is unavailable"
                    : "Not connected"}
              </dd>
            </div>
            <div>
              <dt>Main button</dt>
              <dd>
                {destinations.primary === "STORE"
                  ? "Visit Store"
                  : destinations.primary === "WEBSITE"
                    ? "Visit Website"
                    : "None"}
              </dd>
            </div>
          </dl>

          <div className="fkb-manager__preview-buttons">
            <BusinessDestinationButtons business={business} size="sm" />
          </div>
        </section>

        <section className="fkb-manager__card" aria-labelledby="fkb-status-title">
          <div className="fkb-manager__card-head">
            <h2 id="fkb-status-title">Status</h2>
            <button type="button" className="fkb-btn fkb-btn--ghost fkb-btn--sm" onClick={onSettings}>
              Manage
            </button>
          </div>

          <dl className="fkb-manager__facts">
            <div>
              <dt>Directory & Feed</dt>
              <dd>{published ? "Published" : "Not published"}</dd>
            </div>
            <div>
              <dt>
                <Flame size={15} aria-hidden="true" /> Spotlight
              </dt>
              <dd>{business.spotlightEnabled ? "In Spotlight" : "Not in Spotlight"}</dd>
            </div>
            <div>
              <dt>Verification</dt>
              <dd>{business.verified ? "Verified" : "Not verified"}</dd>
            </div>
            <div>
              <dt>Category</dt>
              <dd>{getCategoryLabel(business.category)}</dd>
            </div>
            {business.updatedAt && (
              <div>
                <dt>Last updated</dt>
                <dd>{new Date(business.updatedAt).toLocaleDateString()}</dd>
              </div>
            )}
          </dl>
        </section>

        <section className="fkb-manager__card" aria-labelledby="fkb-deals-summary-title">
          <div className="fkb-manager__card-head">
            <h2 id="fkb-deals-summary-title">Deals & promotions</h2>
            <button type="button" className="fkb-btn fkb-btn--ghost fkb-btn--sm" onClick={onDeals}>
              Manage
            </button>
          </div>

          {activeDeals.length ? (
            <ul className="fkb-manager__mini-list">
              {activeDeals.slice(0, 3).map((deal) => (
                <li key={deal.id}>
                  <strong>{deal.discount || deal.title}</strong>
                  <span>{formatDealExpiry(deal.expiresAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="fkb-manager__card-text">No active deals. Deals appear on your profile and in the Spotlight deals rail.</p>
          )}

          <button type="button" className="fkb-btn fkb-btn--secondary fkb-btn--sm" onClick={onDeals}>
            <Plus size={15} aria-hidden="true" />
            New deal
          </button>
        </section>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="fkb-stat">
      <span className="fkb-stat__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="fkb-stat__value">{value.toLocaleString()}</span>
      <span className="fkb-stat__label">{label}</span>
    </div>
  );
}


/* ============================================================================
   DEALS
============================================================================ */

function DealsSection({
  business,
  onChanged,
}: {
  business: Business;
  onChanged: (message: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState<BusinessDeal | "new" | null>(null);
  const [deleting, setDeleting] = useState<BusinessDeal | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deals = useMemo(
    () =>
      [...business.deals].sort((a, b) => {
        const activeDiff = Number(isDealActive(b)) - Number(isDealActive(a));

        return activeDiff || new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime();
      }),
    [business.deals],
  );

  const submit = async (values: BusinessDealFormValues) => {
    if (editing === "new") {
      await businessesApi.createDeal(business.id, values);
      setEditing(null);
      await onChanged("Deal created");
    } else if (editing) {
      await businessesApi.updateDeal(business.id, editing.id, values);
      setEditing(null);
      await onChanged("Deal updated");
    }
  };

  const confirmDelete = async () => {
    if (!deleting) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await businessesApi.deleteDeal(business.id, deleting.id);
      setDeleting(null);
      await onChanged("Deal deleted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete the deal.");
    } finally {
      setBusy(false);
    }
  };

  const dealStatus = (deal: BusinessDeal) => {
    if (deal.active === false) {
      return { label: "Paused", tone: "neutral" };
    }

    return isDealActive(deal) ? { label: "Active", tone: "success" } : { label: "Expired", tone: "danger" };
  };

  return (
    <section aria-labelledby="fkb-deals-title" className="fkb-manager__stack">
      <div className="fkb-section-head">
        <div>
          <h2 id="fkb-deals-title">Deals & promotions</h2>
          <p>Active deals show on your profile and business cards until their end date. Expired deals are hidden from customers automatically.</p>
        </div>
        {editing === null && (
          <div className="fkb-section-head__actions">
            <button type="button" className="fkb-btn fkb-btn--primary" onClick={() => setEditing("new")}>
              <Plus size={16} aria-hidden="true" />
              New deal
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="fkb-alert fkb-alert--error" role="alert">
          <span>{error}</span>
        </div>
      )}

      {editing !== null && (
        <div className="fkb-manager__card">
          <BusinessDealForm
            deal={editing === "new" ? null : editing}
            onSubmit={submit}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}

      {deals.length === 0 && editing === null ? (
        <EmptyState
          icon={<Tag size={22} />}
          title="No deals yet"
          message="Create a deal to promote an offer or coupon code to customers."
          actions={
            <button type="button" className="fkb-btn fkb-btn--primary" onClick={() => setEditing("new")}>
              <Plus size={16} aria-hidden="true" />
              Create a deal
            </button>
          }
        />
      ) : (
        <ul className="fkb-deal-list">
          {deals.map((deal) => {
            const statusInfo = dealStatus(deal);

            return (
              <li key={deal.id} className="fkb-deal-list__item">
                <div className="fkb-deal-list__main">
                  <div className="fkb-deal-list__title">
                    <strong>{deal.title}</strong>
                    <span className={`fkb-badge fkb-badge--${statusInfo.tone}`}>{statusInfo.label}</span>
                  </div>
                  <span className="fkb-deal-list__meta">
                    {[deal.discount, deal.couponCode ? `Code ${deal.couponCode}` : "", deal.expiresAt ? `Ends ${new Date(deal.expiresAt).toLocaleDateString()}` : ""]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </div>
                <div className="fkb-deal-list__actions">
                  <button
                    type="button"
                    className="fkb-btn fkb-btn--secondary fkb-btn--sm"
                    onClick={() => setEditing(deal)}
                    aria-label={`Edit deal ${deal.title}`}
                  >
                    <Pencil size={15} aria-hidden="true" />
                    Edit
                  </button>
                  <button
                    type="button"
                    className="fkb-btn fkb-btn--danger fkb-btn--sm"
                    onClick={() => setDeleting(deal)}
                    aria-label={`Delete deal ${deal.title}`}
                  >
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={deleting !== null}
        title="Delete this deal?"
        message={deleting ? `“${deleting.title}” will be removed permanently.` : ""}
        confirmLabel="Delete deal"
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </section>
  );
}


/* ============================================================================
   SETTINGS
============================================================================ */

function SettingsSection({
  business,
  onUpdated,
  onDeleted,
}: {
  business: Business;
  onUpdated: (business: Business, message: string) => void;
  onDeleted: () => Promise<void>;
}) {
  const [working, setWorking] = useState<"publish" | "spotlight" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const published = isBusinessPublished(business);

  const run = async (
    kind: "publish" | "spotlight",
    action: () => Promise<Business>,
    message: string,
  ) => {
    setWorking(kind);
    setError(null);

    try {
      const updated = await action();

      onUpdated(updated, message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update the business.");
    } finally {
      setWorking(null);
    }
  };

  const remove = async () => {
    setWorking("delete");
    setError(null);

    try {
      await businessesApi.remove(business.id);
      setConfirmDelete(false);
      await onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete the business.");
      setConfirmDelete(false);
    } finally {
      setWorking(null);
    }
  };

  return (
    <section aria-labelledby="fkb-settings-title" className="fkb-manager__stack">
      <div className="fkb-section-head">
        <div>
          <h2 id="fkb-settings-title">Visibility & settings</h2>
          <p>Control where {business.name} appears on Fockis.</p>
        </div>
      </div>

      {error && (
        <div className="fkb-alert fkb-alert--error" role="alert">
          <span>{error}</span>
        </div>
      )}

      <div className="fkb-manager__card fkb-setting">
        <div>
          <h3>Publish to Feed</h3>
          <p>
            {published
              ? "Your business is public in the Businesses directory and the Fockis Feed."
              : "Publish to make your business public in the Businesses directory and the Fockis Feed."}
          </p>
        </div>
        <button
          type="button"
          className={`fkb-btn ${published ? "fkb-btn--secondary" : "fkb-btn--primary"}`}
          disabled={working !== null}
          onClick={() =>
            run(
              "publish",
              () => (published ? businessesApi.unpublish(business.id) : businessesApi.publish(business.id)),
              published ? "Business unpublished" : "Business published",
            )
          }
        >
          {working === "publish" && <Loader2 size={16} className="fkb-spin" aria-hidden="true" />}
          {published ? "Unpublish" : "Publish"}
        </button>
      </div>

      <div className="fkb-manager__card fkb-setting">
        <div>
          <h3>Spotlight</h3>
          <p>
            {business.spotlightEnabled
              ? "Your business is in the featured Spotlight rail."
              : published
                ? "Feature your business in the Spotlight rail. Spotlight order is managed by Fockis."
                : "Publish your business before adding it to Spotlight."}
          </p>
        </div>
        <button
          type="button"
          className={`fkb-btn ${business.spotlightEnabled ? "fkb-btn--secondary" : "fkb-btn--primary"}`}
          disabled={working !== null || (!published && !business.spotlightEnabled)}
          onClick={() =>
            run(
              "spotlight",
              () => businessesApi.update(business.id, { spotlightEnabled: !business.spotlightEnabled }),
              business.spotlightEnabled ? "Removed from Spotlight" : "Added to Spotlight",
            )
          }
        >
          {working === "spotlight" && <Loader2 size={16} className="fkb-spin" aria-hidden="true" />}
          <Flame size={16} aria-hidden="true" />
          {business.spotlightEnabled ? "Remove from Spotlight" : "Add to Spotlight"}
        </button>
      </div>

      <div className="fkb-manager__card fkb-setting">
        <div>
          <h3>Public profile</h3>
          <p>See your business the way customers do.</p>
        </div>
        <Link to={getBusinessRoute(business.id)} className="fkb-btn fkb-btn--secondary">
          <ExternalLink size={16} aria-hidden="true" />
          View profile
        </Link>
      </div>

      <div className="fkb-manager__card fkb-setting fkb-setting--danger">
        <div>
          <h3>Delete business</h3>
          <p>Permanently removes this business profile and all of its deals. Your Fockis Shop store is not affected.</p>
        </div>
        <button type="button" className="fkb-btn fkb-btn--danger" disabled={working !== null} onClick={() => setConfirmDelete(true)}>
          <Trash2 size={16} aria-hidden="true" />
          Delete
        </button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete ${business.name}?`}
        message="This permanently deletes the business profile and its deals. This can't be undone."
        confirmLabel="Delete business"
        busy={working === "delete"}
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
      />
    </section>
  );
}


/* ============================================================================
   CONFIRM DIALOG (native <dialog>, focus-trapped by the browser)
============================================================================ */

function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  busy,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = ref.current;

    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal?.();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="fkb fkb-dialog"
      aria-labelledby="fkb-dialog-title"
      onCancel={(event) => {
        event.preventDefault();

        if (!busy) {
          onCancel();
        }
      }}
    >
      <h2 id="fkb-dialog-title">{title}</h2>
      <p>{message}</p>
      <div className="fkb-dialog__actions">
        <button type="button" className="fkb-btn fkb-btn--secondary" onClick={onCancel} disabled={busy} autoFocus>
          Cancel
        </button>
        <button type="button" className="fkb-btn fkb-btn--danger-solid" onClick={onConfirm} disabled={busy}>
          {busy && <Loader2 size={16} className="fkb-spin" aria-hidden="true" />}
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
