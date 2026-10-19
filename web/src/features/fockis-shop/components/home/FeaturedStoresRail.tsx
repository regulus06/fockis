import { useState } from "react";
import { Link } from "react-router-dom";

import { useStores } from "../../hooks/useStores";
import { Rail } from "../common/Rail";
import { ShopError } from "../common/ShopError";
import { ShopEmptyState } from "../common/ShopEmptyState";
import { StoreCard } from "../stores/StoreCard";
import type { Store } from "../../types/store.types";
import { resolveProductImageUrl } from "../../utils/productImage";

function prettify(value: string): string {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\band\b/gi, "&")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/** Small logo tile: logo · name · what the store sells. */
function StoreLogoTile({ store }: { store: Store }) {
  const [failed, setFailed] = useState(false);
  const logo = store.logoUrl ? resolveProductImageUrl(store.logoUrl) : "";
  const subtitle =
    store.categories?.length > 0
      ? store.categories.slice(0, 2).map(prettify).join(" & ")
      : store.location?.country || "";

  return (
    <Link to={`/shop/store/${store.slug}`} className="fk-storelogo" role="listitem">
      <span className="fk-storelogo__mark">
        {logo && !failed ? (
          <img src={logo} alt="" loading="lazy" onError={() => setFailed(true)} />
        ) : (
          <span aria-hidden="true">{store.emoji ?? "🏪"}</span>
        )}
      </span>
      <strong>{store.name}</strong>
      {subtitle && <small>{subtitle}</small>}
    </Link>
  );
}

/** Featured stores as a horizontal rail, from the real stores API. */
export function FeaturedStoresRail({
  title = "Featured stores",
  location,
  seeAllTo = "/shop/stores",
  variant = "cards",
}: {
  title?: string;
  location?: "local" | "national" | "international" | "all";
  seeAllTo?: string;
  /** "logos" = compact logo tiles (homepage), "cards" = full store cards. */
  variant?: "cards" | "logos";
}) {
  const { data, loading, error } = useStores({
    sort: "rating",
    page: 1,
    pageSize: 12,
    ...(location ? { location } : {}),
  });

  const stores = data?.items ?? [];

  return (
    <section className={`fk-section fk-stores-section fk-stores-section--${variant}`} aria-label={title}>
      <div className="fk-section__head">
        <div>
          <h2>{title}</h2>
          <p>Independent sellers and businesses on Fockis</p>
        </div>
        <Link to={seeAllTo} className="fk-section__link">
          See all stores <span aria-hidden="true">›</span>
        </Link>
      </div>

      {loading ? (
        <div className="rail-wrap">
          <div className="rail-scroll">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="fk-store-slot" aria-hidden="true">
                <div className="store-card">
                  <div className="banner fk-skel" />
                  <div className="body">
                    <div className="fk-skel fk-skel--line" />
                    <div className="fk-skel fk-skel--line fk-skel--short" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        <ShopError title="Stores couldn’t load" message={error} />
      ) : stores.length === 0 ? (
        <ShopEmptyState
          compact
          icon="🏪"
          title="No stores yet"
          message="Stores appear here as sellers open their storefronts."
          action={
            <Link to="/shop/sell" className="fk-btn fk-btn--cart">
              Open a store
            </Link>
          }
        />
      ) : variant === "logos" ? (
        <Rail ariaLabel={title} className="fk-storelogos">
          {stores.map((store) => (
            <StoreLogoTile key={store.id} store={store} />
          ))}
        </Rail>
      ) : (
        <Rail ariaLabel={title}>
          {stores.map((store) => (
            <div key={store.id} className="fk-store-slot" role="listitem">
              <StoreCard store={store} />
            </div>
          ))}
        </Rail>
      )}
    </section>
  );
}
