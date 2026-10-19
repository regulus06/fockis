import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { ShopHeader } from "../components/common/ShopHeader";
import { ShopFooter } from "../components/common/ShopFooter";
import { ShopBreadcrumbs } from "../components/common/ShopBreadcrumbs";
import { ShopLoading } from "../components/common/ShopLoading";
import { ShopError } from "../components/common/ShopError";
import { ShopEmptyState } from "../components/common/ShopEmptyState";

import { useShop } from "../hooks/useShop";
import { listStores } from "../services/storeApi";

import type { Store } from "../types/store.types";

interface CountrySummary {
  country: string;
  countryCode: string;
  flag: string;
  count: number;
}

function countryCodeToFlag(countryCode: string): string {
  const code = countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return "🌎";
  return String.fromCodePoint(...[...code].map((c) => 127397 + c.charCodeAt(0)));
}

export default function ShopCountriesPage() {
  const { deliverToCountryCode, setDeliverTo } = useShop();

  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadStores(): Promise<void> {
      try {
        setLoading(true);
        setError(null);
        const result = await listStores({ page: 1, pageSize: 100 });
        if (!cancelled) setStores(result.items);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load international stores.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadStores();

    return () => {
      cancelled = true;
    };
  }, []);

  const countries = useMemo(() => {
    const map = new Map<string, CountrySummary>();

    for (const store of stores) {
      const country = store.location?.country?.trim();
      const countryCode = store.location?.countryCode?.trim().toUpperCase();
      if (!country || !countryCode) continue;

      const existing = map.get(countryCode);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(countryCode, {
          country,
          countryCode,
          flag: countryCodeToFlag(countryCode),
          count: 1,
        });
      }
    }

    return Array.from(map.values()).sort(
      (a, b) => b.count - a.count || a.country.localeCompare(b.country),
    );
  }, [stores]);

  return (
    <div className="shop-page-root fk-shop">
      <ShopHeader />

      <main className="fk-container fk-page">
        <ShopBreadcrumbs items={[{ label: "Shop", to: "/shop" }, { label: "International" }]} />

        <div className="fk-page__head">
          <div>
            <h1>Shop from around the world</h1>
            <p>
              Pick a country to set it as your delivery destination. Stores are
              grouped by the country they sell from.
            </p>
          </div>

          <Link to="/shop/stores?location=international" className="fk-btn fk-btn--outline">
            International stores
          </Link>
        </div>

        {loading ? (
          <ShopLoading label="Loading countries…" rows={3} />
        ) : error ? (
          <ShopError message={error} />
        ) : countries.length === 0 ? (
          <ShopEmptyState
            icon="🌎"
            title="No international stores yet"
            message="Countries appear here as sellers in different countries open stores."
            action={
              <Link to="/shop/stores" className="fk-btn fk-btn--cart">
                Browse all stores
              </Link>
            }
          />
        ) : (
          <div className="fk-countries">
            {countries.map((country) => {
              const active = deliverToCountryCode === country.countryCode;
              return (
                <button
                  key={country.countryCode}
                  type="button"
                  className={active ? "fk-country is-active" : "fk-country"}
                  aria-pressed={active}
                  onClick={() =>
                    setDeliverTo(country.countryCode, `${country.flag} ${country.country}`)
                  }
                >
                  <span className="flag" aria-hidden="true">{country.flag}</span>
                  <span className="name">{country.country}</span>
                  <span className="count">
                    {country.count} {country.count === 1 ? "store" : "stores"}
                  </span>
                  <span className="state">{active ? "✓ Delivering here" : "Deliver here"}</span>
                </button>
              );
            })}
          </div>
        )}
      </main>

      <ShopFooter />
    </div>
  );
}
