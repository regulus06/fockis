import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertCircle, ArrowRight, RefreshCw, Search, SearchX, X } from "lucide-react";

import TravelListingCard from "../components/TravelListingCard";
import {
  TRAVEL_CATEGORIES,
  getCategoryByListingType,
} from "../components/travelDiscovery";
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
import "../styles/TravelExplorePage.scss";

/**
 * ============================================================================
 * FOCKIS TRAVEL — EXPLORE / SEARCH RESULTS
 * ============================================================================
 *
 * /travel/explore                 search box + travel category grid
 * /travel/explore?q=Paris         listings of every type matching "Paris"
 * /travel/explore?type=event&q=…  listings of one type (Events, Vacation
 *                                 Rentals and other types without their own
 *                                 results page)
 *
 * Results come from GET /travel/listings (type filter on the server, plus
 * pickupDate/dropoffDate for cars — both supported by listings.controller).
 * The free-text match runs here against name, city, state and country,
 * because the backend's `text` search covers name/description/tags only.
 * ============================================================================
 */

const TYPE_LABELS: Record<string, string> = {
  stay: "Stays",
  rental: "Vacation Rentals",
  restaurant: "Restaurants",
  car: "Cars",
  experience: "Experiences",
  event: "Events",
  meeting: "Meetings",
  transfer: "Transfers",
  attraction: "Attractions",
  thing: "Things to do",
};

const FILTER_TYPES = ["", "stay", "rental", "restaurant", "car", "experience", "event", "meeting"];

type LoadState = "idle" | "loading" | "ready" | "error";

function formatDate(value: string | null): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function TravelExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const type = (searchParams.get("type") || "").trim().toLowerCase();
  const query = (searchParams.get("q") || "").trim();
  const pickupDate = searchParams.get("pickupDate") || "";
  const dropoffDate = searchParams.get("dropoffDate") || "";
  const checkIn = searchParams.get("checkIn") || "";
  const checkOut = searchParams.get("checkOut") || "";
  const date = searchParams.get("date") || "";
  const guests = searchParams.get("guests") || "";
  const hasSearch = Boolean(type || query);

  const [draft, setDraft] = useState(query);
  const [listings, setListings] = useState<TravelListingView[]>([]);
  const [state, setState] = useState<LoadState>("idle");
  const [businesses, setBusinesses] = useState<VerifiedBusinessView[]>([]);

  useEffect(() => setDraft(query), [query]);

  const load = useCallback(async () => {
    if (!hasSearch) {
      setState("idle");
      return;
    }

    setState("loading");
    try {
      const params: Record<string, unknown> = {};
      if (type) params.type = type;
      if (type === "car" && pickupDate && dropoffDate) {
        params.pickupDate = pickupDate;
        params.dropoffDate = dropoffDate;
      }
      setListings(await fetchTravelListings(params));
      setState("ready");
    } catch (error) {
      console.error("[Fockis Travel] Explore search failed:", error);
      setListings([]);
      setState("error");
    }
  }, [hasSearch, type, pickupDate, dropoffDate]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let active = true;
    fetchVerifiedBusinesses()
      .then((items) => active && setBusinesses(items))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const verifiedIndex = useMemo(() => buildVerifiedPartnerIndex(businesses), [businesses]);

  const results = useMemo(
    () => listings.filter((listing) => listingMatchesQuery(listing, query)).sort(sortFeaturedFirst),
    [listings, query],
  );

  // Dates and travelers carried into the details page booking card.
  const detailsSearch = useMemo(() => {
    const params = new URLSearchParams();
    const start = checkIn || date;
    if (start) params.set("checkIn", start);
    if (checkOut) params.set("checkOut", checkOut);
    if (guests) params.set("guests", guests);
    return params.toString();
  }, [checkIn, checkOut, date, guests]);

  const typeLabel = type ? TYPE_LABELS[type] || type : "All travel";
  const category = type ? getCategoryByListingType(type) : undefined;

  function updateParams(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams);
    Object.entries(next).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    setSearchParams(params);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateParams({ q: draft.trim() });
  }

  const chips: string[] = [];
  if (checkIn || checkOut) chips.push([formatDate(checkIn), formatDate(checkOut)].filter(Boolean).join(" – "));
  if (date) chips.push(formatDate(date));
  if (pickupDate || dropoffDate)
    chips.push(`Pick-up ${[formatDate(pickupDate), formatDate(dropoffDate)].filter(Boolean).join(" – ")}`);
  if (guests) chips.push(`${guests} ${Number(guests) === 1 ? "guest" : "guests"}`);

  return (
    <div className="ft-explore">
      <div className="ft-explore__wrap">
        <header className="ft-explore__head">
          <h1>{hasSearch ? (query ? `“${query}”` : typeLabel) : "Explore"}</h1>
          {hasSearch && (
            <p>
              {query ? `${typeLabel} matching your search` : `Browse ${typeLabel.toLowerCase()} on Fockis Travel`}
            </p>
          )}
        </header>

        <form className="ft-explore__search" role="search" onSubmit={handleSubmit}>
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Search destinations, hotels…"
            aria-label="Search destinations, hotels, restaurants or experiences"
            enterKeyHint="search"
          />
          {draft && (
            <button
              type="button"
              className="ft-explore__clear"
              aria-label="Clear search"
              onClick={() => {
                setDraft("");
                updateParams({ q: "" });
              }}
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
          <button type="submit" className="ft-explore__go">
            Search
          </button>
        </form>

        {!hasSearch ? (
          <section aria-labelledby="ft-explore-cats" className="ft-explore__section">
            <h2 id="ft-explore-cats" className="ft-explore__subhead">
              Browse by category
            </h2>
            <ul className="ft-explore__tiles">
              {TRAVEL_CATEGORIES.map((item) => (
                <li key={item.id}>
                  <Link to={item.to} className="ft-explore__tile">
                    <img src={item.image} alt="" loading="lazy" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <>
            <div className="ft-explore__filters" role="group" aria-label="Filter by type">
              {FILTER_TYPES.map((value) => (
                <button
                  key={value || "all"}
                  type="button"
                  className={`ft-explore__pill${value === type ? " is-active" : ""}`}
                  aria-pressed={value === type}
                  onClick={() => updateParams({ type: value })}
                >
                  {value ? TYPE_LABELS[value] : "All"}
                </button>
              ))}
            </div>

            {chips.length > 0 && (
              <p className="ft-explore__chips">
                {chips.map((chip) => (
                  <span key={chip}>{chip}</span>
                ))}
              </p>
            )}

            <section className="ft-explore__section" aria-live="polite" aria-busy={state === "loading"}>
              {state === "loading" ? (
                <div className="ft-explore__grid" aria-hidden="true">
                  {Array.from({ length: 8 }, (_, index) => (
                    <div key={index} className="ft-skel-card">
                      <div className="ft-skel ft-skel-card__media" />
                      <div className="ft-skel-card__body">
                        <div className="ft-skel ft-skel--line" />
                        <div className="ft-skel ft-skel--line ft-skel--short" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : state === "error" ? (
                <div className="ft-explore__empty" role="alert">
                  <AlertCircle size={28} aria-hidden="true" />
                  <h2>Search is unavailable right now</h2>
                  <p>We couldn’t reach Fockis Travel. Check your connection and try again.</p>
                  <button type="button" className="ft-explore__outline" onClick={() => void load()}>
                    <RefreshCw size={16} aria-hidden="true" /> Try again
                  </button>
                </div>
              ) : results.length === 0 ? (
                <div className="ft-explore__empty">
                  <SearchX size={28} aria-hidden="true" />
                  <h2>
                    No {typeLabel.toLowerCase()} {query ? `match “${query}”` : "are listed yet"}
                  </h2>
                  <p>
                    {query
                      ? "Try another city, country or property name, or search all travel types."
                      : "New listings appear here as soon as Fockis Travel partners publish them."}
                  </p>
                  <div className="ft-explore__empty-actions">
                    {query && type && (
                      <button type="button" className="ft-explore__outline" onClick={() => updateParams({ type: "" })}>
                        Search all types
                      </button>
                    )}
                    {category && category.to !== `/travel/explore?type=${type}` && (
                      <Link to={category.to} className="ft-explore__outline">
                        Open {category.label} <ArrowRight size={16} aria-hidden="true" />
                      </Link>
                    )}
                    <Link to="/travel" className="ft-explore__primary">
                      Back to Travel home
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  <p className="ft-explore__count">
                    {results.length} {results.length === 1 ? "result" : "results"}
                  </p>
                  <div className="ft-explore__grid">
                    {results.map((listing) => (
                      <TravelListingCard
                        key={getListingId(listing)}
                        listing={listing}
                        variant="stay"
                        linkSearch={detailsSearch}
                        verified={Boolean(findListingPartner(listing, verifiedIndex))}
                      />
                    ))}
                  </div>
                </>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
