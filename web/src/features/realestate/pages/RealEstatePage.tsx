import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  LayoutGrid,
  List,
  Map as MapIcon,
  SlidersHorizontal,
  Plus,
  Home as HomeIcon,
  KeyRound,
  Trees,
  Building2,
  SearchX,
  Heart,
  UserRound,
  ArrowLeft,
  Megaphone,
} from "lucide-react";

import PropertySearch, {
  type SearchTab,
} from "../components/PropertySearch";

import PropertyFilters, {
  type PropertyFilterValues,
} from "../components/PropertyFilters";

import PropertyGrid from "../components/PropertyGrid";
import PropertyMap from "../components/PropertyMap";
import PropertyDetailsPage from "./PropertyDetailsPage";

import useProperties from "../hooks/useProperties";

import {
  useSavePropertiesStore,
} from "../store/savePropertiesStore";

import type {
  Property,
} from "../types/Property";

import type {
  PropertySearchParams,
} from "../services/propertyApi";

import "../styles/RealEstatePage.scss";
import "../styles/_input-reset.scss";


type ViewMode =
  | "grid"
  | "list"
  | "map";


/* ============================================================================
   REAL ESTATE BOTTOM NAVIGATION

   Layout:

   HOME | SAVED | + | MARKETING | PROFILE

   The + button is always the center item.
============================================================================ */

const RealEstateBottomNav: React.FC = () => {

  const navigate = useNavigate();

  const location = useLocation();


  /* ==========================================================================
     ACTIVE STATES
  ========================================================================== */

  const isHome =
    location.pathname === "/realestate" ||
    location.pathname === "/realestate/";


  const isSaved =
    location.pathname.startsWith(
      "/realestate/saved",
    );


  const isCreate =
    location.pathname.startsWith(
      "/realestate/create",
    );


  const isMarketing =
    location.pathname.startsWith(
      "/marketing",
    );


  const isProfile =
    location.pathname === "/profile" ||
    location.pathname.startsWith(
      "/profile/",
    );


  /* ==========================================================================
     RENDER
  ========================================================================== */

  return (

    <nav
      className="re-bottom-nav"
      aria-label="Real estate navigation"
    >

      {/* ======================================================================
          HOME
      ====================================================================== */}

      <button
        type="button"
        className={[
          "re-bottom-nav__item",
          isHome
            ? "is-active"
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={() =>
          navigate("/realestate")
        }
        aria-label="Home"
      >

        <HomeIcon
          size={21}
          strokeWidth={2}
        />

        <span>
          Home
        </span>

      </button>


      {/* ======================================================================
          SAVED
      ====================================================================== */}

      <button
        type="button"
        className={[
          "re-bottom-nav__item",
          isSaved
            ? "is-active"
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={() =>
          navigate(
            "/realestate/saved",
          )
        }
        aria-label="Saved properties"
      >

        <Heart
          size={21}
          strokeWidth={2}
        />

        <span>
          Saved
        </span>

      </button>


      {/* ======================================================================
          CENTER + BUTTON
      ====================================================================== */}

      <button
        type="button"
        className={[
          "re-bottom-nav__item",
          "re-bottom-nav__item--center",
          isCreate
            ? "is-active"
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={() =>
          navigate(
            "/realestate/create",
          )
        }
        aria-label="List a property"
        title="List a property"
      >

        <span className="re-bottom-nav__add">

          <Plus
            size={24}
            strokeWidth={2.5}
          />

        </span>

      </button>


      {/* ======================================================================
          MARKETING
      ====================================================================== */}

      <button
        type="button"
        className={[
          "re-bottom-nav__item",
          isMarketing
            ? "is-active"
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={() =>
          navigate("/marketing")
        }
        aria-label="Marketing"
        title="Marketing"
      >

        <Megaphone
          size={21}
          strokeWidth={2}
        />

        <span>
          Marketing
        </span>

      </button>


      {/* ======================================================================
          PROFILE
      ====================================================================== */}

      <button
        type="button"
        className={[
          "re-bottom-nav__item",
          isProfile
            ? "is-active"
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={() =>
          navigate("/profile")
        }
        aria-label="Profile"
        title="Profile"
      >

        <UserRound
          size={21}
          strokeWidth={2}
        />

        <span>
          Profile
        </span>

      </button>

    </nav>

  );
};


/* ============================================================================
   REAL ESTATE PAGE
============================================================================ */

const RealEstatePage: React.FC = () => {

  const navigate = useNavigate();


  /* ==========================================================================
     SAVED PROPERTIES
  ========================================================================== */

  const {
    savedIds,
    toggleSaved,
  } = useSavePropertiesStore();


  /* ==========================================================================
     SEARCH TAB
  ========================================================================== */

  const [tab, setTab] =
    useState<SearchTab>("all");


  /* ==========================================================================
     VIEW MODE
  ========================================================================== */

  const [viewMode, setViewMode] =
    useState<ViewMode>("grid");


  /* ==========================================================================
     FILTERS
  ========================================================================== */

  const [filtersOpen, setFiltersOpen] =
    useState(false);


  /* ==========================================================================
     SELECTED PROPERTY
  ========================================================================== */

  const [selected, setSelected] =
    useState<Property | null>(null);


  /* ==========================================================================
     FILTER VALUES
  ========================================================================== */

  const [filters, setFilters] =
    useState<PropertyFilterValues>({});


  /* ==========================================================================
     SEARCH
  ========================================================================== */

  const [search, setSearch] =
    useState("");


  /* ==========================================================================
     BUILD SEARCH PARAMS
  ========================================================================== */

  const params: PropertySearchParams =
    useMemo(() => {

      const next: PropertySearchParams =
        {};


      /* ----------------------------------------------------------------------
         SEARCH
      ---------------------------------------------------------------------- */

      if (search.trim()) {

        next.search =
          search.trim();

      }


      /* ----------------------------------------------------------------------
         SEARCH TAB
      ---------------------------------------------------------------------- */

      if (tab === "sale") {

        next.status =
          "sale";

      }


      if (tab === "rent") {

        next.status =
          "rent";

      }


      if (tab === "land") {

        next.type =
          "land";

      }


      if (tab === "commercial") {

        next.type =
          "commercial";

      }


      /* ----------------------------------------------------------------------
         PROPERTY TYPE FILTER
      ---------------------------------------------------------------------- */

      if (filters.propertyType) {

        next.type =
          filters.propertyType;

      }


      /* ----------------------------------------------------------------------
         PRICE
      ---------------------------------------------------------------------- */

      if (
        filters.minPrice !==
        undefined
      ) {

        next.minPrice =
          filters.minPrice;

      }


      if (
        filters.maxPrice !==
        undefined
      ) {

        next.maxPrice =
          filters.maxPrice;

      }


      /* ----------------------------------------------------------------------
         BEDROOMS
      ---------------------------------------------------------------------- */

      if (
        filters.bedrooms !==
        undefined
      ) {

        next.bedrooms =
          filters.bedrooms;

      }


      /* ----------------------------------------------------------------------
         BATHROOMS
      ---------------------------------------------------------------------- */

      if (
        filters.bathrooms !==
        undefined
      ) {

        next.bathrooms =
          filters.bathrooms;

      }


      return next;

    }, [
      search,
      tab,
      filters,
    ]);


  /* ==========================================================================
     PROPERTIES
  ========================================================================== */

  const {
    properties,
    loading,
    error,
    fetchProperties,
  } = useProperties({
    params,
    autoFetch: true,
  });


  /* ==========================================================================
     FETCH WHEN SEARCH / FILTERS CHANGE
  ========================================================================== */

  useEffect(() => {

    void fetchProperties(
      params,
    );

  }, [
    params,
    fetchProperties,
  ]);


  /* ==========================================================================
     SELECTED PROPERTY
  ========================================================================== */

  if (selected) {

    return (

      <div
        className="
          re-page
          re-page--details
        "
      >

        <button
          type="button"
          className="re-back"
          onClick={() =>
            setSelected(null)
          }
        >

          <ArrowLeft
            size={17}
          />

          Back to properties

        </button>


        <PropertyDetailsPage
          propertyId={
            selected.id
          }
          onBack={() =>
            setSelected(null)
          }
        />


        <RealEstateBottomNav />

      </div>

    );

  }


  /* ==========================================================================
     FILTER COUNT
  ========================================================================== */

  const activeFilterCount =
    Object.values(filters).filter(
      (value) =>
        value !== undefined &&
        value !== "",
    ).length;


  /* ==========================================================================
     CLEAR FILTERS
  ========================================================================== */

  const clearFilters = () => {

    setSearch("");

    setFilters({});

    setTab("all");

  };


  /* ==========================================================================
     RENDER
  ========================================================================== */

  return (

    <div className="re-page">

      {/* ======================================================================
          SEARCH
      ====================================================================== */}

      <PropertySearch
        tab={tab}
        onTabChange={setTab}
        onSearch={setSearch}
        onFilters={() =>
          setFiltersOpen(true)
        }
      />


      <main className="re-container">

        {/* ====================================================================
            PAGE HEADING
        ==================================================================== */}

        <section
          className="
            re-page-heading
            re-page-heading--split
          "
        >

          <div>

            <p className="re-eyebrow">
              FOCKIS REAL ESTATE
            </p>


            <h1>
              Find a place you'll love
            </h1>


            <p>
              Discover homes,
              apartments, condos,
              land and commercial
              properties.
            </p>

          </div>


          <button
            type="button"
            className="re-primary"
            onClick={() =>
              navigate(
                "/realestate/create",
              )
            }
          >

            <Plus
              size={16}
            />

            List a Property

          </button>

        </section>


        {/* ====================================================================
            CATEGORY CARDS
        ==================================================================== */}

        <section
          className="re-category-grid"
          aria-label="Property categories"
        >

          {/* ------------------------------------------------------------------
              HOMES
          ------------------------------------------------------------------ */}

          <button
            type="button"
            className="re-category-card"
            onClick={() =>
              setTab("sale")
            }
          >

            <span className="re-category-icon">

              <HomeIcon
                size={20}
              />

            </span>


            <span>

              <strong>
                Homes for Sale
              </strong>

              <small>
                Find your next home
              </small>

            </span>

          </button>


          {/* ------------------------------------------------------------------
              RENTALS
          ------------------------------------------------------------------ */}

          <button
            type="button"
            className="re-category-card"
            onClick={() =>
              setTab("rent")
            }
          >

            <span className="re-category-icon">

              <KeyRound
                size={20}
              />

            </span>


            <span>

              <strong>
                Rentals
              </strong>

              <small>
                Apartments & homes
              </small>

            </span>

          </button>


          {/* ------------------------------------------------------------------
              LAND
          ------------------------------------------------------------------ */}

          <button
            type="button"
            className="re-category-card"
            onClick={() =>
              setTab("land")
            }
          >

            <span className="re-category-icon">

              <Trees
                size={20}
              />

            </span>


            <span>

              <strong>
                Land
              </strong>

              <small>
                Acreage & development
              </small>

            </span>

          </button>


          {/* ------------------------------------------------------------------
              COMMERCIAL
          ------------------------------------------------------------------ */}

          <button
            type="button"
            className="re-category-card"
            onClick={() =>
              setTab("commercial")
            }
          >

            <span className="re-category-icon">

              <Building2
                size={20}
              />

            </span>


            <span>

              <strong>
                Commercial
              </strong>

              <small>
                Business properties
              </small>

            </span>

          </button>

        </section>


        {/* ====================================================================
            RESULTS TOOLBAR
        ==================================================================== */}

        <div className="re-results-toolbar">

          <div className="re-results-count">

            <strong>
              {properties.length}
            </strong>{" "}

            properties found

          </div>


          <div className="re-toolbar-actions">

            {/* ================================================================
                FILTERS
            ================================================================ */}

            <button
              type="button"
              className="re-secondary"
              onClick={() =>
                setFiltersOpen(true)
              }
            >

              <SlidersHorizontal
                size={15}
              />

              Filters


              {activeFilterCount >
                0 && (

                <span className="re-filter-count">

                  {
                    activeFilterCount
                  }

                </span>

              )}

            </button>


            {/* ================================================================
                VIEW TOGGLE
            ================================================================ */}

            <div
              className="re-view-toggle"
              aria-label="Property view"
            >

              {/* GRID */}

              <button
                type="button"
                aria-label="Grid view"
                title="Grid view"
                className={
                  viewMode ===
                  "grid"
                    ? "is-active"
                    : ""
                }
                onClick={() =>
                  setViewMode(
                    "grid",
                  )
                }
              >

                <LayoutGrid
                  size={15}
                />

              </button>


              {/* LIST */}

              <button
                type="button"
                aria-label="List view"
                title="List view"
                className={
                  viewMode ===
                  "list"
                    ? "is-active"
                    : ""
                }
                onClick={() =>
                  setViewMode(
                    "list",
                  )
                }
              >

                <List
                  size={15}
                />

              </button>


              {/* MAP */}

              <button
                type="button"
                aria-label="Map view"
                title="Map view"
                className={
                  viewMode ===
                  "map"
                    ? "is-active"
                    : ""
                }
                onClick={() =>
                  setViewMode(
                    "map",
                  )
                }
              >

                <MapIcon
                  size={15}
                />

              </button>

            </div>

          </div>

        </div>


        {/* ====================================================================
            LOADING
        ==================================================================== */}

        {loading && (

          <div
            className="re-loading"
            role="status"
            aria-live="polite"
          >

            <div
              className="
                re-loading-spinner
              "
            />

            Loading properties...

          </div>

        )}


        {/* ====================================================================
            ERROR
        ==================================================================== */}

        {error &&
          !loading && (

            <div
              className="
                re-alert
                re-alert--error
              "
              role="alert"
            >

              <strong>
                Couldn't load
                properties
              </strong>


              <p>
                {error}
              </p>


              <button
                type="button"
                className="re-secondary"
                onClick={() =>
                  void fetchProperties(
                    params,
                  )
                }
              >

                Try again

              </button>

            </div>

          )}


        {/* ====================================================================
            EMPTY / MAP / GRID
        ==================================================================== */}

        {!loading &&
        !error &&
        properties.length === 0 ? (

          <div className="re-empty">

            <div
              className="
                re-empty__icon
              "
            >

              <SearchX
                size={22}
              />

            </div>


            <h3>
              No properties found
            </h3>


            <p>
              Try changing your
              search or filters.
            </p>


            <button
              type="button"
              className="re-secondary"
              onClick={
                clearFilters
              }
            >

              Clear filters

            </button>

          </div>

        ) : !loading &&
          !error &&
          viewMode === "map" ? (

          /* ================================================================
             MAP VIEW
          ================================================================ */

          <div className="re-split-view">

            <PropertyGrid
              properties={
                properties
              }
              savedIds={
                savedIds
              }
              onSave={
                toggleSaved
              }
              onOpen={
                setSelected
              }
              layout="list"
            />


            <PropertyMap
              properties={
                properties
              }
              onOpen={
                setSelected
              }
            />

          </div>

        ) : !loading &&
          !error ? (

          /* ================================================================
             GRID / LIST VIEW
          ================================================================ */

          <PropertyGrid
            properties={
              properties
            }
            savedIds={
              savedIds
            }
            onSave={
              toggleSaved
            }
            onOpen={
              setSelected
            }
            layout={
              viewMode === "list"
                ? "list"
                : "grid"
            }
          />

        ) : null}


        {/* ====================================================================
            FILTERS
        ==================================================================== */}

        <PropertyFilters
          open={
            filtersOpen
          }
          values={
            filters
          }
          onChange={
            setFilters
          }
          onClose={() =>
            setFiltersOpen(
              false,
            )
          }
          onApply={() =>
            setFiltersOpen(
              false,
            )
          }
          onReset={() =>
            setFilters({})
          }
        />

      </main>


      {/* ======================================================================
          MOBILE REAL ESTATE NAVIGATION
      ====================================================================== */}

      <RealEstateBottomNav />

    </div>

  );
};


export default RealEstatePage;
