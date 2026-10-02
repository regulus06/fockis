import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  businessesApi,
} from "../services/businessesApi";

import {
  listStores,
} from "../../fockis-shop/services/storeApi";

import type {
  Business,
  BusinessCategory,
} from "../types/business.types";

import type {
  Store,
} from "../../fockis-shop/types/store.types";


import "../styles/BusinessesPage.scss";

/* ============================================================================
   EXTERNAL BUSINESS WEBSITE
============================================================================ */

function normalizeBusinessWebsite(
  website?: string | null,
): string | null {
  const value = website?.trim();

  if (!value) {
    return null;
  }

  if (
    value.startsWith("http://") ||
    value.startsWith("https://")
  ) {
    return value;
  }

  return `https://${value}`;
}


/* ============================================================================
   BUSINESSES DIRECTORY
============================================================================ */

export default function BusinessesPage() {

  const [
    businesses,
    setBusinesses,
  ] = useState<Business[]>([]);


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    error,
    setError,
  ] = useState<string | null>(null);


  const [
    search,
    setSearch,
  ] = useState("");

  const [
    selectedCategory,
    setSelectedCategory,
  ] = useState<BusinessCategory | "ALL">(
    "ALL",
  );

  const [
    stores,
    setStores,
  ] = useState<Store[]>([]);

  const [
    storesLoading,
    setStoresLoading,
  ] = useState(true);

  const [
    storesError,
    setStoresError,
  ] = useState<string | null>(null);


  /* ==========================================================================
     LOAD BUSINESSES
  ========================================================================== */

  useEffect(() => {

    let mounted = true;


    async function loadBusinesses() {

      try {

        setLoading(true);
        setError(null);


        console.log(
          "[BusinessesPage] Loading businesses...",
        );


        /*
         * Reuse the existing businesses API.
         * No backend changes are required.
         */
        const data =
          await businessesApi.getAll();


        if (!mounted) {
          return;
        }


        setBusinesses(
          Array.isArray(data)
            ? data
            : [],
        );


      } catch (err) {

        console.error(
          "[BusinessesPage] Failed to load businesses:",
          err,
        );


        if (mounted) {

          setBusinesses([]);

          setError(
            err instanceof Error
              ? err.message
              : "Unable to load businesses.",
          );

        }


      } finally {

        if (mounted) {

          setLoading(false);

        }

      }

    }


    void loadBusinesses();


    return () => {

      mounted = false;

    };

  }, []);



  /* ==========================================================================
     LOAD FOCKIS SHOP STORES
  ========================================================================== */

  useEffect(() => {
    let mounted = true;

    async function loadStores() {
      try {
        setStoresLoading(true);
        setStoresError(null);

        /*
         * Use the existing Fockis Shop Store API.
         * Walk through every public page so the directory can show
         * all stores returned by the backend, not only the first 100.
         */
        const firstPage = await listStores({
          page: 1,
          pageSize: 100,
        });

        const allStores: Store[] = [
          ...(firstPage.items ?? []),
        ];

        const totalPages = Math.max(
          1,
          firstPage.pages ?? 1,
        );

        for (
          let page = 2;
          page <= totalPages;
          page += 1
        ) {
          const nextPage = await listStores({
            page,
            pageSize: 100,
          });

          allStores.push(
            ...(nextPage.items ?? []),
          );
        }

        if (!mounted) {
          return;
        }

        const uniqueStores = Array.from(
          new Map(
            allStores.map((store) => [
              store.id || store.slug,
              store,
            ]),
          ).values(),
        );

        setStores(uniqueStores);
      } catch (err) {
        console.error(
          "[BusinessesPage] Failed to load Fockis Shop stores:",
          err,
        );

        if (mounted) {
          setStores([]);
          setStoresError(
            err instanceof Error
              ? err.message
              : "Unable to load Fockis Shop stores.",
          );
        }
      } finally {
        if (mounted) {
          setStoresLoading(false);
        }
      }
    }

    void loadStores();

    return () => {
      mounted = false;
    };
  }, []);


  /* ==========================================================================
     FILTER
  ========================================================================== */

  const filteredBusinesses = useMemo(() => {

    const query =
      search.trim().toLowerCase();


    return businesses.filter(
      (business) => {
        const matchesCategory =
          selectedCategory === "ALL" ||
          business.category === selectedCategory;

        if (!matchesCategory) {
          return false;
        }

        if (!query) {
          return true;
        }

        const searchableText = [
          business.name,
          business.category,
          business.description,
          business.city,
          business.state,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(query);
      },
    );

  }, [
    businesses,
    search,
    selectedCategory,
  ]);


  const filteredStores = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    if (!query) {
      return stores;
    }

    return stores.filter(
      (store) => {
        const category =
          Array.isArray(store.categories)
            ? store.categories.join(" ")
            : "";

        const searchableText = [
          store.name,
          store.description,
          category,
          store.location?.city,
          store.location?.state,
          store.location?.country,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(query);
      },
    );
  }, [
    stores,
    search,
  ]);


  const BUSINESS_CATEGORIES: Array<{
    value: BusinessCategory;
    label: string;
  }> = [
    {
      value: "AUTOMOTIVE",
      label: "Automotive",
    },
    {
      value: "RESTAURANT",
      label: "Restaurant",
    },
    {
      value: "REAL_ESTATE",
      label: "Real Estate",
    },
    {
      value: "RETAIL",
      label: "Retail",
    },
    {
      value: "BEAUTY",
      label: "Beauty",
    },
    {
      value: "HEALTH",
      label: "Health",
    },
    {
      value: "FITNESS",
      label: "Fitness",
    },
    {
      value: "TECHNOLOGY",
      label: "Technology",
    },
    {
      value: "PROFESSIONAL_SERVICES",
      label: "Professional Services",
    },
    {
      value: "HOME_SERVICES",
      label: "Home Services",
    },
    {
      value: "ENTERTAINMENT",
      label: "Entertainment",
    },
    {
      value: "TRAVEL",
      label: "Travel",
    },
    {
      value: "EDUCATION",
      label: "Education",
    },
    {
      value: "FINANCE",
      label: "Finance",
    },
    {
      value: "OTHER",
      label: "Other / Company",
    },
  ];

  const groupedBusinesses = useMemo(() => {
    const groups: Array<{
      category: BusinessCategory;
      label: string;
      businesses: Business[];
    }> = [];

    for (const category of BUSINESS_CATEGORIES) {
      const categoryBusinesses =
        filteredBusinesses.filter(
          (business) =>
            business.category === category.value,
        );

      if (
        selectedCategory === category.value ||
        categoryBusinesses.length > 0
      ) {
        groups.push({
          category: category.value,
          label: category.label,
          businesses: categoryBusinesses,
        });
      }
    }

    return groups;
  }, [filteredBusinesses, selectedCategory]);

  /* ==========================================================================
     LOADING
  ========================================================================== */

  if (loading) {

    return (

      <main
        className="fk-businesses-page"
      >

        <div
          className="fk-businesses-page__loading"
        >

          <div
            className="fk-businesses-page__spinner"
            aria-hidden="true"
          />

          <h2>
            Loading businesses...
          </h2>

          <p>
            Finding businesses on Fockis.
          </p>

        </div>

      </main>

    );

  }



  /* ==========================================================================
     ERROR
  ========================================================================== */

  if (error) {

    return (

      <main
        className="fk-businesses-page"
      >

        <section
          className="fk-businesses-page__error"
        >

          <div
            className="fk-businesses-page__error-icon"
            aria-hidden="true"
          >
            ⚠️
          </div>


          <h1>
            Businesses unavailable
          </h1>


          <p>
            {error}
          </p>


          <button
            type="button"
            onClick={() => window.location.reload()}
            className="fk-businesses-page__retry"
          >
            Try Again
          </button>

        </section>

      </main>

    );

  }



  /* ==========================================================================
     PAGE
  ========================================================================== */

  return (

    <main
      className="fk-businesses-page"
    >


      {/* ================================================================
          HEADER
      ================================================================= */}

      <header
        className="fk-businesses-page__header"
      >

        <div
          className="fk-businesses-page__header-copy"
        >

          <span
            className="fk-businesses-page__eyebrow"
          >
            FOCKIS
          </span>


          <h1>
            Businesses
          </h1>


          <p>
            Discover businesses, services, and local
            companies on Fockis.
          </p>

        </div>


        <Link
          to="/business/manager"
          className="fk-businesses-page__manage"
        >
          ⚙️ Manage Business
        </Link>

      </header>



      {/* ================================================================
          SEARCH
      ================================================================= */}

      <section
        className="fk-businesses-page__toolbar"
      >

        <label
          className="fk-businesses-page__search"
        >

          <span
            aria-hidden="true"
          >
            🔎
          </span>


          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search businesses..."
            aria-label="Search businesses"
          />

        </label>


        <span
          className="fk-businesses-page__count"
        >
          {filteredBusinesses.length}{" "}
          {filteredBusinesses.length === 1
            ? "business"
            : "businesses"}
        </span>

      </section>



      {/* ================================================================
          CATEGORY NAVIGATION
      ================================================================= */}

      <section
        className="fk-businesses-page__categories"
        aria-label="Business categories"
      >
        <button
          type="button"
          className={
            selectedCategory === "ALL"
              ? "fk-businesses-page__category-button fk-businesses-page__category-button--active"
              : "fk-businesses-page__category-button"
          }
          onClick={() => setSelectedCategory("ALL")}
        >
          All
        </button>

        {BUSINESS_CATEGORIES.map(
          (category) => (
            <button
              key={category.value}
              type="button"
              className={
                selectedCategory === category.value
                  ? "fk-businesses-page__category-button fk-businesses-page__category-button--active"
                  : "fk-businesses-page__category-button"
              }
              onClick={() =>
                setSelectedCategory(category.value)
              }
            >
              {category.label}
            </button>
          ),
        )}
      </section>

      {/* ================================================================
          EMPTY SEARCH
      ================================================================= */}

      {filteredBusinesses.length === 0 && selectedCategory === "ALL" ? (

        <section
          className="fk-businesses-page__empty"
        >

          <div
            className="fk-businesses-page__empty-icon"
            aria-hidden="true"
          >
            🏢
          </div>


          <h2>
            {search.trim()
              ? "No businesses found"
              : selectedCategory === "ALL"
                ? "No businesses yet"
                : `No ${BUSINESS_CATEGORIES.find(
                    (category) =>
                      category.value === selectedCategory,
                  )?.label ?? "businesses"} businesses yet`}
          </h2>


          <p>
            {search.trim()
              ? "Try a different business name, category, or location."
              : selectedCategory === "ALL"
                ? "Businesses created on Fockis will appear here."
                : "Businesses created in this category will appear here."}
          </p>


          {search.trim() && (

            <button
              type="button"
              className="fk-businesses-page__clear"
              onClick={() => setSearch("")}
            >
              Clear Search
            </button>

          )}

        </section>

      ) : (

        <>
        {/* ==============================================================
           BUSINESS CATEGORIES
        ============================================================== */}

        <section
          className="fk-businesses-page__categories-list"
          aria-label="Businesses by category"
        >
          {groupedBusinesses.map(
            (group) => (
              <section
                key={group.category}
                className="fk-businesses-page__category-section"
                aria-labelledby={`business-category-${group.category}`}
              >
                <div className="fk-businesses-page__category-header">
                  <div>
                    <span className="fk-businesses-page__category-eyebrow">
                      CATEGORY
                    </span>

                    <h2
                      id={`business-category-${group.category}`}
                    >
                      {group.label}
                    </h2>
                  </div>

                  <span className="fk-businesses-page__category-count">
                    {group.businesses.length}{" "}
                    {group.businesses.length === 1
                      ? "business"
                      : "businesses"}
                  </span>
                </div>

                {group.businesses.length === 0 ? (
                  <div
                    className="fk-businesses-page__empty fk-businesses-page__category-empty"
                    role="status"
                  >
                    <div
                      className="fk-businesses-page__empty-icon"
                      aria-hidden="true"
                    >
                      🏢
                    </div>

                    <h2>
                      No {group.label} businesses yet
                    </h2>

                    <p>
                      Businesses added to the {group.label.toLowerCase()} category
                      will appear here.
                    </p>
                  </div>
                ) : (
                  <div
                    className="fk-businesses-page__grid"
                    aria-label={`${group.label} businesses`}
                  >
                    {group.businesses.map(
                      (business) => {
                      const location = [
                        business.city,
                        business.state,
                      ]
                        .filter(Boolean)
                        .join(", ");

                      const website =
                        normalizeBusinessWebsite(
                          business.websiteUrl,
                        );

                      const businessStore =
                        stores.find(
                          (store) =>
                            String(
                              store.businessId ?? "",
                            ) ===
                              String(business.id) &&
                            store.status === "active",
                        ) ?? null;

                      return (
                        <article
                          key={business.id}
                          className="fk-business-card"
                        >
                          <Link
                            to={`/businesses/${encodeURIComponent(
                              business.id,
                            )}`}
                            className="fk-business-card__image-link"
                            aria-label={`Open ${business.name}`}
                          >
                            <div className="fk-business-card__image">
                              {business.coverImageUrl ? (
                                <img
                                  src={business.coverImageUrl}
                                  alt={`${business.name} cover`}
                                />
                              ) : (
                                <div
                                  className="fk-business-card__image-placeholder"
                                  aria-hidden="true"
                                >
                                  🏢
                                </div>
                              )}
                            </div>
                          </Link>

                          <div className="fk-business-card__content">
                            <div className="fk-business-card__identity">
                              <div className="fk-business-card__logo">
                                {business.logoUrl ? (
                                  <img
                                    src={business.logoUrl}
                                    alt=""
                                  />
                                ) : (
                                  <span aria-hidden="true">
                                    🏢
                                  </span>
                                )}
                              </div>

                              <div className="fk-business-card__identity-copy">
                                <h2>{business.name}</h2>

                                <span className="fk-business-card__category">
                                  {business.category ||
                                    "BUSINESS"}
                                </span>
                              </div>
                            </div>

                            {business.description && (
                              <p className="fk-business-card__description">
                                {business.description}
                              </p>
                            )}

                            {location && (
                              <div className="fk-business-card__location">
                                📍 {location}
                              </div>
                            )}

                            <div className="fk-business-card__actions">
                              <Link
                                to={`/businesses/${encodeURIComponent(
                                  business.id,
                                )}`}
                                className="fk-business-card__button"
                              >
                                View Business
                                <span aria-hidden="true">
                                  →
                                </span>
                              </Link>

                              {website && (
                                <a
                                  href={website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="fk-business-card__website-button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                  }}
                                >
                                  🌐 Visit Website
                                  <span aria-hidden="true">
                                    ↗
                                  </span>
                                </a>
                              )}

                              {businessStore && (
                                <Link
                                  to={`/shop/store/${encodeURIComponent(
                                    businessStore.slug,
                                  )}`}
                                  className="fk-business-card__store-button"
                                >
                                  🛍️ Visit Fockis Store
                                  <span aria-hidden="true">
                                    →
                                  </span>
                                </Link>
                              )}
                            </div>
                          </div>
                        </article>
                      );
                    },
                    )}
                  </div>
                )}
              </section>
            ),
          )}
        </section>
        </>
      )}

      {/* ================================================================
          FOCKIS SHOP STORES
      ================================================================= */}

      <section
        className="fk-businesses-page__stores-section"
        aria-label="Fockis Shop stores"
      >
        <div className="fk-businesses-page__stores-header">
          <div>
            <span className="fk-businesses-page__eyebrow">
              FOCKIS SHOP
            </span>

            <h2>
              🛍️ Fockis Stores
            </h2>

            <p>
              Discover every public store created on Fockis.
            </p>
          </div>

          <span className="fk-businesses-page__stores-count">
            {filteredStores.length}{" "}
            {filteredStores.length === 1
              ? "store"
              : "stores"}
          </span>
        </div>


        {storesLoading ? (

          <div className="fk-businesses-page__stores-loading">
            <div className="fk-businesses-page__store-skeleton" />
            <div className="fk-businesses-page__store-skeleton" />
          </div>

        ) : storesError ? (

          <div className="fk-businesses-page__stores-error">
            <span aria-hidden="true">
              ⚠️
            </span>

            <div>
              <strong>
                Fockis Shop stores unavailable
              </strong>

              <p>
                {storesError}
              </p>
            </div>
          </div>

        ) : filteredStores.length === 0 ? (

          <div className="fk-businesses-page__stores-empty">
            <span aria-hidden="true">
              🛍️
            </span>

            <strong>
              No Fockis Shop stores found
            </strong>

            <p>
              {search.trim()
                ? "Try a different store name, category, or location."
                : "Stores created on Fockis will appear here."}
            </p>
          </div>

        ) : (

          <div
            className="fk-businesses-page__stores-grid"
            aria-label="Fockis Shop stores"
          >
            {filteredStores.map(
              (store) => {
                const category =
                  Array.isArray(store.categories)
                    ? store.categories[0]
                    : "";

                const location = [
                  store.location?.city,
                  store.location?.state,
                  store.location?.country,
                ]
                  .filter(Boolean)
                  .join(", ");

                const productCount =
                  Number(store.productCount ?? 0);

                return (
                  <article
                    key={
                      store.id ||
                      store.slug
                    }
                    className="fk-store-card"
                  >
                    <Link
                      to={`/shop/store/${encodeURIComponent(
                        store.slug,
                      )}`}
                      className="fk-store-card__image-link"
                      aria-label={`Open ${store.name}`}
                    >
                      <div className="fk-store-card__image">
                        {store.bannerUrl ? (
                          <img
                            src={store.bannerUrl}
                            alt={`${store.name} banner`}
                          />
                        ) : (
                          <div
                            className="fk-store-card__image-placeholder"
                            aria-hidden="true"
                          >
                            {store.emoji || "🛍️"}
                          </div>
                        )}
                      </div>
                    </Link>

                    <div className="fk-store-card__content">
                      <div className="fk-store-card__identity">
                        <div className="fk-store-card__logo">
                          {store.logoUrl ? (
                            <img
                              src={store.logoUrl}
                              alt=""
                            />
                          ) : (
                            <span aria-hidden="true">
                              {store.emoji || "🛍️"}
                            </span>
                          )}
                        </div>

                        <div className="fk-store-card__identity-copy">
                          <h3>
                            {store.name}
                          </h3>

                          {category && (
                            <span className="fk-store-card__category">
                              {category}
                            </span>
                          )}
                        </div>

                        {store.verified && (
                          <span
                            className="fk-store-card__verified"
                            title="Verified store"
                            aria-label="Verified store"
                          >
                            ✓
                          </span>
                        )}
                      </div>

                      {store.description && (
                        <p className="fk-store-card__description">
                          {store.description}
                        </p>
                      )}

                      {location && (
                        <div className="fk-store-card__location">
                          📍 {location}
                        </div>
                      )}

                      <div className="fk-store-card__stats">
                        <span>
                          {productCount}{" "}
                          {productCount === 1
                            ? "product"
                            : "products"}
                        </span>

                        {store.rating?.totalReviews > 0 && (
                          <span>
                            ⭐{" "}
                            {Number(
                              store.rating.average || 0,
                            ).toFixed(1)}
                          </span>
                        )}
                      </div>

                      <Link
                        to={`/shop/store/${encodeURIComponent(
                          store.slug,
                        )}`}
                        className="fk-store-card__button"
                      >
                        Visit Store

                        <span aria-hidden="true">
                          →
                        </span>
                      </Link>
                    </div>
                  </article>
                );
              },
            )}
          </div>
        )}
      </section>

    </main>

  );

}
