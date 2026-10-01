import { FOCKIS_API_URL } from "../../../config/fockisConfig";

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ExperienceCard from '../components/ExperienceCard';
import CategoryTabs from '../components/CategoryTabs';
import '../styles/TravelExperiencesPage.scss';
interface TravelListing {
  _id?: string;
  id?: string;
  name: string;
  type: string;
  description?: string;
  country?: string;
  city?: string;
  address?: string;
  images?: string[];
  amenities?: string[];
  tags?: string[];
  rating?: number;
  reviewCount?: number;
  currency?: string;
  price?: number;
  priceUnit?: string;
  active?: boolean;
  metadata?: Record<string, unknown>;
}

interface Experience {
  id: string;
  name: string;
  duration: string;
  category: string;
  image: string;
  price: number;
  currency: string;
  rating: number;
}

const EXP_CATEGORIES = [
  { id: 'all', label: 'All experiences' },
  { id: 'culture', label: 'Culture & history' },
  { id: 'nature', label: 'Nature & adventure' },
  { id: 'food', label: 'Food & drink' },
  { id: 'water', label: 'Water & boat' },
];

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  FOCKIS_API_URL;

function getCategory(listing: TravelListing): string {
  const tags = listing.tags ?? [];

  const knownCategory = tags.find((tag) =>
    EXP_CATEGORIES.some(
      (category) => category.id === tag.toLowerCase()
    )
  );

  if (knownCategory) {
    return knownCategory.toLowerCase();
  }

  const text = [
    listing.name,
    listing.description,
    ...(listing.tags ?? []),
    ...(listing.amenities ?? []),
  ]
    .join(' ')
    .toLowerCase();

  if (
    text.includes('museum') ||
    text.includes('history') ||
    text.includes('culture') ||
    text.includes('citadel') ||
    text.includes('heritage')
  ) {
    return 'culture';
  }

  if (
    text.includes('mountain') ||
    text.includes('hiking') ||
    text.includes('hike') ||
    text.includes('adventure') ||
    text.includes('nature') ||
    text.includes('kayak')
  ) {
    return 'nature';
  }

  if (
    text.includes('food') ||
    text.includes('restaurant') ||
    text.includes('cooking') ||
    text.includes('drink') ||
    text.includes('culinary')
  ) {
    return 'food';
  }

  if (
    text.includes('boat') ||
    text.includes('beach') ||
    text.includes('island') ||
    text.includes('ocean') ||
    text.includes('water') ||
    text.includes('snorkel')
  ) {
    return 'water';
  }

  return 'nature';
}

function getDuration(listing: TravelListing): string {
  const metadata = listing.metadata ?? {};

  if (typeof metadata.duration === 'string') {
    return metadata.duration;
  }

  if (typeof metadata.durationHours === 'number') {
    const hours = metadata.durationHours;

    if (hours >= 6) {
      return 'FULL-DAY';
    }

    if (hours >= 3) {
      return `${hours} HOURS`;
    }

    return `${hours} HOUR${hours === 1 ? '' : 'S'}`;
  }

  if (typeof listing.priceUnit === 'string') {
    const unit = listing.priceUnit.toLowerCase();

    if (unit.includes('day')) {
      return 'FULL-DAY';
    }

    if (unit.includes('hour')) {
      return 'HOURS';
    }
  }

  return 'EXPERIENCE';
}

function getImage(listing: TravelListing): string {
  return (
    listing.images?.[0] ||
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=700'
  );
}

function mapListingToExperience(
  listing: TravelListing
): Experience {
  return {
    id: listing._id || listing.id || '',
    name: listing.name,
    duration: getDuration(listing),
    category: getCategory(listing),
    image: getImage(listing),
    price: Number(listing.price ?? 0),
    currency: listing.currency || '$',
    rating: Number(listing.rating ?? 0),
  };
}

/**
 * Experience marketplace:
 * tours, culture, food and adventure led by local guides.
 *
 * Loads experiences from:
 * GET /travel/listings?type=experience
 */
export default function TravelExperiencesPage() {
  const navigate = useNavigate();

  const [category, setCategory] = useState('all');
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadExperiences() {
      try {
        setLoading(true);
        setError('');

        const response = await fetch(
          `${API_BASE_URL}/travel/listings?type=experience`
        );

        if (!response.ok) {
          throw new Error(
            `Failed to load experiences (${response.status})`
          );
        }

        const data = await response.json();

        const listings: TravelListing[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
            ? data.items
            : [];

        const mappedExperiences = listings
          .filter((listing) => listing.active !== false)
          .map(mapListingToExperience)
          .filter((experience) => experience.id);

        if (!cancelled) {
          setExperiences(mappedExperiences);
        }
      } catch (err) {
        if (!cancelled) {
          console.error(
            'Failed to load travel experiences:',
            err
          );

          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load experiences.'
          );

          setExperiences([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadExperiences();

    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (category === 'all') {
      return experiences;
    }

    return experiences.filter(
      (experience) => experience.category === category
    );
  }, [experiences, category]);

  function handleExperienceSelect(id: string) {
    navigate(`/travel/trip-planner?experience=${encodeURIComponent(id)}`);
  }

  return (
    <div className="travel-experiences-page">
      <section className="tight">
        <div className="wrap">
          <div className="eyebrow">Experiences</div>

          <h1
            style={{
              fontSize: 'clamp(28px, 4vw, 42px)',
            }}
          >
            Discover experiences
          </h1>

          <p
            style={{
              color: 'var(--slate, #5B6B76)',
              marginTop: 10,
              maxWidth: 480,
            }}
          >
            Tours, culture, food and adventure — led by local
            guides.
          </p>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="category-filter-row">
            <CategoryTabs
              categories={EXP_CATEGORIES}
              activeId={category}
              onChange={setCategory}
              bordered
            />
          </div>

          {loading && (
            <div className="ft-empty-state">
              <div className="ic" aria-hidden="true">
                🏝️
              </div>

              <h4>Loading experiences...</h4>

              <p>
                Finding tours and activities available through
                Fockis Travel.
              </p>
            </div>
          )}

          {!loading && error && (
            <div className="ft-empty-state">
              <div className="ic" aria-hidden="true">
                ⚠️
              </div>

              <h4>Unable to load experiences</h4>

              <p>{error}</p>

              <button
                type="button"
                className="btn btn-outline"
                onClick={() => window.location.reload()}
              >
                Try again
              </button>
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="ft-empty-state">
              <div className="ic" aria-hidden="true">
                🏝️
              </div>

              <h4>
                {experiences.length === 0
                  ? 'No experiences available yet'
                  : 'No experiences in this category'}
              </h4>

              <p>
                {experiences.length === 0
                  ? 'Experience listings created in the Fockis Travel backend will appear here.'
                  : 'Try another category or browse all experiences.'}
              </p>

              {category !== 'all' && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setCategory('all')}
                >
                  View all experiences
                </button>
              )}
            </div>
          )}

          {!loading && !error && filtered.length > 0 && (
            <div className="exp-grid">
              {filtered.map((experience) => (
                <ExperienceCard
                  key={experience.id}
                  id={experience.id}
                  name={experience.name}
                  duration={experience.duration}
                  image={experience.image}
                  price={experience.price}
                  currency={experience.currency}
                  rating={experience.rating}
                  onSelect={handleExperienceSelect}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}