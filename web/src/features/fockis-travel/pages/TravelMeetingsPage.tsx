import { useEffect, useState } from 'react';
import MeetingRoomCard, {
  type MeetingRoomTime,
} from '../components/MeetingRoomCard';

interface TravelListing {
  _id: string;
  name: string;
  type: string;
  description: string;
  country: string;
  city: string;
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
  metadata?: Record<string, any>;
}

interface MeetingRoom {
  id: string;
  name: string;
  image: string;
  capacity: number;
  layouts: string[];
  amenities: string[];
  hourlyPrice: number;
  halfDayPrice: number;
  fullDayPrice: number;
  times: MeetingRoomTime[];
  currency: string;
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:3000';

function getImage(listing: TravelListing) {
  return (
    listing.images?.[0] ||
    listing.metadata?.image ||
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600'
  );
}

function getNumber(
  value: unknown,
  fallback: number,
): number {
  const number = Number(value);

  return Number.isFinite(number) ? number : fallback;
}

function mapListingToMeetingRoom(
  listing: TravelListing,
): MeetingRoom {
  const metadata = listing.metadata || {};

  const hourlyPrice = getNumber(
    metadata.hourlyPrice,
    listing.price ?? 0,
  );

  const halfDayPrice = getNumber(
    metadata.halfDayPrice,
    hourlyPrice * 4,
  );

  const fullDayPrice = getNumber(
    metadata.fullDayPrice,
    hourlyPrice * 8,
  );

  const capacity = getNumber(
    metadata.capacity,
    10,
  );

  const layouts = Array.isArray(metadata.layouts)
    ? metadata.layouts.map(String)
    : listing.tags?.length
      ? listing.tags
      : ['Boardroom'];

  const amenities = Array.isArray(metadata.amenities)
    ? metadata.amenities.map(String)
    : listing.amenities || [];

  const times: MeetingRoomTime[] =
    Array.isArray(metadata.times)
      ? metadata.times.map((time: any) => {
          if (typeof time === 'string') {
            return { time };
          }

          return {
            time: String(time.time || ''),
            taken: Boolean(time.taken),
          };
        })
      : [
          { time: '9:00 AM' },
          { time: '11:30 AM' },
          { time: '2:00 PM' },
          { time: '4:30 PM' },
        ];

  return {
    id: listing._id,
    name: listing.name,
    image: getImage(listing),
    capacity,
    layouts,
    amenities,
    hourlyPrice,
    halfDayPrice,
    fullDayPrice,
    times,
    currency: listing.currency || '$',
  };
}

/**
 * Travel + business travel:
 * Meeting rooms, conference spaces and event spaces.
 *
 * Data source:
 * GET /travel/listings?type=meeting
 */
export default function TravelMeetingsPage() {
  const [rooms, setRooms] = useState<MeetingRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadMeetingRooms() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `${API_BASE_URL}/travel/listings?type=meeting`,
        );

        if (!response.ok) {
          throw new Error(
            `Failed to load meeting rooms (${response.status})`,
          );
        }

        const data = await response.json();

        const listings: TravelListing[] = Array.isArray(data)
          ? data
          : Array.isArray(data.items)
            ? data.items
            : [];

        const meetingRooms = listings
          .filter((listing) => listing.type === 'meeting')
          .map(mapListingToMeetingRoom);

        if (!cancelled) {
          setRooms(meetingRooms);
        }
      } catch (err) {
        console.error(
          '[TravelMeetingsPage] Failed to load meeting rooms:',
          err,
        );

        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load meeting rooms.',
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadMeetingRooms();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleReserve(id: string, time: string | null) {
    const room = rooms.find((item) => item.id === id);

    if (!room) {
      return;
    }

    if (!time) {
      window.alert(
        `Please select an available time for ${room.name}.`,
      );
      return;
    }

    /*
     * Booking connection comes next.
     *
     * The listing is now connected to the backend.
     * Once we connect the bookings module, this handler
     * will create the actual reservation.
     */
    console.log('[TravelMeetingsPage] Reserve meeting room', {
      listingId: id,
      roomName: room.name,
      time,
    });

    window.alert(
      `${room.name} selected for ${time}. Booking connection will be handled by the Travel bookings module.`,
    );
  }

  return (
    <div className="travel-meetings-page">
      <section className="tight">
        <div className="wrap">
          <div className="eyebrow">
            Meeting &amp; Event Spaces
          </div>

          <h1
            style={{
              fontSize: 'clamp(28px, 4vw, 42px)',
            }}
          >
            Reserve a room, not a hotel stay
          </h1>

          <p
            style={{
              color: 'var(--slate, #5B6B76)',
              marginTop: 10,
              maxWidth: 520,
            }}
          >
            Meeting rooms, boardrooms and event halls can be
            booked on their own — no overnight stay required.
          </p>
        </div>
      </section>

      <section>
        <div className="wrap">
          {loading && (
            <div className="ft-empty-state">
              <div className="ic" aria-hidden="true">
                🏢
              </div>

              <h4>Loading meeting rooms...</h4>

              <p>
                Finding available meeting and conference
                spaces.
              </p>
            </div>
          )}

          {!loading && error && (
            <div className="ft-empty-state">
              <div className="ic" aria-hidden="true">
                ⚠️
              </div>

              <h4>Unable to load meeting rooms</h4>

              <p>{error}</p>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => window.location.reload()}
                style={{ marginTop: 16 }}
              >
                Try again
              </button>
            </div>
          )}

          {!loading && !error && rooms.length === 0 && (
            <div className="ft-empty-state">
              <div className="ic" aria-hidden="true">
                🏢
              </div>

              <h4>No meeting rooms available</h4>

              <p>
                There are currently no active meeting rooms
                listed in Fockis Travel.
              </p>
            </div>
          )}

          {!loading && !error && rooms.length > 0 && (
            <>
              <div className="meeting-layout">
                <div>
                  <MeetingRoomCard
                    {...rooms[0]}
                    onReserve={handleReserve}
                  />
                </div>

                <div className="local-callout">
                  <span className="badge">
                    LOCAL USE CASE
                  </span>

                  <h3
                    style={{
                      fontSize: 22,
                      lineHeight: 1.2,
                    }}
                  >
                    No hotel stay needed
                  </h3>

                  <p
                    style={{
                      color: 'var(--slate, #5B6B76)',
                      fontSize: 14.5,
                      lineHeight: 1.6,
                    }}
                  >
                    A businessperson in Port-au-Prince
                    searches "meeting rooms near
                    Pétion-Ville" and reserves exactly what
                    the meeting needs — nothing more.
                  </p>

                  <div className="plus-row">
                    <span className="tag">
                      💼 Meeting Room
                    </span>

                    <span className="sym">+</span>

                    <span className="tag">
                      🍽️ Catering
                    </span>

                    <span className="sym">+</span>

                    <span className="tag">
                      📽️ Projector
                    </span>

                    <span className="sym">+</span>

                    <span className="tag">
                      🎥 Video Conf.
                    </span>

                    <span className="sym">+</span>

                    <span className="tag">
                      🅿️ Parking
                    </span>
                  </div>
                </div>
              </div>

              {rooms.length > 1 && (
                <>
                  <div
                    className="section-head"
                    style={{ marginTop: 60 }}
                  >
                    <div>
                      <div className="eyebrow">
                        More rooms
                      </div>

                      <h2>Other available spaces</h2>
                    </div>
                  </div>

                  <div className="meeting-grid">
                    {rooms.slice(1).map((room) => (
                      <MeetingRoomCard
                        key={room.id}
                        {...room}
                        onReserve={handleReserve}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}