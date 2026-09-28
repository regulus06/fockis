import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import CategoryTabs, { type CategoryTabItem } from './CategoryTabs';

export interface TravelSearchProps {
  categories?: CategoryTabItem[];
  defaultCategory?: string;
  variant?: 'panel' | 'inline';
  className?: string;
}

const DEFAULT_CATEGORIES: CategoryTabItem[] = [
  { id: 'stays', label: '🏨 Stays' },
  { id: 'rentals', label: '🏠 Vacation Rentals' },
  { id: 'restaurants', label: '🍽️ Restaurants' },
  { id: 'cars', label: '🚗 Cars' },
  { id: 'experiences', label: '🏝️ Experiences' },
  { id: 'meetings', label: '💼 Meetings' },
];

/**
 * Reusable travel search form. Used as the hero panel on the homepage and
 * as an inline search bar on TravelSearchPage / category pages.
 * Submitting navigates to /travel/search with the query captured in the URL.
 */
export default function TravelSearch({
  categories = DEFAULT_CATEGORIES,
  defaultCategory = DEFAULT_CATEGORIES[0].id,
  variant = 'panel',
  className = '',
}: TravelSearchProps) {
  const navigate = useNavigate();
  const [category, setCategory] = useState(defaultCategory);
  const [destination, setDestination] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState('2 guests · 1 room');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams({
      category,
      destination,
      checkIn,
      checkOut,
      guests,
    });
    navigate(`/travel/search?${params.toString()}`);
  }

  return (
    <form
      className={`travel-search travel-search--${variant} ${className}`.trim()}
      onSubmit={handleSubmit}
    >
      <CategoryTabs categories={categories} activeId={category} onChange={setCategory} />

      <div className="search-fields">
        <label className="field">
          <label htmlFor="ft-destination">Where are you going?</label>
          <input
            id="ft-destination"
            className="value"
            type="text"
            placeholder="Search destinations"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          />
        </label>

        <label className="field">
          <label htmlFor="ft-checkin">Check-in</label>
          <input id="ft-checkin" className="value" type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
        </label>

        <label className="field">
          <label htmlFor="ft-checkout">Check-out</label>
          <input id="ft-checkout" className="value" type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
        </label>

        <label className="field">
          <label htmlFor="ft-guests">Guests · Rooms</label>
          <input id="ft-guests" className="value" type="text" value={guests} onChange={(e) => setGuests(e.target.value)} />
        </label>

        <button type="submit" className="search-submit">
          <Search size={15} aria-hidden="true" /> Search
        </button>
      </div>
    </form>
  );
}
