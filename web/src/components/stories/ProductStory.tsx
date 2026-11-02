
import { useNavigate } from "react-router-dom";
import type { MouseEvent, KeyboardEvent } from "react";

import {
  buildFockisUrl,
  buildFockisUploadUrl,
} from "../../config/fockisConfig";

import "./ProductStory.scss";

interface ProductStoryData {
  _id?: string;
  userId?: string;
  username?: string;
  avatar?: string | null;
  media?: string;
  type?: "image" | "video";
  isProductStory?: boolean;
  productId?: string | null;
  productName?: string | null;
  productImage?: string | null;
  price?: number | null;
  shopLink?: string | null;
  sellerId?: string | null;
}

interface ProductStoryProps {
  story: ProductStoryData;
}

/* ============================================================
   MEDIA URL NORMALIZATION
============================================================ */

function getMediaUrl(value?: string | null): string {
  if (!value || typeof value !== "string") {
    return "";
  }

  const path = value.trim();

  if (!path || path === "undefined" || path === "null") {
    return "";
  }

  if (
    /^(https?:\/\/|blob:|data:|\/\/)/i.test(path)
  ) {
    return path;
  }

  const cleanPath = path
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");

  if (
    /^(post-media|uploads|upload|media|public\/uploads|api\/uploads)\//i.test(
      cleanPath,
    )
  ) {
    return buildFockisUrl(cleanPath);
  }

  return buildFockisUploadUrl(cleanPath);
}

export default function ProductStory({
  story,
}: ProductStoryProps) {
  const navigate = useNavigate();

  const media = getMediaUrl(story.media);
  const avatar = getMediaUrl(story.avatar);
  const productImage = getMediaUrl(story.productImage);

  /* ============================================================
     OPEN PRODUCT
  ============================================================ */

  const handleProductClick = () => {
    if (!story.productId) {
      return;
    }

    navigate(`/marketplace/product/${story.productId}`);
  };

  const handleProductKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleProductClick();
    }
  };

  /* ============================================================
     SHOP NOW
  ============================================================ */

  const handleShopNow = (
    event: MouseEvent<HTMLButtonElement>,
  ) => {
    event.stopPropagation();

    if (!story.shopLink) {
      return;
    }

    if (/^https?:\/\//i.test(story.shopLink)) {
      window.location.assign(story.shopLink);
      return;
    }

    if (story.shopLink.startsWith("/")) {
      navigate(story.shopLink);
      return;
    }

    navigate(`/${story.shopLink}`);
  };

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <div
      className="product-story"
      data-story-id={story._id}
    >
      {/* STORY MEDIA */}

      {media && story.type === "video" ? (
        <video
          src={media}
          className="product-story-video"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          onError={(event) => {
            console.error(
              "Product story video failed:",
              media,
              event.currentTarget.error,
            );
          }}
        />
      ) : media ? (
        <img
          src={media}
          className="product-story-image"
          alt={story.productName || "Story"}
          loading="lazy"
          onError={(event) => {
            console.error(
              "Product story image failed:",
              media,
            );

            event.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <div className="product-story-placeholder">
          Story media unavailable
        </div>
      )}

      {/* STORY INFORMATION */}

      <div className="product-story-info">
        {/* SELLER / USER */}

        <div className="product-story-user">
          {avatar ? (
            <img
              src={avatar}
              alt={story.username || "User"}
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div className="product-story-user-placeholder">
              {(story.username || "U")
                .charAt(0)
                .toUpperCase()}
            </div>
          )}

          <span>{story.username || "User"}</span>
        </div>

        {/* PRODUCT */}

        {story.productId && (
          <div className="product-scroll">
            <div
              className="product-item"
              onClick={handleProductClick}
              role="button"
              tabIndex={0}
              onKeyDown={handleProductKeyDown}
            >
              {productImage && (
                <img
                  src={productImage}
                  alt={story.productName || "Product"}
                  loading="lazy"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              )}

              <div className="product-item-info">
                <h4>
                  {story.productName || "View Product"}
                </h4>

                {story.price !== null &&
                  story.price !== undefined && (
                    <p>
                      ${Number(story.price).toFixed(2)}
                    </p>
                  )}
              </div>
            </div>
          </div>
        )}

        {/* SHOP NOW */}

        {story.shopLink && (
          <button
            type="button"
            className="shop-now"
            onClick={handleShopNow}
          >
            Shop Now
          </button>
        )}
      </div>
    </div>
  );
}
