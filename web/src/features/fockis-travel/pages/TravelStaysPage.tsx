import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertCircle, BedDouble, RefreshCw, Search, SlidersHorizontal } from "lucide-react";

import TravelListingCard from "../components/TravelListingCard";
import {
  buildVerifiedPartnerIndex,
  fetchTravelListings,
  fetchVerifiedBusinesses,
  findListingPartner,
  getListingId,
  listingMatchesQuery,
  sortFeaturedFirst,
} from "../services/travelListingView";
import type {
  TravelListingView,
  VerifiedBusinessView,
} from "../services/travelListingView";
import "../styles/TravelStaysPage.scss";

/**
 * ============================================================================
 * FOCKIS TRAVEL — STAYS
 * ============================================================================
 *
 * Endpoint: GET /travel/listings?type=stay
 *
 * Reads the home search from the URL so the traveller's selection carries
 * over:  ?destination=…&checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD&guests=N
 * Dates and travelers are passed on to each stay's details page, where the
 * booking card is pre-filled. Filtering and sorting run on the loaded list.
 * ============================================================================
 */

type SortKey = "recommended" | "price-low" | "price-high" | "rating";

function todayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function nextDay(date: string): string {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + 1);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function validDate(value: string | null): string {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

export default function TravelStaysPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const today = useMemo(todayString, []);

  const destination = (searchParams.get("destination") || searchParams.get("search") || "").trim();
  const checkIn = validDate(searchParams.get("checkIn"));
  const checkOut = validDate(searchParams.get("checkOut"));
  const guests = Math.min(16, Math.max(1, Number(searchParams.get("guests")) || 2));

  const [draftDestination, setDraftDestination] = useState(destination);
  const [draftCheckIn, setDraftCheckIn] = useState(checkIn);
  const [draftCheckOut, setDraftCheckOut] = useState(checkOut);
  const [draftGuests, setDraftGuests] = useState(guests);
  const [formError, setFormError] = useState("");

  const [sort, setSort] = useState<SortKey>("recommended");
  const [minRating, setMinRating] = useState(0);

  const [stays, setStays] = useState<TravelListingView[]>([]);
  const [businesses, setBusinesses] = useState<VerifiedBusinessView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Keep the form in step with back/forward navigation.
  useEffect(() => {
    setDraftDestination(destination);
    setDraftCheckIn(checkIn);
    setDraftCheckOut(checkOut);
    setDraftGuests(guests);
  }, [destination, checkIn, checkOut, guests]);

  const loadStays = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setStays(await fetchTravelListings({ type: "stay" }));
    } catch (reason) {
      console.error("Travel stays error:", reason);
      setError(
        reason && typeof reason === "object" && "message" in reason
          ? String((reason as { message?: unknown }).message)
          : "Unable to load stays right now.",
      );
      setStays([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStays();
    fetchVerifiedBusinesses()
      .then(setBusinesses)
      .catch(() => undefined);
  }, [loadStays]);

  const verifiedIndex = useMemo(() => buildVerifiedPartnerIndex(businesses), [businesses]);

  const filtered = useMemo(() => {
    const list = stays.filter(
      (stay) => listingMatchesQuery(stay, destination) && Number(stay.rating || 0) >= minRating,
    );

    if (sort === "price-low") return [...list].sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    if (sort === "price-high") return [...list].sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    if (sort === "rating") return [...list].sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
    return [...list].sort(sortFeaturedFirst);
  }, [stays, destination, minRating, sort]);

  const detailsSearch = useMemo(() => {
    const params = new URLSearchParams();
    if (checkIn) params.set("checkIn", checkIn);
    if (checkOut) params.set("checkOut", checkOut);
    params.set("guests", String(guests));
    return params.toString();
  }, [checkIn, checkOut, guests]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (draftCheckIn && draftCheckOut && draftCheckOut <= draftCheckIn) {
      setFormError("Check-out must be after check-in.");
      return;
    }

    setFormError("");
    const params = new URLSearchParams();
    if (draftDestination.trim()) params.set("destination", draftDestination.trim());
    if (draftCheckIn) params.set("checkIn", draftCheckIn);
    if (draftCheckOut) params.set("checkOut", draftCheckOut);
    params.set("guests", String(draftGuests));
    setSearchParams(params);
  }

  function clearFilters() {
    setMinRating(0);
    setSort("recommended");
    const params = new URLSearchParams(searchParams);
    params.delete("destination");
    params.delete("search");
    setSearchParams(params);
  }

  return (
    <div className="ft-stays">
      <div className="ft-stays__wrap">
        <header className="ft-stays__head">
          <h1>{destination ? `Stays in ${destination}` : "Find your perfect stay"}</h1>
          <p>Hotels, resorts, apartments and villas from Fockis Travel partners.</p>
        </header>

        <form className="ft-stays__search" onSubmit={handleSubmit} role="search" aria-label="Search stays">
          <label className="ft-stays__field ft-stays__field--wide">
            <span>Destination</span>
            <input
              type="search"
              value={draftDestination}
              onChange={(event) => setDraftDestination(event.target.value)}
              placeholder="City, country or hotel"
            />
          </label>
          <label className="ft-stays__field">
            <span>Check in</span>
            <input
              type="date"
              value={draftCheckIn}
              min={today}
              onChange={(event) => {
                setDraftCheckIn(event.target.value);
                if (draftCheckOut && event.target.value && draftCheckOut <= event.target.value) {
                  setDraftCheckOut(nextDay(event.target.value));
                }
              }}
            />
          </label>
          <label className="ft-stays__field">
            <span>Check out</span>
            <input
              type="date"
              value={draftCheckOut}
              min={draftCheckIn ? nextDay(draftCheckIn) : today}
              onChange={(event) => setDraftCheckOut(event.target.value)}
            />
          </label>
          <label className="ft-stays__field">
            <span>Travelers</span>
            <select value={draftGuests} onChange={(event) => setDraftGuests(Number(event.target.value))}>
              {Array.from({ length: 16 }, (_, index) => index + 1).map((count) => (
                <option key={count} value={count}>
                  {count} {count === 1 ? "traveler" : "travelers"}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="ft-stays__submit">
            <Search size={18} aria-hidden="true" /> Search
          </button>
          {formError && (
            <p className="ft-stays__form-error" role="alert">
              {formError}
            </p>
          )}
        </form>

        <div className="ft-stays__toolbar">
          <span className="ft-stays__filters-label">
            <SlidersHorizontal size={15} aria-hidden="true" /> Filters
          </span>

          <label className="ft-stays__select">
            <span>Rating</span>
            <select value={minRating} onChange={(event) => setMinRating(Number(event.target.value))}>
              <option value={0}>Any rating</option>
              <option value={4}>4.0+</option>
              <option value={4.5}>4.5+</option>
            </select>
          </label>

          <label className="ft-stays__select ft-stays__select--end">
            <span>Sort by</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
              <option value="recommended">Recommended</option>
              <option value="price-low">Price: low to high</option>
              <option value="price-high">Price: high to low</option>
              <option value="rating">Top rated</option>
            </select>
          </label>
        </div>

        {loading ? (
          <div className="ft-stays__grid" aria-busy="true">
            {Array.from({ length: 8 }, (_, index) => (
              <div key={index} className="ft-skel-card" aria-hidden="true">
                <div className="ft-skel ft-skel-card__media" />
                <div className="ft-skel-card__body">
                  <div className="ft-skel ft-skel--line" />
                  <div className="ft-skel ft-skel--line ft-skel--short" />
                  <div className="ft-skel ft-skel--button" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="ft-stays__empty" role="alert">
            <AlertCircle size={28} aria-hidden="true" />
            <h2>Unable to load stays</h2>
            <p>{error}</p>
            <button type="button" className="ft-stays__outline" onClick={() => void loadStays()}>
              <RefreshCw size={16} aria-hidden="true" /> Try again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="ft-stays__empty">
            <BedDouble size={28} aria-hidden="true" />
            <h2>{stays.length === 0 ? "No stays listed yet" : "No stays match your search"}</h2>
            <p>
              {stays.length === 0
                ? "Hotels and resorts will appear here as soon as partners publish them."
                : "Try another destination or lower the minimum rating."}
            </p>
            {stays.length > 0 && (
              <button type="button" className="ft-stays__outline" onClick={clearFilters}>
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            <p className="ft-stays__count">
              {filtered.length} {filtered.length === 1 ? "stay" : "stays"} found
            </p>
            <div className="ft-stays__grid">
              {filtered.map((stay) => (
                <TravelListingCard
                  key={getListingId(stay)}
                  listing={stay}
                  linkSearch={detailsSearch}
                  verified={Boolean(findListingPartner(stay, verifiedIndex))}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
