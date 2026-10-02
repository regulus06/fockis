import React from "react";

import {
  IconTrend,
  IconFriends,
  IconMarketplace,
  IconSpark,
  IconClose,
} from "./FockisIcons";

/* ============================================================================
   TYPES
============================================================================ */

export interface FockisTrendingItem {
  id: string;
  title: string;
  posts?: string;
}

export interface FockisSuggestedUser {
  id: string;
  name: string;
  username?: string;
  avatar?: string;
  verified?: boolean;
}

export interface FockisMarketplaceItem {
  id: string;
  name: string;
  price: number | string;
  image?: string;
}

export interface FockisRightRailProps {
  trending?: FockisTrendingItem[];
  suggestedUsers?: FockisSuggestedUser[];
  marketplaceItems?: FockisMarketplaceItem[];

  onTrendClick?: (
    item: FockisTrendingItem
  ) => void;

  onFollow?: (
    user: FockisSuggestedUser
  ) => void;

  onProductClick?: (
    item: FockisMarketplaceItem
  ) => void;

  onClose?: () => void;
}

/* ============================================================================
   DEFAULT DATA
============================================================================ */

const defaultTrending: FockisTrendingItem[] = [
  {
    id: "1",
    title: "Fockis",
    posts: "12.4K posts",
  },
  {
    id: "2",
    title: "Small Business",
    posts: "8.7K posts",
  },
  {
    id: "3",
    title: "Technology",
    posts: "6.2K posts",
  },
];

const defaultSuggestedUsers: FockisSuggestedUser[] = [
  {
    id: "1",
    name: "Fockis Community",
    username: "@fockis",
    verified: true,
  },
  {
    id: "2",
    name: "Fockis Marketplace",
    username: "@marketplace",
  },
  {
    id: "3",
    name: "Fockis Creators",
    username: "@creators",
  },
];

/* ============================================================================
   AVATAR
============================================================================ */

function UserAvatar({
  name,
  avatar,
}: {
  name: string;
  avatar?: string;
}) {
  if (avatar) {
    return (
      <img
        className="fk-right-rail__avatar"
        src={avatar}
        alt={name}
        loading="lazy"
      />
    );
  }

  const initial =
    name?.trim()?.[0]?.toUpperCase() ||
    "?";

  return (
    <div
      className="fk-right-rail__avatar fk-right-rail__avatar--initial"
      aria-hidden="true"
    >
      {initial}
    </div>
  );
}

/* ============================================================================
   PRICE
============================================================================ */

function formatPrice(
  price: number | string
) {
  if (
    typeof price === "number"
  ) {
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
   RIGHT RAIL
============================================================================ */

export default function FockisRightRail({
  trending = defaultTrending,
  suggestedUsers = defaultSuggestedUsers,
  marketplaceItems = [],

  onTrendClick,
  onFollow,
  onProductClick,
  onClose,
}: FockisRightRailProps) {
  return (
    <aside className="fk-right-rail">
      {/* =====================================================================
          MOBILE CLOSE BUTTON
      ====================================================================== */}

      {onClose && (
        <button
          type="button"
          className="fk-right-rail__close"
          onClick={onClose}
          aria-label="Close right rail"
        >
          <IconClose size={20} />
        </button>
      )}

      {/* =====================================================================
          TRENDING
      ====================================================================== */}

      <section className="fk-right-rail__section">
        <div className="fk-right-rail__section-header">
          <div className="fk-right-rail__section-title">
            <IconTrend size={18} />

            <h2>
              Trending on Fockis
            </h2>
          </div>
        </div>

        <div className="fk-right-rail__trending-list">
          {trending.length > 0 ? (
            trending.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className="fk-right-rail__trend"
                onClick={() =>
                  onTrendClick?.(item)
                }
              >
                <span className="fk-right-rail__trend-number">
                  {String(
                    index + 1
                  ).padStart(2, "0")}
                </span>

                <span className="fk-right-rail__trend-content">
                  <strong>
                    {item.title}
                  </strong>

                  {item.posts && (
                    <small>
                      {item.posts}
                    </small>
                  )}
                </span>
              </button>
            ))
          ) : (
            <p className="fk-right-rail__empty">
              No trending topics yet.
            </p>
          )}
        </div>
      </section>

      {/* =====================================================================
          SUGGESTED PEOPLE
      ====================================================================== */}

      <section className="fk-right-rail__section">
        <div className="fk-right-rail__section-header">
          <div className="fk-right-rail__section-title">
            <IconFriends size={18} />

            <h2>
              People to Follow
            </h2>
          </div>
        </div>

        <div className="fk-right-rail__people-list">
          {suggestedUsers.length > 0 ? (
            suggestedUsers.map(
              (user) => (
                <div
                  key={user.id}
                  className="fk-right-rail__person"
                >
                  <UserAvatar
                    name={user.name}
                    avatar={user.avatar}
                  />

                  <div className="fk-right-rail__person-info">
                    <strong>
                      {user.name}

                      {user.verified && (
                        <span className="fk-right-rail__verified">
                          ✓
                        </span>
                      )}
                    </strong>

                    {user.username && (
                      <span>
                        {user.username}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    className="fk-right-rail__follow-button"
                    onClick={() =>
                      onFollow?.(user)
                    }
                  >
                    Follow
                  </button>
                </div>
              )
            )
          ) : (
            <p className="fk-right-rail__empty">
              No suggestions right now.
            </p>
          )}
        </div>
      </section>

      {/* =====================================================================
          MARKETPLACE
      ====================================================================== */}

      {marketplaceItems.length > 0 && (
        <section className="fk-right-rail__section">
          <div className="fk-right-rail__section-header">
            <div className="fk-right-rail__section-title">
              <IconMarketplace
                size={18}
              />

              <h2>
                Marketplace
              </h2>
            </div>

            <button
              type="button"
              className="fk-right-rail__view-all"
            >
              View all
            </button>
          </div>

          <div className="fk-right-rail__products">
            {marketplaceItems
              .slice(0, 3)
              .map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="fk-right-rail__product"
                  onClick={() =>
                    onProductClick?.(
                      item
                    )
                  }
                >
                  <div className="fk-right-rail__product-image">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        loading="lazy"
                      />
                    ) : (
                      <IconMarketplace
                        size={22}
                      />
                    )}
                  </div>

                  <div className="fk-right-rail__product-info">
                    <strong>
                      {item.name}
                    </strong>

                    <span>
                      {formatPrice(
                        item.price
                      )}
                    </span>
                  </div>
                </button>
              ))}
          </div>
        </section>
      )}

      {/* =====================================================================
          FOCKIS DISCOVERY
      ====================================================================== */}

      <section className="fk-right-rail__discover">
        <div className="fk-right-rail__discover-icon">
          <IconSpark size={20} />
        </div>

        <div>
          <strong>
            Discover more on Fockis
          </strong>

          <p>
            Connect, discover,
            shop, and share with
            your community.
          </p>
        </div>
      </section>

      {/* =====================================================================
          FOOTER
      ====================================================================== */}

      <footer className="fk-right-rail__footer">
        <div className="fk-right-rail__footer-links">
          <button type="button">
            About
          </button>

          <button type="button">
            Help
          </button>

          <button type="button">
            Privacy
          </button>

          <button type="button">
            Terms
          </button>
        </div>

        <p>
          © 2026 Fockis LLC
        </p>

        <span>
          Trusted Marketplace •
          Buyer Protection •
          Secure Checkout
        </span>
      </footer>
    </aside>
  );
}