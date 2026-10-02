import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Heart,
  MapPin,
  MessageCircle,
  Share2,
  Calendar,
  Pencil,
} from "lucide-react";

import type { Property } from "../types/Property";
import { propertyApi } from "../services/propertyApi";
import { useSavePropertiesStore } from "../store/savePropertiesStore";

import PropertyGallery from "../components/PropertyGallery";
import PropertyFeatures from "../components/PropertyFeatures";
import PropertyAgent from "../components/PropertyAgent";
import MortgageCalculator from "../components/MortgageCalculator";
import PropertyContactForm from "../components/PropertyContactForm";
import ScheduleTourModal from "../components/ScheduleTourModal";

import "../styles/RealEstatePage.scss";
import "../styles/_input-reset.scss";

interface PropertyDetailsPageProps {
  propertyId?: string;
  onBack?: () => void;
}

const PropertyDetailsPage: React.FC<PropertyDetailsPageProps> = ({
  propertyId,
  onBack,
}) => {
  const navigate = useNavigate();

  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);

  const { isSaved, toggleSaved } = useSavePropertiesStore();

  useEffect(() => {
    if (!propertyId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);

    propertyApi
      .getProperty(propertyId)
      .then((result) => {
        setProperty(result);
      })
      .catch((err) => {
        console.error("Failed to load property:", err);

        setProperty(null);

        setLoadError(
          err instanceof Error
            ? err.message
            : "Failed to load property",
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [propertyId]);

  if (loading) {
    return (
      <div className="re-page">
        <div className="re-loading">
          <div className="re-loading-spinner" />
          Loading property...
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="re-page">
        <div className="re-empty">
          <h2>Property not found</h2>

          {loadError && (
            <div
              className="re-alert re-alert--error"
              style={{ marginTop: "12px" }}
            >
              <p style={{ margin: 0 }}>
                {loadError}
              </p>
            </div>
          )}

          <button
            type="button"
            className="re-primary"
            style={{ marginTop: "16px" }}
            onClick={onBack}
          >
            Back to properties
          </button>
        </div>
      </div>
    );
  }

  const saved = isSaved(property.id);

  return (
    <div className="re-page">
      <div className="re-container">

        {/* ================================================================
            TOP BAR
        ================================================================ */}

        <div className="re-details-topbar">
          <button
            type="button"
            className="re-back"
            onClick={onBack}
          >
            <ArrowLeft size={17} />
            Back to properties
          </button>

          <button
            type="button"
            className="re-secondary"
            onClick={() =>
              navigate(
                `/realestate/property/${property.id}/edit`,
              )
            }
          >
            <Pencil size={15} />
            Edit listing
          </button>
        </div>

        {/* ================================================================
            GALLERY
        ================================================================ */}

        <PropertyGallery
          images={property.images}
          virtualTour={property.virtualTour}
        />

        {/* ================================================================
            DETAILS
        ================================================================ */}

        <div className="re-details-layout">

          <main>

            <div className="re-details-header">

              <span
                className={`re-badge re-badge--${property.status}`}
              >
                {property.status === "sale"
                  ? "For Sale"
                  : "For Rent"}
              </span>

              {property.verified && (
                <span className="re-badge re-badge--verified">
                  Verified
                </span>
              )}

              <h1>
                {property.title}
              </h1>

              <p className="re-details-address">
                <MapPin size={15} />

                {property.address}

                {property.city &&
                  `, ${property.city}`}

                {property.state &&
                  `, ${property.state}`}
              </p>

              <strong className="re-details-price">
                {property.price.toLocaleString(
                  "en-US",
                  {
                    style: "currency",
                    currency: "USD",
                    maximumFractionDigits: 0,
                  },
                )}

                {property.status === "rent" && (
                  <small>/mo</small>
                )}
              </strong>

              <div className="re-details-stats">

                {property.beds !== undefined && (
                  <span>
                    {property.beds} Beds
                  </span>
                )}

                {property.baths !== undefined && (
                  <span>
                    {property.baths} Baths
                  </span>
                )}

                {property.sqft !== undefined && (
                  <span>
                    {Number(
                      property.sqft,
                    ).toLocaleString()}{" "}
                    sqft
                  </span>
                )}

                {property.lot && (
                  <span>
                    {property.lot}
                  </span>
                )}

              </div>

              {/* ==========================================================
                  ACTIONS
              ========================================================== */}

              <div className="re-details-actions">

                <button
                  type="button"
                  className="re-secondary"
                  onClick={() =>
                    toggleSaved(property.id)
                  }
                >
                  <Heart
                    size={16}
                    fill={
                      saved
                        ? "currentColor"
                        : "none"
                    }
                  />

                  {saved
                    ? "Saved"
                    : "Save"}
                </button>

                <button
                  type="button"
                  className="re-secondary"
                >
                  <Share2 size={16} />
                  Share
                </button>

                <button
                  type="button"
                  className="re-secondary"
                  onClick={() =>
                    setContactOpen(true)
                  }
                >
                  <MessageCircle size={16} />
                  Contact
                </button>

                <button
                  type="button"
                  className="re-primary"
                  onClick={() =>
                    setTourOpen(true)
                  }
                >
                  <Calendar size={16} />
                  Schedule Tour
                </button>

              </div>
            </div>

            {/* ============================================================
                DESCRIPTION
            ============================================================ */}

            <section className="re-section">
              <h2>
                About this property
              </h2>

              <p>
                {property.description}
              </p>
            </section>

            {/* ============================================================
                FEATURES
            ============================================================ */}

            <section className="re-section">
              <h2>
                Property features
              </h2>

              <PropertyFeatures
                features={
                  property.features || []
                }
              />
            </section>

            {/* ============================================================
                PROPERTY DETAILS
            ============================================================ */}

            <section className="re-section">

              <h2>
                Property details
              </h2>

              <div className="re-spec-grid">

                <div>
                  <span>
                    Property type
                  </span>

                  <strong>
                    {property.type}
                  </strong>
                </div>

                <div>
                  <span>
                    Year built
                  </span>

                  <strong>
                    {property.details?.yearBuilt ||
                      "—"}
                  </strong>
                </div>

                <div>
                  <span>
                    Parking
                  </span>

                  <strong>
                    {property.details?.parking ||
                      "—"}
                  </strong>
                </div>

                <div>
                  <span>
                    Heating
                  </span>

                  <strong>
                    {property.details?.heating ||
                      "—"}
                  </strong>
                </div>

                <div>
                  <span>
                    Cooling
                  </span>

                  <strong>
                    {property.details?.cooling ||
                      "—"}
                  </strong>
                </div>

                <div>
                  <span>
                    Listing ID
                  </span>

                  <strong>
                    {property.details?.mls ||
                      "—"}
                  </strong>
                </div>

              </div>

            </section>

            {/* ============================================================
                LOCATION
            ============================================================ */}

            <section className="re-section">

              <h2>
                Location
              </h2>

              <div className="re-location-map">

                <MapPin size={35} />

                <span>
                  {property.city},{" "}
                  {property.state}
                </span>

              </div>

            </section>

            {/* ============================================================
                MORTGAGE
            ============================================================ */}

            {property.status === "sale" &&
              property.type !== "land" && (
                <section className="re-section">

                  <h2>
                    Mortgage calculator
                  </h2>

                  <MortgageCalculator
                    price={property.price}
                  />

                </section>
              )}

          </main>

          {/* ==============================================================
              SIDEBAR
          ============================================================== */}

          <aside>

            <PropertyAgent
              agent={property.agent}
              onMessage={() =>
                setContactOpen(true)
              }
              onTour={() =>
                setTourOpen(true)
              }
            />

            <div className="re-social-card">

              <h3>
                Share on Fockis
              </h3>

              <button
                type="button"
              >
                <Share2 size={15} />
                Post to feed
              </button>

              <button
                type="button"
              >
                <MessageCircle size={15} />
                Send in message
              </button>

            </div>

          </aside>

        </div>
      </div>

      {/* ================================================================
          CONTACT MODAL
      ================================================================ */}

      {contactOpen && (
        <PropertyContactForm
          property={property}
          onClose={() =>
            setContactOpen(false)
          }
        />
      )}

      {/* ================================================================
          TOUR MODAL
      ================================================================ */}

      {tourOpen && (
        <ScheduleTourModal
          property={property}
          onClose={() =>
            setTourOpen(false)
          }
        />
      )}

    </div>
  );
};

export default PropertyDetailsPage;