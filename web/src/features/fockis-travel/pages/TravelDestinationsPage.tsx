import { useEffect, useMemo, useState } from 'react';
import DestinationCard from '../components/DestinationCard';
import CategoryTabs from '../components/CategoryTabs';
import '../styles/TravelDestinationsPage.scss';

interface TravelListing {
  _id?: string;
  id?: string;
  name?: string;
  type?: string;
  country?: string;
  city?: string;
  images?: string[];
  image?: string;
  active?: boolean;
}

interface Destination {
  slug: string;
  name: string;
  flag: string;
  region: string;
  count: string;
  image: string;
  trending?: boolean;
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:3000';

const REGIONS = [
  { id: 'all', label: 'All regions' },
  { id: 'caribbean', label: 'Caribbean' },
  { id: 'americas', label: 'Americas' },
  { id: 'europe', label: 'Europe' },
  { id: 'asia-pacific', label: 'Asia-Pacific' },
];

const COUNTRY_META: Record<
  string,
  {
    name: string;
    flag: string;
    region: string;
    image: string;
  }
> = {
  haiti: {
    name: 'Haiti',
    flag: '🇭🇹',
    region: 'caribbean',
    image:
      'https://images.unsplash.com/photo-1502301103665-0b95cc738daa?w=800',
  },
  'dominican republic': {
    name: 'Dominican Republic',
    flag: '🇩🇴',
    region: 'caribbean',
    image:
      'https://images.unsplash.com/photo-1518638150340-f706e86654de?w=800',
  },
  mexico: {
    name: 'Mexico',
    flag: '🇲🇽',
    region: 'americas',
    image:
      'https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?w=800',
  },
  brazil: {
    name: 'Brazil',
    flag: '🇧🇷',
    region: 'americas',
    image:
      'https://images.unsplash.com/photo-1516306580123-e6e52b1b7b5f?w=800',
  },
  'united states': {
    name: 'United States',
    flag: '🇺🇸',
    region: 'americas',
    image:
      'https://images.unsplash.com/photo-1500916434205-0c77489c6cf7?w=800',
  },
  france: {
    name: 'France',
    flag: '🇫🇷',
    region: 'europe',
    image:
      'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800',
  },
  japan: {
    name: 'Japan',
    flag: '🇯🇵',
    region: 'asia-pacific',
    image:
      'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=800',
  },
  australia: {
    name: 'Australia',
    flag: '🇦🇺',
    region: 'asia-pacific',
    image:
      'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=800',
  },
  canada: {
    name: 'Canada',
    flag: '🇨🇦',
    region: 'americas',
    image:
      'https://images.unsplash.com/photo-1503614472-8c93d56c6f4b?w=800',
  },
  'united kingdom': {
    name: 'United Kingdom',
    flag: '🇬🇧',
    region: 'europe',
    image:
      'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800',
  },
  italy: {
    name: 'Italy',
    flag: '🇮🇹',
    region: 'europe',
    image:
      'https://images.unsplash.com/photo-1529260830199-42c24126f198?w=800',
  },
  spain: {
    name: 'Spain',
    flag: '🇪🇸',
    region: 'europe',
    image:
      'https://images.unsplash.com/photo-1506377585622-bedcbb027afc?w=800',
  },
  portugal: {
    name: 'Portugal',
    flag: '🇵🇹',
    region: 'europe',
    image:
      'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=800',
  },
  'south korea': {
    name: 'South Korea',
    flag: '🇰🇷',
    region: 'asia-pacific',
    image:
      'https://images.unsplash.com/photo-1538485399081-7c8972a2d9d4?w=800',
  },
  thailand: {
    name: 'Thailand',
    flag: '🇹🇭',
    region: 'asia-pacific',
    image:
      'https://images.unsplash.com/photo-1528181304800-259b08848526?w=800',
  },
};

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1488085061387-422e29b40080?w=800';

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeCountry(value: string): string {
  return value.trim().toLowerCase();
}

function getCountryMeta(country: string) {
  const normalized = normalizeCountry(country);

  return (
    COUNTRY_META[normalized] || {
      name: country.trim(),
      flag: '🌎',
      region: 'americas',
      image: FALLBACK_IMAGE,
    }
  );
}

function getListingImage(listing: TravelListing, fallback: string): string {
  if (listing.images && listing.images.length > 0 && listing.images[0]) {
    return listing.images[0];
  }

  if (listing.image) {
    return listing.image;
  }

  return fallback;
}

function buildDestinations(listings: TravelListing[]): Destination[] {
  const grouped = new Map<string, TravelListing[]>();

  for (const listing of listings) {
    if (!listing.country) continue;

    const key = normalizeCountry(listing.country);

    if (!grouped.has(key)) {
      grouped.set(key, []);
    }

    grouped.get(key)!.push(listing);
  }

  const destinations: Destination[] = [];

  for (const [countryKey, countryListings] of grouped.entries()) {
    const country = countryListings[0]?.country?.trim();

    if (!country) continue;

    const meta = getCountryMeta(country);

    const customImage = countryListings.find(
      (listing) =>
        Array.isArray(listing.images) && listing.images.length > 0
    );

    const image = customImage
      ? getListingImage(customImage, meta.image)
      : meta.image;

    destinations.push({
      slug: slugify(country),
      name: meta.name,
      flag: meta.flag,
      region: meta.region,
      count: `${countryListings.length.toLocaleString()} ${
        countryListings.length === 1 ? 'stay' : 'stays'
      }`,
      image,
      trending: countryListings.length >= 5,
    });
  }

  return destinations.sort((a, b) => {
    const countA = Number(a.count.replace(/[^0-9]/g, '')) || 0;
    const countB = Number(b.count.replace(/[^0-9]/g, '')) || 0;

    return countB - countA;
  });
}

/**
 * Destination discovery page connected to the Fockis Travel backend.
 *
 * Backend endpoint:
 * GET /travel/listings
 *
 * Destinations are generated from the countries that actually exist
 * in the Listing collection.
 */
export default function TravelDestinationsPage() {
  const [region, setRegion] = useState('all');
  const [query, setQuery] = useState('');

  const [listings, setListings] = useState<TravelListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadListings() {
      try {
        setLoading(true);
        setError('');

        const response = await fetch(
          `${API_BASE_URL}/travel/listings?limit=100`
        );

        if (!response.ok) {
          throw new Error(
            `Unable to load travel listings (${response.status})`
          );
        }

        const data = await response.json();

        const items = Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
            ? data.items
            : [];

        if (!cancelled) {
          setListings(items);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Travel destinations API error:', err);

          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load destinations.'
          );

          setListings([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadListings();

    return () => {
      cancelled = true;
    };
  }, []);

  const destinations = useMemo(
    () => buildDestinations(listings),
    [listings]
  );

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return destinations.filter((destination) => {
      const matchesRegion =
        region === 'all' || destination.region === region;

      const matchesQuery =
        !normalizedQuery ||
        destination.name.toLowerCase().includes(normalizedQuery) ||
        destination.slug.includes(normalizedQuery);

      return matchesRegion && matchesQuery;
    });
  }, [destinations, region, query]);

  const trending = useMemo(() => {
    return destinations
      .filter((destination) => destination.trending)
      .slice(0, 8);
  }, [destinations]);

  return (
    <div className="travel-destinations-page">
      <section className="tight">
        <div className="wrap">
          <div className="destinations-hero">
            <div
              className="eyebrow"
              style={{
                justifyContent: 'center',
                color: 'var(--amber, #E8A33D)',
              }}
            >
              Destinations
            </div>

            <h1>Where to next?</h1>

            <p>
              Explore destinations based on real Fockis Travel listings.
              Search for a country or destination.
            </p>

            <div
              className="ft-field"
              style={{ maxWidth: 420, margin: '20px auto 0' }}
            >
              <label
                htmlFor="dest-search"
                className="ft-hide-mobile"
                style={{ color: 'rgba(250,246,238,0.6)' }}
              >
                Search destinations
              </label>

              <input
                id="dest-search"
                type="text"
                placeholder="Try 'Japan' or 'Port-au-Prince'"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </section>

      {loading ? (
        <section className="tight">
          <div className="wrap">
            <div className="ft-empty-state">
              <div className="ic" aria-hidden="true">
                🌎
              </div>

              <h4>Loading destinations...</h4>

              <p>
                We're connecting to Fockis Travel and loading available
                destinations.
              </p>
            </div>
          </div>
        </section>
      ) : error ? (
        <section className="tight">
          <div className="wrap">
            <div className="ft-empty-state">
              <div className="ic" aria-hidden="true">
                ⚠️
              </div>

              <h4>Unable to load destinations</h4>

              <p>{error}</p>

              <button
                type="button"
                className="btn btn-primary"
                style={{ marginTop: 16 }}
                onClick={() => window.location.reload()}
              >
                Try again
              </button>
            </div>
          </div>
        </section>
      ) : (
        <>
          {trending.length > 0 && (
            <section className="tight">
              <div className="wrap">
                <div className="section-head">
                  <div>
                    <div className="eyebrow">Trending</div>
                    <h2>Trending destinations</h2>
                  </div>
                </div>

                <div className="ft-scroll-x">
                  {trending.map((destination) => (
                    <DestinationCard
                      key={destination.slug}
                      {...destination}
                      wide
                    />
                  ))}
                </div>
              </div>
            </section>
          )}

          <section>
            <div className="wrap">
              <div className="section-head">
                <div>
                  <div className="eyebrow">Browse by region</div>
                  <h2>All destinations</h2>
                </div>
              </div>

              <div className="region-tabs">
                <CategoryTabs
                  categories={REGIONS}
                  activeId={region}
                  onChange={setRegion}
                  bordered
                />
              </div>

              {filtered.length === 0 ? (
                <div className="ft-empty-state">
                  <div className="ic" aria-hidden="true">
                    🗺️
                  </div>

                  <h4>No destinations found</h4>

                  <p>
                    {destinations.length === 0
                      ? 'There are currently no active travel listings.'
                      : 'Try a different search term or region.'}
                  </p>
                </div>
              ) : (
                <div className="destination-grid">
                  {filtered.map((destination) => (
                    <DestinationCard
                      key={destination.slug}
                      {...destination}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}