import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Camera,
  ChevronLeft,
  ChevronRight,
  PlayCircle,
} from "lucide-react";

/* ============================================================================
   TYPES
============================================================================ */

interface PropertyGalleryProps {
  images?: string[];
  virtualTour?: boolean;
}

/* ============================================================================
   CONSTANTS
============================================================================ */

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:3000";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=85";

/* ============================================================================
   IMAGE URL NORMALIZER
============================================================================ */

function normalizeImageUrl(
  image: string,
): string | null {
  if (
    typeof image !== "string"
  ) {
    return null;
  }

  const value =
    image.trim();

  if (!value) {
    return null;
  }

  /* --------------------------------------------------------------------------
     INVALID VALUES
  -------------------------------------------------------------------------- */

  if (
    value === "undefined" ||
    value === "null" ||
    value.includes("/undefined") ||
    value.includes("/null")
  ) {
    return null;
  }

  /* --------------------------------------------------------------------------
     ABSOLUTE URL
  -------------------------------------------------------------------------- */

  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:") ||
    value.startsWith("blob:")
  ) {
    return value;
  }

  /* --------------------------------------------------------------------------
     BACKEND PATH
     
     Examples:
       /uploads/property/image.jpg
       /realestate/uploads/image.jpg
  -------------------------------------------------------------------------- */

  if (value.startsWith("/")) {
    return `${API_BASE_URL}${value}`;
  }

  /* --------------------------------------------------------------------------
     RELATIVE UPLOAD PATH
     
     Examples:
       uploads/image.jpg
       property/image.jpg
  -------------------------------------------------------------------------- */

  if (
    value.startsWith("uploads/") ||
    value.startsWith("upload/")
  ) {
    return `${API_BASE_URL}/${value}`;
  }

  /* --------------------------------------------------------------------------
     BARE FILENAME
     
     Example:
       image-123.jpg
  -------------------------------------------------------------------------- */

  return `${API_BASE_URL}/uploads/${value}`;
}

/* ============================================================================
   COMPONENT
============================================================================ */

const PropertyGallery: React.FC<
  PropertyGalleryProps
> = ({
  images = [],
  virtualTour = false,
}) => {
  const [index, setIndex] =
    useState(0);

  /* ==========================================================================
     NORMALIZE ALL IMAGES
  ========================================================================== */

  const displayImages =
    useMemo(() => {
      const normalized =
        images
          .filter(
            (
              image,
            ): image is string =>
              typeof image === "string" &&
              image.trim().length > 0,
          )
          .map(
            normalizeImageUrl,
          )
          .filter(
            (
              image,
            ): image is string =>
              Boolean(image),
          );

      /* ----------------------------------------------------------------------
         Remove duplicate URLs
      ---------------------------------------------------------------------- */

      const unique =
        Array.from(
          new Set(normalized),
        );

      return unique.length > 0
        ? unique
        : [FALLBACK_IMAGE];
    }, [images]);

  /* ==========================================================================
     RESET CURRENT IMAGE WHEN PROPERTY CHANGES
  ========================================================================== */

  useEffect(() => {
    setIndex(0);
  }, [images]);

  /* ==========================================================================
     KEEP INDEX VALID
  ========================================================================== */

  useEffect(() => {
    if (
      index >=
      displayImages.length
    ) {
      setIndex(0);
    }
  }, [
    index,
    displayImages.length,
  ]);

  /* ==========================================================================
     PREVIOUS
  ========================================================================== */

  const previous = () => {
    if (
      displayImages.length <= 1
    ) {
      return;
    }

    setIndex(
      (current) =>
        (
          current -
          1 +
          displayImages.length
        ) %
        displayImages.length,
    );
  };

  /* ==========================================================================
     NEXT
  ========================================================================== */

  const next = () => {
    if (
      displayImages.length <= 1
    ) {
      return;
    }

    setIndex(
      (current) =>
        (
          current + 1
        ) %
        displayImages.length,
    );
  };

  /* ==========================================================================
     IMAGE ERROR
  ========================================================================== */

  const handleMainImageError = (
    event: React.SyntheticEvent<HTMLImageElement>,
  ) => {
    const img =
      event.currentTarget;

    if (
      img.src !== FALLBACK_IMAGE
    ) {
      img.src =
        FALLBACK_IMAGE;
    }
  };

  /* ==========================================================================
     THUMBNAIL ERROR
  ========================================================================== */

  const handleThumbnailError = (
    event: React.SyntheticEvent<HTMLImageElement>,
  ) => {
    const img =
      event.currentTarget;

    if (
      img.src !== FALLBACK_IMAGE
    ) {
      img.src =
        FALLBACK_IMAGE;
    }
  };

  /* ==========================================================================
     RENDER
  ========================================================================== */

  return (
    <div className="re-gallery">

      {/* ====================================================================
          MAIN IMAGE
      ==================================================================== */}

      <div className="re-gallery__main">

        <img
          key={displayImages[index]}
          src={displayImages[index]}
          alt={`Property image ${
            index + 1
          } of ${
            displayImages.length
          }`}
          onError={
            handleMainImageError
          }
        />

        {/* ==================================================================
            PREVIOUS
        ================================================================== */}

        {displayImages.length >
          1 && (
          <button
            type="button"
            className="re-gallery__nav re-gallery__nav--left"
            onClick={previous}
            aria-label="Previous property image"
          >
            <ChevronLeft
              size={22}
            />
          </button>
        )}

        {/* ==================================================================
            NEXT
        ================================================================== */}

        {displayImages.length >
          1 && (
          <button
            type="button"
            className="re-gallery__nav re-gallery__nav--right"
            onClick={next}
            aria-label="Next property image"
          >
            <ChevronRight
              size={22}
            />
          </button>
        )}

        {/* ==================================================================
            IMAGE COUNT
        ================================================================== */}

        <span className="re-gallery__count">
          <Camera size={14} />

          {index + 1} /{" "}
          {displayImages.length}
        </span>

        {/* ==================================================================
            VIRTUAL TOUR
        ================================================================== */}

        {virtualTour && (
          <span className="re-gallery__tour">
            <PlayCircle
              size={14}
            />

            Virtual tour
          </span>
        )}
      </div>

      {/* ====================================================================
          ALL THUMBNAILS
          
          IMPORTANT:
          No .slice(0, 8)
          
          Every uploaded image is displayed here.
      ==================================================================== */}

      {displayImages.length >
        1 && (
        <div className="re-gallery__thumbs">

          {displayImages.map(
            (
              image,
              thumbIndex,
            ) => (
              <button
                key={`${image}-${thumbIndex}`}
                type="button"
                className={
                  thumbIndex === index
                    ? "is-active"
                    : ""
                }
                onClick={() =>
                  setIndex(
                    thumbIndex,
                  )
                }
                aria-label={`View property image ${
                  thumbIndex + 1
                }`}
              >
                <img
                  src={image}
                  alt={`Property thumbnail ${
                    thumbIndex + 1
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
  );
};

export default PropertyGallery;