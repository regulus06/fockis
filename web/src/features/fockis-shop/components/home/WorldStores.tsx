import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { listStores } from '../../services/storeApi';
import type { Store } from '../../types/store.types';
import { ShopLoading } from '../common/ShopLoading';
import { ShopError } from '../common/ShopError';

interface CountrySummary {
countryCode: string;
name: string;
flag: string;
count: number;
}

function countryCodeToFlag(countryCode: string): string {
const code = countryCode.trim().toUpperCase();

if (!/^[A-Z]{2}$/.test(code)) {
return '🌎';
}

const codePoints: number[] = [];

for (const character of code) {
codePoints.push(127397 + character.charCodeAt(0));
}

return String.fromCodePoint(...codePoints);
}

function getCountryName(store: Store): string {
return (
store.location?.country?.trim() ||
store.location?.countryCode?.trim().toUpperCase() ||
'Unknown'
);
}

function getCountryCode(store: Store): string {
return (
store.location?.countryCode?.trim().toUpperCase() ||
''
);
}

export function WorldStores() {
const [stores, setStores] = useState<Store[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
let mounted = true;

async function loadStores() {
  try {
    setLoading(true);
    setError(null);

    const result = await listStores({
      page: 1,
      pageSize: 100,
      sort: 'relevance',
    });

    if (!mounted) {
      return;
    }

    setStores(result.items);
  } catch (err) {
    if (!mounted) {
      return;
    }

    setError(
      err instanceof Error
        ? err.message
        : 'Unable to load international stores.',
    );
  } finally {
    if (mounted) {
      setLoading(false);
    }
  }
}

void loadStores();

return () => {
  mounted = false;
};

}, []);

const countries = useMemo(() => {
const countryMap: Map<string, CountrySummary> = new Map();

stores.forEach((store: Store) => {
  const countryCode = getCountryCode(store);

  if (!countryCode) {
    return;
  }

  const countryName = getCountryName(store);

  const existing = countryMap.get(countryCode);

  if (existing) {
    existing.count += 1;
    return;
  }

  const countrySummary: CountrySummary = {
    countryCode,
    name: countryName,
    flag: countryCodeToFlag(countryCode),
    count: 1,
  };

  countryMap.set(countryCode, countrySummary);
});

const result: CountrySummary[] = Array.from(
  countryMap.values(),
);

result.sort(
  (first: CountrySummary, second: CountrySummary) => {
    if (second.count !== first.count) {
      return second.count - first.count;
    }

    return first.name.localeCompare(second.name);
  },
);

return result.slice(0, 8);

}, [stores]);

return ( <section className="shaded"> <div className="wrap"> <div className="section-head"> <div> <div className="sec-label"> <span className="num">05</span>
INTERNATIONAL </div>

        <h2>Shop from around the world</h2>
      </div>

      <Link
        to="/shop/countries"
        className="section-link"
      >
        Explore all countries →
      </Link>
    </div>

    {loading && (
      <ShopLoading
        rows={1}
      />
    )}

    {!loading && error && (
      <ShopError message={error} />
    )}

    {!loading && !error && (
      <div className="world-strip">
        {countries.length === 0 ? (
          <div className="world-card">
            <div className="flag">🌎</div>
            <div className="name">
              International stores
            </div>
            <div className="count">
              No stores available yet
            </div>
          </div>
        ) : (
          countries.map((country) => (
            <Link
              to={`/shop/countries?country=${encodeURIComponent(
                country.countryCode,
              )}`}
              className="world-card"
              key={country.countryCode}
            >
              <div className="flag">
                {country.flag}
              </div>

              <div className="name">
                {country.name}
              </div>

              <div className="count">
                {country.count}{' '}
                {country.count === 1
                  ? 'store'
                  : 'stores'}
              </div>
            </Link>
          ))
        )}
      </div>
    )}
  </div>
</section>

);
}
