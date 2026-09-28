import React from "react";

import {
  IconProperty,
  IconComment,
  IconShare,
  IconSave,
  IconSaveFilled,
  IconMore,
} from "./FockisIcons";

/* ============================================================================
   TYPES
============================================================================ */

export interface FockisPropertyPostData {
  id: string;
  user: string;
  userId?: string;

  title?: string;
  content?: string;

  location?: string;
  propertyType?: string;

  price?: number | string;
  bedrooms?: number | string;
  bathrooms?: number | string;
  area?: number | string;

  media?: string;
  images?: string[];

  createdAt?: string;
}

export interface FockisPropertyPostCardProps {
  post: FockisPropertyPostData;

  saved?: boolean;
  menuOpen?: boolean;
  canDelete?: boolean;

  onSave?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onMenu?: () => void;
  onDelete?: () => void;
  onViewProperty?: () => void;
}

/* ============================================================================
   AVATAR
============================================================================ */

function InitialsAvatar({
  name,
}: {
  name: string;
}) {
  const initial =
    name?.trim()?.[0]?.toUpperCase() || "?";

  return (
    <div
      className="fk-avatar"
      aria-hidden="true"
    >
      {initial}
    </div>
  );
}

/* ============================================================================
   PRICE FORMATTER
============================================================================ */

function formatPrice(
  price?: number | string
) {
  if (
    price === undefined ||
    price === null ||
    price === ""
  ) {
    return "Price upon request";
  }

  if (typeof price === "number") {
    return new Intl.NumberFormat(
      "en-US",
      {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }
    ).format(price);
  }

  return price;
}

/* ============================================================================
   PROPERTY POST CARD
============================================================================ */

export default function FockisPropertyPostCard({
  post,

  saved = false,
  menuOpen = false,
  canDelete = false,

  onSave,
  onComment,
  onShare,
  onMenu,
  onDelete,
  onViewProperty,
}: FockisPropertyPostCardProps) {
  const primaryImage =
    post.media ||
    post.images?.[0] ||
    "";

  return (
    <article className="fk-property-post-card">
      {/* =====================================================================
          HEADER
      ====================================================================== */}

      <header className="fk-property-post-card__header">
        <div className="fk-property-post-card__author">
          <InitialsAvatar
            name={post.user}
          />

          <div className="fk-property-post-card__author-info">
            <div className="fk-property-post-card__name">
              {post.user || "Unknown"}
            </div>

            <div className="fk-property-post-card__meta">
              <IconProperty size={13} />

              <span>
                {post.createdAt ||
                  "Just now"}
              </span>
            </div>
          </div>
        </div>

        {/* MORE MENU */}

        <div
          className="fk-property-post-card__menu-wrapper"
          style={{
            position: "relative",
          }}
        >
          <button
            type="button"
            className="fk-icon-btn"
            onClick={onMenu}
            aria-label="More property options"
            aria-expanded={menuOpen}
          >
            <IconMore size={18} />
          </button>

          {menuOpen && canDelete && (
            <div className="fk-post-menu">
              <button
                type="button"
                className="fk-post-menu__delete"
                onClick={onDelete}
              >
                Delete property post
              </button>
            </div>
          )}
        </div>
      </header>

      {/* =====================================================================
          PROPERTY IMAGE
      ====================================================================== */}

      {primaryImage && (
        <button
          type="button"
          className="fk-property-post-card__image-button"
          onClick={onViewProperty}
          aria-label="View property"
        >
          <div className="fk-property-post-card__image">
            <img
              src={primaryImage}
              alt={
                post.title ||
                "Property listing"
              }
              loading="lazy"
              onError={() => {
                console.error(
                  "FOCKIS PROPERTY IMAGE FAILED:",
                  primaryImage
                );
              }}
            />

            {/* PROPERTY BADGE */}

            <div className="fk-property-post-card__badge">
              <IconProperty size={14} />

              <span>
                {post.propertyType ||
                  "Property"}
              </span>
            </div>
          </div>
        </button>
      )}

      {/* =====================================================================
          PROPERTY INFORMATION
      ====================================================================== */}

      <div className="fk-property-post-card__content">
        {/* TITLE */}

        {post.title && (
          <h2 className="fk-property-post-card__title">
            {post.title}
          </h2>
        )}

        {/* LOCATION */}

        {post.location && (
          <div className="fk-property-post-card__location">
            <span>
              {post.location}
            </span>
          </div>
        )}

        {/* PRICE */}

        <div className="fk-property-post-card__price">
          {formatPrice(post.price)}
        </div>

        {/* PROPERTY DETAILS */}

        <div className="fk-property-post-card__details">
          {post.bedrooms !==
            undefined && (
            <div className="fk-property-post-card__detail">
              <strong>
                {post.bedrooms}
              </strong>

              <span>
                {Number(
                  post.bedrooms
                ) === 1
                  ? "Bedroom"
                  : "Bedrooms"}
              </span>
            </div>
          )}

          {post.bathrooms !==
            undefined && (
            <div className="fk-property-post-card__detail">
              <strong>
                {post.bathrooms}
              </strong>

              <span>
                {Number(
                  post.bathrooms
                ) === 1
                  ? "Bathroom"
                  : "Bathrooms"}
              </span>
            </div>
          )}

          {post.area !==
            undefined && (
            <div className="fk-property-post-card__detail">
              <strong>
                {post.area}
              </strong>

              <span>
                sq ft
              </span>
            </div>
          )}
        </div>

        {/* DESCRIPTION */}

        {post.content && (
          <p className="fk-property-post-card__description">
            {post.content}
          </p>
        )}

        {/* VIEW PROPERTY */}

        <button
          type="button"
          className="fk-property-post-card__view-button"
          onClick={onViewProperty}
        >
          View Property
        </button>
      </div>

      {/* =====================================================================
          ACTIONS
      ====================================================================== */}

      <div className="fk-action-dock">
        {/* COMMENT */}

        <button
          type="button"
          className="fk-action-dock__btn"
          onClick={onComment}
          aria-label="Comment on property"
        >
          <IconComment size={18} />
        </button>

        {/* SHARE */}

        <button
          type="button"
          className="fk-action-dock__btn"
          onClick={onShare}
          aria-label="Share property"
        >
          <IconShare size={18} />
        </button>

        {/* SPACER */}

        <span
          className="fk-action-dock__spacer"
          aria-hidden="true"
        />

        {/* SAVE */}

        <button
          type="button"
          className={`fk-action-dock__btn fk-action-dock__btn--save${
            saved
              ? " is-active"
              : ""
          }`}
          onClick={onSave}
          aria-label={
            saved
              ? "Remove saved property"
              : "Save property"
          }
          aria-pressed={saved}
        >
          {saved ? (
            <IconSaveFilled
              size={18}
            />
          ) : (
            <IconSave size={18} />
          )}
        </button>
      </div>
    </article>
  );
}