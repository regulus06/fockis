import {
useEffect,
useMemo,
useState,
} from "react";

import { Link } from "react-router-dom";

import { ShopHeader } from "../components/common/ShopHeader";
import { ShopFooter } from "../components/common/ShopFooter";
import { ShopBreadcrumbs } from "../components/common/ShopBreadcrumbs";
import { ShopLoading } from "../components/common/ShopLoading";
import { ShopError } from "../components/common/ShopError";

import { useShop } from "../hooks/useShop";
import { listStores } from "../services/storeApi";

import type { Store } from "../types/store.types";

interface CountrySummary {
country: string;
countryCode: string;
flag: string;
count: number;
}

function countryCodeToFlag(
countryCode: string,
): string {
const code = countryCode
.trim()
.toUpperCase();

if (!/^[A-Z]{2}$/.test(code)) {
return "🌎";
}

const codePoints: number[] = [];

for (const character of code) {
codePoints.push(
127397 + character.charCodeAt(0),
);
}

return String.fromCodePoint(...codePoints);
}

export default function ShopCountriesPage() {
const { setDeliverTo } = useShop();

const [stores, setStores] = useState<Store[]>(
[],
);

const [loading, setLoading] =
useState<boolean>(true);

const [error, setError] = useState<
string | null

> (null);

useEffect(() => {
let cancelled = false;

async function loadStores(): Promise<void> {
  try {
    setLoading(true);
    setError(null);

    const result = await listStores({
      page: 1,
      pageSize: 100,
    });

    if (cancelled) {
      return;
    }

    setStores(result.items);
  } catch (err: unknown) {
    if (cancelled) {
      return;
    }

    if (err instanceof Error) {
      setError(err.message);
    } else {
      setError(
        "Unable to load international stores.",
      );
    }
  } finally {
    if (!cancelled) {
      setLoading(false);
    }
  }
}

void loadStores();

return () => {
  cancelled = true;
};

}, []);

const countries = useMemo(() => {
const countryMap: Map<
string,
CountrySummary
> = new Map();

stores.forEach((store: Store) => {
  const country =
    store.location?.country?.trim();

  const countryCode =
    store.location?.countryCode
      ?.trim()
      .toUpperCase();

  if (!country || !countryCode) {
    return;
  }

  const existing =
    countryMap.get(countryCode);

  if (existing) {
    existing.count += 1;
    return;
  }

  const countrySummary: CountrySummary = {
    country,
    countryCode,
    flag: countryCodeToFlag(
      countryCode,
    ),
    count: 1,
  };

  countryMap.set(
    countryCode,
    countrySummary,
  );
});

const result: CountrySummary[] =
  Array.from(countryMap.values());

result.sort(
  (
    first: CountrySummary,
    second: CountrySummary,
  ) => {
    if (
      second.count !== first.count
    ) {
      return (
        second.count - first.count
      );
    }

    return first.country.localeCompare(
      second.country,
    );
  },
);

return result;

}, [stores]);

function handleCountrySelect(
country: CountrySummary,
): void {
setDeliverTo(
country.countryCode,
`${country.flag} ${country.country}`,
);
}

return ( <div className="shop-page-root"> <ShopHeader />

```
  <div
    className="wrap"
    style={{
      paddingTop: 32,
    }}
  >
    <ShopBreadcrumbs
      items={[
        {
          label: "Shop",
          to: "/shop",
        },
        {
          label: "International",
        },
      ]}
    />
  </div>

  <section className="tight">
    <div className="wrap">
      <div className="section-head">
        <div>
          <div className="sec-label">
            <span className="num">
              01
            </span>
            INTERNATIONAL
          </div>

          <h1>
            Shop from around the world
          </h1>

          <p>
            Choose a country to browse
            stores that ship there, or set
            it as your delivery destination.
          </p>
        </div>
      </div>

      {loading ? (
        <ShopLoading
          label="Loading international stores…"
          rows={4}
        />
      ) : error ? (
        <ShopError message={error} />
      ) : countries.length === 0 ? (
        <div
          className="world-strip"
          style={{
            overflow: "visible",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              width: "100%",
              padding: "40px 20px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 42,
                marginBottom: 12,
              }}
            >
              🌎
            </div>

            <h2>
              No international stores yet
            </h2>

            <p>
              Stores will appear here as
              sellers become available.
            </p>
          </div>
        </div>
      ) : (
        <div
          className="world-strip"
          style={{
            overflow: "visible",
            flexWrap: "wrap",
          }}
        >
          {countries.map(
            (
              country: CountrySummary,
            ) => (
              <button
                key={country.countryCode}
                type="button"
                className="world-card"
                onClick={() =>
                  handleCountrySelect(
                    country,
                  )
                }
                style={{
                  cursor: "pointer",
                }}
                aria-label={`Set delivery destination to ${country.country}`}
              >
                <div className="flag">
                  {country.flag}
                </div>

                <div className="name">
                  {country.country}
                </div>

                <div className="count">
                  {country.count}{" "}
                  {country.count === 1
                    ? "store"
                    : "stores"}
                </div>
              </button>
            ),
          )}
        </div>
      )}

      <div
        style={{
          marginTop: 30,
        }}
      >
        <Link
          to="/shop/stores"
          className="section-link"
        >
          Browse all stores →
        </Link>
      </div>
    </div>
  </section>

  <ShopFooter />
</div>

);
}
