import { useEffect, useMemo, useState } from 'react';
import TransferCard from '../components/TransferCard';
import '../styles/TravelTransfersPage.scss';

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

interface TransferOption {
  id: string;
  name: string;
  icon: string;
  meta: string;
  price: number;
  currency: string;
}

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:3000';

function getTransferIcon(listing: TravelListing): string {
  const metadata = listing.metadata ?? {};

  if (typeof metadata.icon === 'string') {
    return metadata.icon;
  }

  const text = [
    listing.name,
    listing.description,
    ...(listing.tags ?? []),
  ]
    .join(' ')
    .toLowerCase();

  if (text.includes('van')) {
    return '🚐';
  }

  if (text.includes('shuttle') || text.includes('bus')) {
    return '🚌';
  }

  if (
    text.includes('driver') ||
    text.includes('chauffeur')
  ) {
    return '🧑‍✈️';
  }

  if (
    text.includes('suv') ||
    text.includes('4x4')
  ) {
    return '🚙';
  }

  return '🚘';
}

function getTransferMeta(listing: TravelListing): string {
  const metadata = listing.metadata ?? {};

  if (typeof metadata.meta === 'string') {
    return metadata.meta;
  }

  if (typeof metadata.capacity === 'number') {
    return `Up to ${metadata.capacity} passengers`;
  }

  if (typeof metadata.passengers === 'number') {
    return `Up to ${metadata.passengers} passengers`;
  }

  if (listing.description) {
    return listing.description;
  }

  if (listing.amenities?.length) {
    return listing.amenities.join(' · ');
  }

  return 'Private transportation';
}

function mapListingToTransfer(
  listing: TravelListing
): TransferOption {
  return {
    id: listing._id || listing.id || '',
    name: listing.name,
    icon: getTransferIcon(listing),
    meta: getTransferMeta(listing),
    price: Number(listing.price ?? 0),
    currency: listing.currency || '$',
  };
}

/**
 * Airport / ground transportation booking page.
 *
 * Loads transfer options from:
 * GET /travel/listings?type=transfer
 */
export default function TravelTransfersPage() {
  const [pickup, setPickup] = useState(
    'Toussaint Louverture Intl. (PAP)'
  );

  const [dropoff, setDropoff] = useState(
    'Hotel in Pétion-Ville'
  );

  const [dateTime, setDateTime] = useState('');
  const [passengers, setPassengers] = useState(2);

  const [transfers, setTransfers] = useState<TransferOption[]>(
    []
  );

  const [selectedType, setSelectedType] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadTransfers() {
      try {
        setLoading(true);
        setError('');

        const response = await fetch(
          `${API_BASE_URL}/travel/listings?type=transfer`
        );

        if (!response.ok) {
          throw new Error(
            `Failed to load transfers (${response.status})`
          );
        }

        const data = await response.json();

        const listings: TravelListing[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
            ? data.items
            : [];

        const mappedTransfers = listings
          .filter((listing) => listing.active !== false)
          .map(mapListingToTransfer)
          .filter((transfer) => transfer.id);

        if (!cancelled) {
          setTransfers(mappedTransfers);

          if (mappedTransfers.length > 0) {
            setSelectedType(mappedTransfers[0].id);
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error(
            'Failed to load travel transfers:',
            err
          );

          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load transfers.'
          );

          setTransfers([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadTransfers();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedTransfer = useMemo(
    () =>
      transfers.find(
        (transfer) => transfer.id === selectedType
      ),
    [transfers, selectedType]
  );

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    console.log('Transfer search:', {
      pickup,
      dropoff,
      dateTime,
      passengers,
    });
  }

  function handleBookTransfer() {
    if (!selectedTransfer) {
      return;
    }

    console.log('Book transfer:', {
      transferId: selectedTransfer.id,
      transferName: selectedTransfer.name,
      pickup,
      dropoff,
      dateTime,
      passengers,
      price: selectedTransfer.price,
      currency: selectedTransfer.currency,
    });

    // Booking API will be connected in the next stage.
  }

  return (
    <div className="travel-transfers-page">
      <section className="tight">
        <div className="wrap">
          <div className="eyebrow">
            Transportation
          </div>

          <h1
            style={{
              fontSize: 'clamp(28px, 4vw, 42px)',
            }}
          >
            Get there easily
          </h1>

          <p
            style={{
              color: 'var(--slate, #5B6B76)',
              marginTop: 10,
              maxWidth: 480,
            }}
          >
            Airport transfers, private drivers and shuttles —
            worldwide.
          </p>

          <form
            className="travel-search travel-search--inline"
            style={{ marginTop: 28 }}
            onSubmit={handleSearch}
          >
            <div className="search-fields">
              <label className="field">
                <span>Pick-up</span>

                <input
                  id="t-pickup"
                  className="value"
                  value={pickup}
                  onChange={(e) =>
                    setPickup(e.target.value)
                  }
                />
              </label>

              <label className="field">
                <span>Destination</span>

                <input
                  id="t-dropoff"
                  className="value"
                  value={dropoff}
                  onChange={(e) =>
                    setDropoff(e.target.value)
                  }
                />
              </label>

              <label className="field">
                <span>Date &amp; time</span>

                <input
                  id="t-datetime"
                  type="datetime-local"
                  className="value"
                  value={dateTime}
                  onChange={(e) =>
                    setDateTime(e.target.value)
                  }
                />
              </label>

              <label className="field">
                <span>Passengers</span>

                <input
                  id="t-passengers"
                  type="number"
                  min={1}
                  max={20}
                  className="value"
                  value={passengers}
                  onChange={(e) => {
                    const value = Number(e.target.value);

                    if (Number.isFinite(value)) {
                      setPassengers(
                        Math.min(
                          20,
                          Math.max(1, value)
                        )
                      );
                    }
                  }}
                />
              </label>

              <button
                type="submit"
                className="search-submit"
              >
                Search →
              </button>
            </div>
          </form>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="transfer-route">
            <div className="transfer-point">
              <div className="code mono">
                PAP
              </div>

              <div className="name">
                {pickup}
              </div>
            </div>

            <div className="transfer-line">
              <span
                className="plane"
                aria-hidden="true"
              >
                ✈️
              </span>
            </div>

            <div className="transfer-point">
              <div className="code mono">
                PV
              </div>

              <div className="name">
                {dropoff}
              </div>
            </div>
          </div>

          <div
            className="section-head"
            style={{ marginTop: 48 }}
          >
            <div>
              <div className="eyebrow">
                Choose a transfer type
              </div>

              <h2>Pick what fits your trip</h2>
            </div>
          </div>

          {loading && (
            <div className="ft-empty-state">
              <div className="ic" aria-hidden="true">
                🚐
              </div>

              <h4>Loading transfer options...</h4>

              <p>
                Finding transportation available
                through Fockis Travel.
              </p>
            </div>
          )}

          {!loading && error && (
            <div className="ft-empty-state">
              <div className="ic" aria-hidden="true">
                ⚠️
              </div>

              <h4>
                Unable to load transfers
              </h4>

              <p>{error}</p>

              <button
                type="button"
                className="btn btn-outline"
                onClick={() =>
                  window.location.reload()
                }
              >
                Try again
              </button>
            </div>
          )}

          {!loading &&
            !error &&
            transfers.length === 0 && (
              <div className="ft-empty-state">
                <div
                  className="ic"
                  aria-hidden="true"
                >
                  🚐
                </div>

                <h4>
                  No transfer options available
                </h4>

                <p>
                  Transfer listings created in
                  the Fockis Travel backend will
                  appear here.
                </p>
              </div>
            )}

          {!loading &&
            !error &&
            transfers.length > 0 && (
              <>
                <div className="transfer-types-grid">
                  {transfers.map((transfer) => (
                    <TransferCard
                      key={transfer.id}
                      id={transfer.id}
                      name={transfer.name}
                      icon={transfer.icon}
                      meta={transfer.meta}
                      price={transfer.price}
                      currency={transfer.currency}
                      selected={
                        transfer.id === selectedType
                      }
                      onSelect={setSelectedType}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ marginTop: 24 }}
                  disabled={!selectedTransfer}
                  onClick={handleBookTransfer}
                >
                  {selectedTransfer
                    ? `Book ${selectedTransfer.name} →`
                    : 'Select a transfer'}
                </button>
              </>
            )}
        </div>
      </section>
    </div>
  );
}