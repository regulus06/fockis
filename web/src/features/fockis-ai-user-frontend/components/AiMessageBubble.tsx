import { FOCKIS_API_URL } from "../../../config/fockisConfig";

import React, { useState } from "react";
import type { AiMessage } from "../types/fockisAi.types";

const API_URL =
  import.meta.env.VITE_API_URL ||
  FOCKIS_API_URL;

type ShopResult = {
  id: string;
  type:
    | "product"
    | "store"
    | "business";

  title: string;
  description?: string;

  price?: number;
  stock?: number;

  image?: string;

  location?: {
    city?: string;
    state?: string;
    country?: string;
  };

  urls?: {
    product?: string;
    marketplace?: string;
    store?: string;
    business?: string;
  };

  store?: {
    name?: string;
    slug?: string;
    verified?: boolean;

    location?: {
      city?: string;
      state?: string;
      country?: string;
    };
  };

  metadata?: {
    category?: string;
    brand?: string;
    rating?: number;
    totalReviews?: number;
    discount?: number;
    discountPrice?: number;
    displayLocations?: string[];
    verified?: boolean;
    followers?: number;
  };
};

type ShopPayload = {
  tool?:
    | "search_fockis_products"
    | "search_fockis_stores"
    | "search_fockis_businesses";

  query?: string;

  count?: number;

  results?: ShopResult[];

  searchedLiveDatabase?: boolean;
};

type ExtendedAiMessage =
  AiMessage & {
    shopResults?: ShopPayload;
  };

function absoluteUrl(
  value?: string,
) {
  if (!value) {
    return "";
  }

  if (
    value.startsWith("http://") ||
    value.startsWith("https://")
  ) {
    return value;
  }

  if (value.startsWith("/")) {
    return `${API_URL}${value}`;
  }

  return `${API_URL}/${value}`;
}

function locationText(
  location?: ShopResult["location"],
) {
  if (!location) {
    return "";
  }

  return [
    location.city,
    location.state,
    location.country,
  ]
    .filter(Boolean)
    .join(", ");
}

function ShopCard({
  result,
}: {
  result: ShopResult;
}) {
  const [
    imageFailed,
    setImageFailed,
  ] = useState(false);

  const imageUrl =
    absoluteUrl(result.image);

  const location =
    locationText(
      result.location,
    ) ||
    locationText(
      result.store?.location,
    );

  const product =
    result.type === "product";

  const store =
    result.type === "store";

  const business =
    result.type === "business";

  const href = product
    ? absoluteUrl(
        result.urls?.product ||
          result.urls?.marketplace,
      )
    : store
      ? absoluteUrl(
          result.urls?.store ||
            (result.store?.slug
              ? `/shop/store/${result.store.slug}`
              : undefined),
        )
      : absoluteUrl(
          result.urls?.business,
        );

  return (
    <article className="fai-shop-card">
      <div className="fai-shop-card__image">
        {imageUrl &&
        !imageFailed ? (
          <img
            src={imageUrl}
            alt={result.title}
            loading="lazy"
            onError={() =>
              setImageFailed(
                true,
              )
            }
          />
        ) : (
          <div className="fai-shop-card__image-placeholder">
            {product
              ? "🛍️"
              : store
                ? "🏪"
                : "🏢"}
          </div>
        )}
      </div>

      <div className="fai-shop-card__body">
        <div className="fai-shop-card__type">
          {product
            ? "PRODUCT"
            : store
              ? "STORE"
              : "BUSINESS"}
        </div>

        <h3 className="fai-shop-card__title">
          {result.title}
        </h3>

        {result.description && (
          <p className="fai-shop-card__description">
            {result.description}
          </p>
        )}

        {product &&
          typeof result.price ===
            "number" && (
            <div className="fai-shop-card__price">
              $
              {result.price.toFixed(
                2,
              )}
            </div>
          )}

        {product &&
          typeof result.stock ===
            "number" && (
            <div className="fai-shop-card__stock">
              {result.stock > 0
                ? `${result.stock} available`
                : "Out of stock"}
            </div>
          )}

        {typeof result.metadata
          ?.rating ===
          "number" && (
          <div className="fai-shop-card__rating">
            ⭐{" "}
            {result.metadata.rating.toFixed(
              1,
            )}

            {typeof result
              .metadata
              .totalReviews ===
              "number" && (
              <span>
                {" "}
                (
                {
                  result.metadata
                    .totalReviews
                }
                )
              </span>
            )}
          </div>
        )}

        {result.store?.name && (
          <div className="fai-shop-card__store">
            🏪{" "}
            {result.store.name}

            {result.store
              .verified && (
              <span className="fai-shop-card__verified">
                ✓ Verified
              </span>
            )}
          </div>
        )}

        {location && (
          <div className="fai-shop-card__location">
            📍 {location}
          </div>
        )}

        {result.metadata
          ?.category && (
          <div className="fai-shop-card__category">
            {
              result.metadata
                .category
            }
          </div>
        )}

        {href && (
          <a
            className="fai-shop-card__button"
            href={href}
          >
            {product
              ? "View Product"
              : store
                ? "Visit Store"
                : "View Business"}

            <span>→</span>
          </a>
        )}
      </div>
    </article>
  );
}

function ShopResults({
  payload,
}: {
  payload: ShopPayload;
}) {
  const results =
    payload.results || [];

  if (!results.length) {
    return null;
  }

  const heading =
    payload.tool ===
    "search_fockis_stores"
      ? "Fockis Stores"
      : payload.tool ===
          "search_fockis_businesses"
        ? "Fockis Businesses"
        : "Fockis Shop";

  return (
    <div className="fai-shop-results">
      <div className="fai-shop-results__header">
        <div>
          <strong>
            {heading}
          </strong>

          <span>
            {results.length}{" "}
            {results.length ===
            1
              ? "result"
              : "results"}
          </span>
        </div>
      </div>

      <div className="fai-shop-results__grid">
        {results.map(
          (result) => (
            <ShopCard
              key={`${result.type}-${result.id}`}
              result={result}
            />
          ),
        )}
      </div>
    </div>
  );
}

export default function AiMessageBubble({
  message,
  onRetry,
}: {
  message: AiMessage;
  onRetry?: () => void;
}) {
  const [
    copied,
    setCopied,
  ] = useState(false);

  const user =
    message.role === "user";

  const extendedMessage =
    message as ExtendedAiMessage;

  const shopResults =
    extendedMessage.shopResults;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        message.content,
      );

      setCopied(true);

      window.setTimeout(
        () => setCopied(false),
        1000,
      );
    } catch {
      // Clipboard unavailable.
    }
  };

  return (
    <div
      className={`fai-message-row ${
        user
          ? "user"
          : "assistant"
      }`}
    >
      {!user && (
        <div className="fai-avatar">
          ✦
        </div>
      )}

      <div className="fai-message-content">
        <div
          className={`fai-bubble ${
            message.status || ""
          }`}
        >
          <small>
            {user
              ? "You"
              : "Fockis AI"}
          </small>

          <div>
            {message.content}
          </div>

          {shopResults && (
            <ShopResults
              payload={
                shopResults
              }
            />
          )}
        </div>

        <div className="fai-tools">
          {!user && (
            <button
              type="button"
              onClick={() => {
                void copy();
              }}
            >
              {copied
                ? "Copied"
                : "Copy"}
            </button>
          )}

          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
            >
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}