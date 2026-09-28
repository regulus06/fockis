import React, {
  useEffect,
  useState,
} from "react";
import {
  Bath,
  Bed,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Maximize2,
  MapPin,
  PlayCircle,
  Trees,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import "../styles/PropertyCard.scss";

import type { Property } from "../types/Property";
import FavoriteButton from "./FavoriteButton";

interface PropertyCardProps {
  property: Property;
  saved: boolean;
  layout?: "grid" | "list";
  onSave: () => void;
  onOpen: () => void;
}

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=85";

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

/* ============================================================================
   VALIDATE PROPERTY IMAGES
============================================================================ */

const getValidImages = (
  images?: string[],
): string[] => {
  if (!Array.isArray(images)) {
    return [];
  }

  return images.filter(
    (url) =>
      typeof url === "string" &&
      url.trim().length > 0 &&
      !url.includes("/undefined") &&
      !url.includes("/null"),
  );
};

/* ============================================================================
   PROPERTY CARD
============================================================================ */

const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  saved,
  layout = "grid",
  onSave,
  onOpen,
}) => {
  const navigate = useNavigate();

  const images = getValidImages(
    property.images,
  );

  const displayImages =
    images.length > 0
      ? images
      : [FALLBACK_IMAGE];

  const [imageIndex, setImageIndex] =
    useState(0);

  /* ==========================================================================
     RESET CAROUSEL WHEN PROPERTY CHANGES
  ========================================================================== */

  useEffect(() => {
    setImageIndex(0);
  }, [property.id]);

  const isLand =
    property.type === "land";

  const currentImage =
    displayImages[
      Math.min(
        imageIndex,
        displayImages.length - 1,
      )
    ] || FALLBACK_IMAGE;

  /* ==========================================================================
     PREVIOUS IMAGE
  ========================================================================== */

  const previousImage = (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    event.stopPropagation();

    if (displayImages.length <= 1) {
      return;
    }

    setImageIndex((current) =>
      current === 0
        ? displayImages.length - 1
        : current - 1,
    );
  };

  /* ==========================================================================
     NEXT IMAGE
  ========================================================================== */

  const nextImage = (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    event.stopPropagation();

    if (displayImages.length <= 1) {
      return;
    }

    setImageIndex((current) =>
      current === displayImages.length - 1
        ? 0
        : current + 1,
    );
  };

  /* ==========================================================================
     SELECT IMAGE
  ========================================================================== */

  const selectImage = (
    event: React.MouseEvent<HTMLButtonElement>,
    index: number,
  ) => {
    event.stopPropagation();
    setImageIndex(index);
  };

  /* ==========================================================================
     IMAGE ERROR
  ========================================================================== */

  const handleImageError = (
    event: React.SyntheticEvent<HTMLImageElement>,
  ) => {
    const image = event.currentTarget;

    if (image.src !== FALLBACK_IMAGE) {
      image.src = FALLBACK_IMAGE;
    }
  };

  const handleThumbnailError = (
    event: React.SyntheticEvent<HTMLImageElement>,
  ) => {
    const image = event.currentTarget;

    if (image.src !== FALLBACK_IMAGE) {
      image.src = FALLBACK_IMAGE;
    }
  };

  /* ==========================================================================
     SAVE
  ========================================================================== */

  const handleSave = (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    event.stopPropagation();
    onSave();
  };

  /* ==========================================================================
     EDIT PROPERTY
  ========================================================================== */

  const handleEdit = (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    event.stopPropagation();

    const id = String(property.id);

    if (!id || id === "undefined" || id === "null") {
      console.error(
        "Cannot edit property: invalid property ID.",
        property,
      );
      return;
    }

    navigate(
      `/realestate/property/${encodeURIComponent(id)}/edit`,
    );
  };

  return (
    <article
      className={`property-card property-card--${layout}`}
      onClick={onOpen}
    >
      {/* ======================================================================
          IMAGE + THUMBNAILS
      ====================================================================== */}

      <div className="property-card__image">
        <div className="property-card__image-main">
          <img
            src={currentImage}
            alt={`${property.title} - Image ${
              imageIndex + 1
            }`}
            loading="lazy"
            onError={handleImageError}
          />

          {/* BADGES */}

          <div className="property-card__badges">
            <span
              className={`re-badge re-badge--${property.status}`}
            >
              {property.status === "sale"
                ? "For Sale"
                : "For Rent"}
            </span>

            {property.verified && (
              <span className="re-badge re-badge--verified">
                <CheckCircle2 size={12} />
                Verified
              </span>
            )}
          </div>

          {/* FAVORITE */}

          <div onClick={(event) => event.stopPropagation()}>
            <FavoriteButton
              saved={saved}
              onClick={onSave}
            />
          </div>

          {/* PREVIOUS / NEXT */}

          {displayImages.length > 1 && (
            <>
              <button
                type="button"
                className="property-card__image-nav property-card__image-nav--left"
                aria-label="Previous property image"
                onClick={previousImage}
              >
                <ChevronLeft size={18} />
              </button>

              <button
                type="button"
                className="property-card__image-nav property-card__image-nav--right"
                aria-label="Next property image"
                onClick={nextImage}
              >
                <ChevronRight size={18} />
              </button>
            </>
          )}

          {/* IMAGE COUNT */}

          <div className="property-card__image-bottom">
            <span>
              <Camera size={13} />
              {images.length}
            </span>

            {property.virtualTour && (
              <span>
                <PlayCircle size={13} />
                Tour
              </span>
            )}
          </div>
        </div>

        {/* IMAGE THUMBNAILS — own row below the main photo */}

        {displayImages.length > 1 && (
          <div
            className="property-card__thumbs"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            {displayImages.map(
              (img, index) => (
                <button
                  key={index}
                  type="button"
                  aria-label={`View image ${
                    index + 1
                  }`}
                  className={
                    index === imageIndex
                      ? "is-active"
                      : ""
                  }
                  onClick={(event) =>
                    selectImage(
                      event,
                      index,
                    )
                  }
                >
                  <img
                    src={img}
                    alt={`Thumbnail ${
                      index + 1
                    }`}
                    loading="lazy"
                    onError={
                      handleThumbnailError
                    }
                  />
                </button>
              ),
            )}
          </div>
        )}
      </div>

      {/* ======================================================================
          BODY
      ====================================================================== */}

      <div className="property-card__body">
        {/* PRICE */}

        <div className="property-card__price-row">
          <strong>
            {formatMoney(property.price)}

            {property.status === "rent" && (
              <small>/mo</small>
            )}
          </strong>

          {isLand &&
            property.acreage !== undefined &&
            property.acreage > 0 && (
              <span className="acreage">
                {property.acreage} acres
              </span>
            )}
        </div>

        {/* TITLE */}

        <h3>{property.title}</h3>

        {/* ADDRESS */}

        <p className="property-card__address">
          <MapPin size={14} />

          {property.address}

          {property.city &&
            `, ${property.city}`}

          {property.state &&
            `, ${property.state}`}
        </p>

        {/* PROPERTY STATS */}

        {!isLand ? (
          <div className="property-card__stats">
            {property.beds !== undefined && (
              <span>
                <Bed size={14} />
                {property.beds} bd
              </span>
            )}

            {property.baths !== undefined && (
              <span>
                <Bath size={14} />
                {property.baths} ba
              </span>
            )}

            {property.sqft !== undefined && (
              <span>
                <Maximize2 size={14} />
                {Number(
                  property.sqft,
                ).toLocaleString()}{" "}
                sqft
              </span>
            )}
          </div>
        ) : (
          <div className="property-card__stats">
            <span>
              <Trees size={14} />
              {property.zoning ||
                "Development land"}
            </span>
          </div>
        )}

        {/* FOOTER */}

        <div className="property-card__footer">
          <div className="property-agent-mini">
            <span>
              {property.agent?.avatar ||
                property.agent?.name
                  ?.slice(0, 2)
                  .toUpperCase() ||
                "AG"}
            </span>

            {property.agent?.name ||
              "Property Agent"}
          </div>

          <small>{property.type}</small>
        </div>

        {/* EDIT BUTTON */}

        <button
          type="button"
          className="property-card__edit"
          onClick={handleEdit}
        >
          <Edit3 size={15} />
          <span>Edit Property</span>
        </button>
      </div>
    </article>
  );
};

export default PropertyCard;