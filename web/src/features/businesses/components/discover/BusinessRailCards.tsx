import { ArrowRight, BadgeCheck, Building2, Check, ChevronRight, Flame, Megaphone, Plus, Store } from "lucide-react";
import { Link } from "react-router-dom";

import type { Business, BusinessCategory } from "../../types/business.types";
import {
  BUSINESS_MANAGER_ROUTE,
  CREATE_BUSINESS_ROUTE,
  getBusinessRoute,
  getCategoryLabel,
  getCategoryOption,
  getStatusLabel,
  isBusinessPublished,
  isBusinessVerified,
} from "../../utils/businessUtils";
import { BusinessLogo } from "../BusinessUi";
import { CATEGORY_TONES } from "./discoverUtils";

/* ============================================================================
   RIGHT RAIL
============================================================================ */

export function JoinBusinessCard() {
  return (
    <section className="fkbd-card fkbd-join">
      <div className="fkbd-join__top">
        <span className="fkbd-join__art" aria-hidden="true">
          <Store size={44} strokeWidth={1.6} />
        </span>
        <div>
          <h2>Own a Business? Join Fockis Businesses</h2>
          <ul>
            <li><Check size={15} strokeWidth={3} aria-hidden="true" /> Create your business page</li>
            <li><Check size={15} strokeWidth={3} aria-hidden="true" /> Showcase your products &amp; services</li>
            <li><Check size={15} strokeWidth={3} aria-hidden="true" /> Reach more customers</li>
            <li><Check size={15} strokeWidth={3} aria-hidden="true" /> Run promotions and ads</li>
          </ul>
        </div>
      </div>
      <Link to={CREATE_BUSINESS_ROUTE} className="fkbd-join__btn">
        <Plus size={18} aria-hidden="true" /> Add a Business
      </Link>
    </section>
  );
}

export function MyBusinessesCard({
  businesses,
  loading,
  signedIn,
}: {
  businesses: Business[];
  loading: boolean;
  signedIn: boolean;
}) {
  if (!signedIn) return null;

  return (
    <section className="fkbd-card" aria-labelledby="fkbd-mine-title">
      <header className="fkbd-card__head">
        <Building2 size={20} className="fkbd-card__icon" aria-hidden="true" />
        <h2 id="fkbd-mine-title">My Businesses</h2>
        <Link to={BUSINESS_MANAGER_ROUTE} className="fkbd-viewall fkbd-viewall--plain">
          Manage <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </header>

      {loading && businesses.length === 0 ? (
        <div className="fkbd-mine" aria-hidden="true">
          {[0, 1].map((key) => (
            <span key={key} className="fkbd-mine__item fkbd-mine__item--skeleton fkb-skeleton" />
          ))}
        </div>
      ) : businesses.length === 0 ? (
        <p className="fkbd-muted">
          You haven't added a business yet. <Link to={CREATE_BUSINESS_ROUTE}>Add one</Link> to get your own page.
        </p>
      ) : (
        <ul className="fkbd-mine">
          {businesses.slice(0, 3).map((business) => {
            const published = isBusinessPublished(business);

            return (
              <li key={business.id}>
                <Link to={published ? getBusinessRoute(business.id) : BUSINESS_MANAGER_ROUTE} className="fkbd-mine__item">
                  <BusinessLogo business={business} size={52} className="fkbd-mine__logo" />
                  <span className="fkbd-mine__text">
                    <strong>
                      <span className="fkbd-truncate">{business.name}</span>
                      {isBusinessVerified(business) && <BadgeCheck size={16} className="fkbd-verified" aria-label="Verified" />}
                    </strong>
                    <small>
                      {published
                        ? `${business.views.toLocaleString()} ${business.views === 1 ? "view" : "views"} · ${getCategoryLabel(business.category)}`
                        : getStatusLabel(business).label}
                    </small>
                  </span>
                  <ChevronRight size={18} aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function TrendingCategoriesCard({
  counts,
  complete,
  onSelect,
}: {
  counts: Array<{ category: BusinessCategory; count: number }>;
  /** True when the counts cover the whole directory (sample < API page cap). */
  complete: boolean;
  onSelect: (category: BusinessCategory) => void;
}) {
  if (counts.length === 0) return null;

  return (
    <section className="fkbd-card" aria-labelledby="fkbd-trending-title">
      <header className="fkbd-card__head">
        <Flame size={20} className="fkbd-card__icon fkbd-card__icon--hot" fill="currentColor" aria-hidden="true" />
        <h2 id="fkbd-trending-title">Trending Categories</h2>
      </header>

      <ul className="fkbd-trend">
        {counts.slice(0, 5).map(({ category, count }) => {
          const option = getCategoryOption(category);

          return (
            <li key={category}>
              <button type="button" onClick={() => onSelect(category)}>
                <span className="fkbd-trend__icon" style={{ ["--tone" as string]: CATEGORY_TONES[category] }}>
                  <option.icon size={16} aria-hidden="true" />
                </span>
                <strong>{option.label}</strong>
                <small>
                  {count.toLocaleString()}
                  {complete ? "" : "+"} {count === 1 ? "business" : "businesses"}
                </small>
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function PromoteBusinessCard() {
  return (
    <section className="fkbd-promo">
      <Megaphone size={54} strokeWidth={1.5} className="fkbd-promo__icon" aria-hidden="true" />
      <div>
        <h2>Promote Your Business</h2>
        <p>Reach more people on Fockis with powerful promotion tools.</p>
        <Link to="/ads" className="fkbd-promo__btn">
          Promote Now <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>
      <span className="fkbd-promo__bars" aria-hidden="true">
        <i /> <i /> <i /> <i />
      </span>
    </section>
  );
}
