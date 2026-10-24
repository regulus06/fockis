import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  Link,
  useParams,
  useSearchParams,
} from "react-router-dom";

import {
  ArrowLeft,
  Building2,
  CalendarClock,
  Clock3,
  EyeOff,
  Globe,
  Mail,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Settings,
  Share2,
  Tag,
  Users,
} from "lucide-react";

import {
  FaFacebook,
  FaInstagram,
  FaLinkedin,
  FaTiktok,
  FaYoutube,
} from "react-icons/fa6";

import {
  BusinessApiError,
  businessesApi,
} from "../services/businessesApi";

import type {
  Business,
  BusinessSocialLinks,
} from "../types/business.types";

import BusinessDestinationButtons from "../components/BusinessDestinationButtons";
import BusinessFeedRail from "../components/BusinessFeedRail";
import BusinessShopRail from "../components/BusinessShopRail";
import {
  BusinessCover,
  BusinessLogo,
  CouponCode,
  EmptyState,
  ErrorState,
  Toast,
  VerifiedBadge,
  useToast,
} from "../components/BusinessUi";

import {
  BUSINESS_MANAGER_ROUTE,
  WEEKDAYS,
  WEEKDAY_ORDER,
  formatAddressLines,
  formatDealExpiry,
  formatHoursEntry,
  formatLocation,
  getActiveDeals,
  getBusinessDestinations,
  getBusinessSizeLabel,
  getCategoryOption,
  getDirectionsUrl,
  getDisplayUrl,
  getEmailHref,
  getHoursForDay,
  getOpenNowStatus,
  getPhoneHref,
  getSocialLinks,
  hasCoordinates,
  hasHours,
  isBusinessPublished,
  isBusinessVerified,
} from "../utils/businessUtils";

import "../styles/BusinessUi.scss";
import "../styles/BusinessPage.scss";


/* ============================================================================
   BUSINESS PROFILE PAGE

   Route: /businesses/:businessId (also /business/:businessId)

   Sections are only rendered when the business has real data for them.
   The active section is stored in ?tab= so browser back/forward works.
============================================================================ */

type TabId = "overview" | "about" | "deals" | "products" | "location";

const SOCIAL_ICONS: Record<keyof BusinessSocialLinks, ReactNode> = {
  facebook: <FaFacebook aria-hidden="true" />,
  instagram: <FaInstagram aria-hidden="true" />,
  linkedin: <FaLinkedin aria-hidden="true" />,
  youtube: <FaYoutube aria-hidden="true" />,
  tiktok: <FaTiktok aria-hidden="true" />,
};

/*
 * Views are counted once per business per page session.
 */
const trackedViews = new Set<string>();

/*
 * Reads the signed-in user's ID from the stored JWT (UI hint only; the
 * backend enforces ownership on every write).
 */
function getViewerId(): string | null {
  try {
    const token =
      localStorage.getItem("access_token") ||
      localStorage.getItem("token") ||
      localStorage.getItem("jwt");

    const payload = token?.split(".")[1];

    if (!payload) {
      return null;
    }

    const json = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/")),
    );

    const id = json?.sub ?? json?.id ?? json?._id ?? json?.userId;

    return id ? String(id) : null;
  } catch {
    return null;
  }
}

export default function BusinessPage() {
  const { businessId } = useParams<{ businessId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const [toast, showToast] = useToast();
  const contactRef = useRef<HTMLElement | null>(null);

  /* --------------------------------------------------------------------------
     LOAD
  -------------------------------------------------------------------------- */

  useEffect(() => {
    let mounted = true;

    if (!businessId) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    setLoading(true);
    setError(null);
    setNotFound(false);

    businessesApi
      .getById(businessId)
      .then((data) => {
        if (!mounted) {
          return;
        }

        setBusiness(data);

        if (isBusinessPublished(data) && !trackedViews.has(data.id)) {
          trackedViews.add(data.id);
          void businessesApi.trackView(data.id);
        }
      })
      .catch((err: unknown) => {
        if (!mounted) {
          return;
        }

        setBusiness(null);

        if (err instanceof BusinessApiError && (err.status === 404 || err.status === 400)) {
          setNotFound(true);
        } else {
          setError(err instanceof Error ? err.message : "Unable to load this business.");
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
  }, [businessId, attempt]);

  useEffect(() => {
    if (business?.name) {
      const previous = document.title;
      document.title = `${business.name} · Fockis Businesses`;

      return () => {
        document.title = previous;
      };
    }
  }, [business?.name]);

  /* --------------------------------------------------------------------------
     DERIVED DATA
  -------------------------------------------------------------------------- */

  const derived = useMemo(() => {
    if (!business) {
      return null;
    }

    const deals = getActiveDeals(business);
    const addressLines = formatAddressLines(business);
    const directionsUrl = getDirectionsUrl(business);
    const socialLinks = getSocialLinks(business);
    const destinations = getBusinessDestinations(business);

    const tabs: Array<{ id: TabId; label: string }> = [
      { id: "overview", label: "Overview" },
      { id: "about", label: "About" },
    ];

    if (deals.length) {
      tabs.push({ id: "deals", label: `Deals (${deals.length})` });
    }

    if (business.store) {
      tabs.push({ id: "products", label: "Products" });
    }

    if (addressLines.length || hasCoordinates(business)) {
      tabs.push({ id: "location", label: "Location" });
    }

    return {
      deals,
      addressLines,
      directionsUrl,
      socialLinks,
      destinations,
      tabs,
      phoneHref: getPhoneHref(business.phone),
      emailHref: getEmailHref(business.email),
      openStatus: getOpenNowStatus(business),
      location: formatLocation(business, { withCountry: true }),
      category: getCategoryOption(business.category),
      isOwner: Boolean(business.ownerId) && getViewerId() === business.ownerId,
    };
  }, [business]);

  /* --------------------------------------------------------------------------
     STATES
  -------------------------------------------------------------------------- */

  if (loading) {
    return (
      <main className="fkb fkb-page fkb-profile">
        <div className="fkb-container">
          <ProfileSkeleton />
        </div>
      </main>
    );
  }

  if (notFound || (!business && !error)) {
    return (
      <main className="fkb fkb-page fkb-profile">
        <div className="fkb-container">
          <BackLink />
          <EmptyState
            icon={<Building2 size={24} />}
            title="Business not found"
            message="This business profile doesn't exist or isn't public."
            actions={
              <Link to="/businesses" className="fkb-btn fkb-btn--primary">
                Browse businesses
              </Link>
            }
          />
        </div>
      </main>
    );
  }

  if (error || !business || !derived) {
    return (
      <main className="fkb fkb-page fkb-profile">
        <div className="fkb-container">
          <BackLink />
          <ErrorState
            title="This business could not be loaded"
            message="Check your connection and try again."
            onRetry={() => setAttempt((value) => value + 1)}
          />
        </div>
      </main>
    );
  }

  /* --------------------------------------------------------------------------
     TABS
  -------------------------------------------------------------------------- */

  const requestedTab = searchParams.get("tab") as TabId | null;
  const activeTab: TabId = derived.tabs.some((tab) => tab.id === requestedTab)
    ? (requestedTab as TabId)
    : "overview";

  const tabHref = (tab: TabId) => {
    const next = new URLSearchParams(searchParams);

    if (tab === "overview") {
      next.delete("tab");
    } else {
      next.set("tab", tab);
    }

    const search = next.toString();

    return { search: search ? `?${search}` : "" };
  };

  const share = async () => {
    const url = window.location.href.split("?")[0];

    try {
      if (navigator.share) {
        await navigator.share({ title: business.name, text: business.tagline || business.name, url });
        return;
      }

      await navigator.clipboard.writeText(url);
      showToast("Link copied to clipboard");
    } catch (err) {
      if ((err as DOMException)?.name !== "AbortError") {
        showToast("Couldn't share this page");
      }
    }
  };

  const goToContact = () => {
    if (activeTab !== "overview" && activeTab !== "about") {
      setSearchParams((previous) => {
        const next = new URLSearchParams(previous);
        next.delete("tab");
        return next;
      });
    }

    window.setTimeout(() => {
      contactRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      contactRef.current?.focus({ preventScroll: true });
    }, 0);
  };

  const hasContact = Boolean(derived.phoneHref || derived.emailHref || derived.destinations.websiteUrl);
  const CategoryIcon = derived.category.icon;
  const published = isBusinessPublished(business);

  /* --------------------------------------------------------------------------
     RENDER
  -------------------------------------------------------------------------- */

  return (
    <main className="fkb fkb-page fkb-profile">
      <div className="fkb-container">
        <BackLink />

        {!published && (
          <div className="fkb-alert fkb-alert--warning fkb-profile__notice" role="status">
            <EyeOff size={18} aria-hidden="true" />
            <span>
              This business isn't published yet, so only you can see this page.{" "}
              <Link to={BUSINESS_MANAGER_ROUTE}>Publish it from Business Manager</Link>.
            </span>
          </div>
        )}

        {/* ==============================================================
            HERO
        ============================================================== */}

        <header className="fkb-profile__hero">
          <BusinessCover business={business} eager className="fkb-profile__cover" />

          <div className="fkb-profile__hero-body">
            <BusinessLogo business={business} size={112} ring className="fkb-profile__logo" />

            <div className="fkb-profile__identity">
              <div className="fkb-profile__badges">
                <span className="fkb-badge">
                  <CategoryIcon size={14} aria-hidden="true" />
                  {derived.category.label}
                </span>

                {isBusinessVerified(business) && <VerifiedBadge />}

                {derived.openStatus && (
                  <span
                    className={`fkb-badge ${derived.openStatus === "open" ? "fkb-badge--success" : "fkb-badge--neutral"}`}
                  >
                    <Clock3 size={13} aria-hidden="true" />
                    {derived.openStatus === "open" ? "Open now" : "Closed now"}
                  </span>
                )}

                {business.byAppointmentOnly && (
                  <span className="fkb-badge fkb-badge--neutral">
                    <CalendarClock size={13} aria-hidden="true" />
                    By appointment
                  </span>
                )}
              </div>

              <h1>{business.name}</h1>

              {business.tagline && <p className="fkb-profile__tagline">{business.tagline}</p>}

              {derived.location && (
                <p className="fkb-profile__location">
                  <MapPin size={16} aria-hidden="true" />
                  {derived.location}
                </p>
              )}
            </div>

            <div className="fkb-profile__actions">
              <BusinessDestinationButtons business={business} />

              {hasContact && (
                <button type="button" className="fkb-btn fkb-btn--secondary" onClick={goToContact}>
                  <MessageCircle size={16} aria-hidden="true" />
                  Contact
                </button>
              )}

              <button type="button" className="fkb-btn fkb-btn--secondary" onClick={share}>
                <Share2 size={16} aria-hidden="true" />
                Share
              </button>

              {derived.isOwner && (
                <Link to={BUSINESS_MANAGER_ROUTE} className="fkb-btn fkb-btn--ghost">
                  <Settings size={16} aria-hidden="true" />
                  Manage
                </Link>
              )}
            </div>
          </div>

          <nav className="fkb-profile__tabs" aria-label="Business sections">
            {derived.tabs.map((tab) => (
              <Link
                key={tab.id}
                to={tabHref(tab.id)}
                className="fkb-profile__tab"
                aria-current={activeTab === tab.id ? "page" : undefined}
                preventScrollReset
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </header>

        {/* ==============================================================
            CONTENT
        ============================================================== */}

        <div className="fkb-profile__layout">
          <div className="fkb-profile__main">
            {activeTab === "overview" && (
              <>
                <Panel title={`About ${business.name}`}>
                  {business.description ? (
                    <p className="fkb-profile__description fkb-profile__description--clamp">
                      {business.description}
                    </p>
                  ) : (
                    <p className="fkb-muted">This business hasn't added a description yet.</p>
                  )}

                  <Link to={tabHref("about")} className="fkb-link fkb-profile__more">
                    Business details
                  </Link>
                </Panel>

                {derived.deals.length > 0 && (
                  <Panel title="Current offers">
                    <DealList deals={derived.deals.slice(0, 2)} />
                    {derived.deals.length > 2 && (
                      <Link to={tabHref("deals")} className="fkb-link fkb-profile__more">
                        See all {derived.deals.length} offers
                      </Link>
                    )}
                  </Panel>
                )}

                {business.store && (
                  <div className="fkb-profile__panel fkb-profile__panel--flush">
                    <BusinessShopRail business={business} limit={8} title="Featured products" />
                  </div>
                )}
              </>
            )}

            {activeTab === "about" && (
              <Panel title={`About ${business.name}`}>
                {business.description ? (
                  <p className="fkb-profile__description">{business.description}</p>
                ) : (
                  <p className="fkb-muted">This business hasn't added a description yet.</p>
                )}

                <dl className="fkb-details">
                  <Detail label="Category" value={derived.category.label} />
                  <Detail label="Founded" value={business.foundedYear ? String(business.foundedYear) : null} />
                  <Detail label="Company size" value={getBusinessSizeLabel(business.businessSize)} />
                  <Detail label="Appointments" value={business.byAppointmentOnly ? "By appointment only" : null} />
                  <Detail label="Location" value={derived.location || null} />
                </dl>
              </Panel>
            )}

            {activeTab === "deals" && (
              <Panel title="Deals & promotions">
                <DealList deals={derived.deals} />
              </Panel>
            )}

            {activeTab === "products" && business.store && (
              <div className="fkb-profile__panel fkb-profile__panel--flush">
                <BusinessShopRail business={business} limit={24} />
              </div>
            )}

            {activeTab === "location" && (
              <Panel title="Location">
                {derived.addressLines.length > 0 && (
                  <address className="fkb-profile__address">
                    {derived.addressLines.map((line) => (
                      <span key={line}>{line}</span>
                    ))}
                  </address>
                )}

                {hasCoordinates(business) && (
                  <p className="fkb-muted fkb-profile__coords">
                    {business.latitude!.toFixed(5)}, {business.longitude!.toFixed(5)}
                  </p>
                )}

                {derived.directionsUrl && (
                  <a
                    href={derived.directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="fkb-btn fkb-btn--primary"
                  >
                    <Navigation size={16} aria-hidden="true" />
                    Get directions
                    <span className="fkb-visually-hidden"> (opens Google Maps in a new tab)</span>
                  </a>
                )}
              </Panel>
            )}
          </div>

          {/* ============================================================
              SIDEBAR
          ============================================================ */}

          <aside className="fkb-profile__aside" aria-label="Contact and hours">
            <section
              id="contact"
              ref={contactRef}
              tabIndex={-1}
              className="fkb-profile__panel"
              aria-labelledby="fkb-contact-title"
            >
              <h2 id="fkb-contact-title" className="fkb-profile__panel-title">
                Contact
              </h2>

              {hasContact || derived.addressLines.length > 0 ? (
                <ul className="fkb-contact-list">
                  {derived.phoneHref && (
                    <ContactItem icon={<Phone size={18} />} label="Phone">
                      <a href={derived.phoneHref}>{business.phone}</a>
                    </ContactItem>
                  )}

                  {derived.emailHref && (
                    <ContactItem icon={<Mail size={18} />} label="Email">
                      <a href={derived.emailHref}>{business.email}</a>
                    </ContactItem>
                  )}

                  {derived.destinations.websiteUrl && (
                    <ContactItem icon={<Globe size={18} />} label="Website">
                      <a
                        href={derived.destinations.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => void businessesApi.trackWebsiteClick(business.id)}
                      >
                        {getDisplayUrl(derived.destinations.websiteUrl)}
                      </a>
                    </ContactItem>
                  )}

                  {derived.addressLines.length > 0 && (
                    <ContactItem icon={<MapPin size={18} />} label="Address">
                      <address>
                        {derived.addressLines.map((line) => (
                          <span key={line}>{line}</span>
                        ))}
                      </address>
                      {derived.directionsUrl && (
                        <a
                          href={derived.directionsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="fkb-contact-list__sub-link"
                        >
                          Get directions
                          <span className="fkb-visually-hidden"> (opens Google Maps in a new tab)</span>
                        </a>
                      )}
                    </ContactItem>
                  )}
                </ul>
              ) : (
                <p className="fkb-muted">No contact details have been added yet.</p>
              )}

              {derived.socialLinks.length > 0 && (
                <div className="fkb-social" aria-label="Social media">
                  {derived.socialLinks.map((link) => (
                    <a
                      key={link.key}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="fkb-social__link"
                      aria-label={`${business.name} on ${link.label} (opens in a new tab)`}
                      title={link.label}
                    >
                      {SOCIAL_ICONS[link.key]}
                    </a>
                  ))}
                </div>
              )}
            </section>

            {(hasHours(business) || business.byAppointmentOnly) && (
              <section className="fkb-profile__panel" aria-labelledby="fkb-hours-title">
                <h2 id="fkb-hours-title" className="fkb-profile__panel-title">
                  Opening hours
                </h2>

                {business.byAppointmentOnly && (
                  <p className="fkb-profile__hours-note">
                    <CalendarClock size={16} aria-hidden="true" />
                    Visits are by appointment only.
                  </p>
                )}

                {hasHours(business) && (
                  <table className="fkb-hours">
                    <tbody>
                      {WEEKDAY_ORDER.map((day) => {
                        const entry = getHoursForDay(business.hours, day);

                        return (
                          <tr key={day}>
                            <th scope="row">{WEEKDAYS[day]}</th>
                            <td className={entry?.closed ? "fkb-hours__closed" : undefined}>
                              {formatHoursEntry(entry)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}

                {business.timeZone && (
                  <p className="fkb-muted fkb-profile__tz">Times shown in {business.timeZone.replace(/_/g, " ")}</p>
                )}
              </section>
            )}

            {(business.foundedYear || business.businessSize) && (
              <section className="fkb-profile__panel fkb-profile__facts" aria-label="Company facts">
                {business.foundedYear && (
                  <div>
                    <Building2 size={18} aria-hidden="true" />
                    <span>Founded {business.foundedYear}</span>
                  </div>
                )}
                {getBusinessSizeLabel(business.businessSize) && (
                  <div>
                    <Users size={18} aria-hidden="true" />
                    <span>{getBusinessSizeLabel(business.businessSize)}</span>
                  </div>
                )}
              </section>
            )}
          </aside>
        </div>

        {/* ==============================================================
            RELATED BUSINESSES
        ============================================================== */}

        {published && (
          <div className="fkb-section fkb-profile__related">
            <BusinessFeedRail
              title={`More in ${derived.category.label}`}
              description="Other businesses in the same category."
              category={business.category}
              excludeId={business.id}
              limit={8}
              hideWhenEmpty
            />
          </div>
        )}
      </div>

      <Toast message={toast} />
    </main>
  );
}


/* ============================================================================
   PIECES
============================================================================ */

function BackLink() {
  return (
    <Link to="/businesses" className="fkb-profile__back">
      <ArrowLeft size={16} aria-hidden="true" />
      All businesses
    </Link>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="fkb-profile__panel">
      <h2 className="fkb-profile__panel-title">{title}</h2>
      {children}
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) {
    return null;
  }

  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function ContactItem({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <li>
      <span className="fkb-contact-list__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="fkb-contact-list__body">
        <span className="fkb-contact-list__label">{label}</span>
        {children}
      </span>
    </li>
  );
}

function DealList({ deals }: { deals: Business["deals"] }) {
  return (
    <ul className="fkb-profile__deals">
      {deals.map((deal) => {
        const expiry = formatDealExpiry(deal.expiresAt);

        return (
          <li key={deal.id} className="fkb-offer">
            {deal.discount && <strong className="fkb-offer__discount">{deal.discount}</strong>}
            <span className="fkb-offer__title">
              <Tag size={14} aria-hidden="true" /> {deal.title}
            </span>
            {deal.description && <p className="fkb-offer__description">{deal.description}</p>}
            <div className="fkb-offer__footer">
              {expiry && (
                <span className="fkb-offer__expiry">
                  <Clock3 size={13} aria-hidden="true" />
                  {expiry}
                </span>
              )}
              {deal.couponCode && <CouponCode code={deal.couponCode} />}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function ProfileSkeleton() {
  return (
    <div role="status" aria-label="Loading business">
      <div className="fkb-skeleton" style={{ height: 18, width: 140, marginBottom: 20 }} />
      <div className="fkb-profile__hero">
        <div className="fkb-skeleton fkb-profile__cover-skeleton" />
        <div className="fkb-profile__hero-body">
          <div className="fkb-skeleton fkb-profile__logo-skeleton" />
          <div style={{ flex: 1, display: "grid", gap: 10 }}>
            <div className="fkb-skeleton" style={{ height: 14, width: 120 }} />
            <div className="fkb-skeleton" style={{ height: 30, width: "55%" }} />
            <div className="fkb-skeleton" style={{ height: 14, width: "35%" }} />
          </div>
        </div>
      </div>
      <div className="fkb-profile__layout">
        <div className="fkb-skeleton" style={{ height: 200, borderRadius: 16 }} />
        <div className="fkb-skeleton" style={{ height: 200, borderRadius: 16 }} />
      </div>
    </div>
  );
}
