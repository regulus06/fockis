import { useEffect, useState } from "react";

import {
  Link,
  useParams,
} from "react-router-dom";

import { businessesApi } from "../services/businessesApi";

import type { Business } from "../types/business.types";

import "../styles/BusinessPage.scss";

import BusinessFeedRail from "../components/BusinessFeedRail";
import BusinessShopRail from "../components/BusinessShopRail";

/* ============================================================================
   BUSINESS PROFILE PAGE
============================================================================ */

export default function BusinessPage() {
  const { businessId } = useParams<{
    businessId: string;
  }>();

  const [business, setBusiness] =
    useState<Business | null>(null);

  const [loading, setLoading] =
    useState(true);

  /* ==========================================================================
     LOAD BUSINESS PROFILE
  ========================================================================== */

  useEffect(() => {
    let mounted = true;

    async function loadBusiness() {
      try {
        if (!businessId) {
          setLoading(false);
          return;
        }

        setLoading(true);

        console.log(
          "[BusinessPage] Loading:",
          businessId,
        );

        const data =
          await businessesApi.getById(
            businessId,
          );

        console.log(
          "[BusinessPage] DATA:",
          data,
        );

        if (!mounted) {
          return;
        }

        setBusiness(data);
      } catch (error) {
        console.error(
          "[BusinessPage] Failed:",
          error,
        );

        if (mounted) {
          setBusiness(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadBusiness();

    return () => {
      mounted = false;
    };
  }, [businessId]);

  /* ==========================================================================
     LOADING
  ========================================================================== */

  if (loading) {
    return (
      <main className="fk-business-page">
        <div className="fk-business-loading">
          Loading business...
        </div>
      </main>
    );
  }

  /* ==========================================================================
     EMPTY
  ========================================================================== */

  if (!business) {
    return (
      <main className="fk-business-page">
        <div className="fk-business-empty">
          <h2>Business not found</h2>

          <p>
            This business profile is unavailable.
          </p>
        </div>
      </main>
    );
  }

  /* ==========================================================================
     PAGE
  ========================================================================== */

  return (
    <main className="fk-business-page">

      {/* ================================================================
          BACK TO BUSINESSES
      ================================================================= */}

      <div
        className="fk-business-page__back"
      >

        <Link
          to="/businesses"
          className="fk-business-page__back-button"
        >
          <span aria-hidden="true">
            ←
          </span>

          All Businesses
        </Link>

      </div>
      {/* ================================================================
          BUSINESS HERO
      ================================================================= */}

      <section className="fk-business-profile">
        <div className="fk-business-profile__cover">
          {business.coverImageUrl ? (
            <img
              src={business.coverImageUrl}
              alt={business.name}
            />
          ) : (
            <div>🏢</div>
          )}
        </div>

        <div className="fk-business-profile__content">
          <div className="fk-business-profile__identity">
            {business.logoUrl ? (
              <img
                src={business.logoUrl}
                alt=""
              />
            ) : (
              <span>🏢</span>
            )}

            <div>
              <h1>{business.name}</h1>

              <span>
                {business.category ||
                  "BUSINESS"}
              </span>
            </div>
          </div>

          {/* ABOUT */}

          <div className="fk-business-profile__about">
            <h2>About</h2>

            <p>
              {business.description ||
                "No description available."}
            </p>
          </div>

          {/* CONTACT */}

          <div className="fk-business-profile__contact">
            <h2>Contact</h2>

            {business.phone && (
              <span>
                📞 {business.phone}
              </span>
            )}

            {business.email && (
              <span>
                ✉️ {business.email}
              </span>
            )}

            {(business.city ||
              business.state) && (
              <span>
                📍{" "}
                {[
                  business.city,
                  business.state,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ================================================================
          BUSINESS FEED
      ================================================================= */}

      <section className="fk-business-page__section">
        <BusinessFeedRail />
      </section>

      {/* ================================================================
          FOCKIS SHOP
          The rail finds an active Store whose businessId matches
          this Business.id. No duplicate store/business system is created.
      ================================================================= */}

      <section className="fk-business-page__section">
        <BusinessShopRail
          business={business}
        />
      </section>
    </main>
  );
}
