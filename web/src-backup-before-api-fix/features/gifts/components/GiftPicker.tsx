import {
  useMemo,
  useState,
} from "react";

import GiftCard from "./GiftCard";

import type {
  Gift,
} from "../services/giftsApi";

/*
============================================================================
TYPES
============================================================================
*/

interface Props {
  gifts: Gift[];

  selectedGift: Gift | null;

  onSelect: (gift: Gift) => void;
}

type GiftCategory =
  | "POPULAR"
  | "LOVE"
  | "FUN"
  | "SPECIAL";

/*
============================================================================
CATEGORY TABS
============================================================================
*/

const CATEGORIES: {
  id: GiftCategory;
  label: string;
}[] = [
  {
    id: "POPULAR",
    label: "Popular",
  },
  {
    id: "LOVE",
    label: "Love",
  },
  {
    id: "FUN",
    label: "Fun",
  },
  {
    id: "SPECIAL",
    label: "Special",
  },
];

/*
============================================================================
CATEGORY FILTER
============================================================================
*/

function getFilteredGifts(
  gifts: Gift[],
  category: GiftCategory,
): Gift[] {

  /*
  --------------------------------------------------------------------------
  POPULAR
  --------------------------------------------------------------------------
  */

  if (category === "POPULAR") {
    return gifts;
  }

  /*
  --------------------------------------------------------------------------
  LOVE
  --------------------------------------------------------------------------
  */

  if (category === "LOVE") {
    return gifts.filter(
      (gift) => {
        const text =
          `${gift.name} ${gift.description} ${gift.emoji}`
            .toLowerCase();

        return (
          text.includes("love") ||
          text.includes("heart") ||
          text.includes("rose") ||
          text.includes("hug") ||
          text.includes("friendship") ||
          text.includes("letter") ||
          gift.emoji === "❤️" ||
          gift.emoji === "💕" ||
          gift.emoji === "💖" ||
          gift.emoji === "🌹" ||
          gift.emoji === "🫂" ||
          gift.emoji === "💌"
        );
      },
    );
  }

  /*
  --------------------------------------------------------------------------
  FUN
  --------------------------------------------------------------------------
  */

  if (category === "FUN") {
    return gifts.filter(
      (gift) => {
        const text =
          `${gift.name} ${gift.description} ${gift.emoji}`
            .toLowerCase();

        return (
          text.includes("pizza") ||
          text.includes("burger") ||
          text.includes("coffee") ||
          text.includes("cake") ||
          text.includes("balloon") ||
          text.includes("confetti") ||
          text.includes("celebration") ||
          text.includes("trophy") ||
          text.includes("rocket") ||
          text.includes("train") ||
          text.includes("car") ||
          text.includes("jet") ||
          text.includes("yacht") ||
          text.includes("wave") ||
          text.includes("trending") ||
          text.includes("meteor") ||
          text.includes("tornado") ||
          text.includes("dragon")
        );
      },
    );
  }

  /*
  --------------------------------------------------------------------------
  SPECIAL
  --------------------------------------------------------------------------
  */

  if (category === "SPECIAL") {
    return gifts.filter(
      (gift) =>
        gift.category?.toUpperCase() ===
          "SPECIAL_EVENT" ||
        gift.rarity?.toUpperCase() ===
          "LEGENDARY" ||
        gift.rarity?.toUpperCase() ===
          "DIAMOND" ||
        gift.fullScreenAnimation === true,
    );
  }

  return gifts;
}

/*
============================================================================
COMPONENT
============================================================================
*/

export default function GiftPicker({
  gifts,
  selectedGift,
  onSelect,
}: Props) {

  const [
    selectedCategory,
    setSelectedCategory,
  ] = useState<GiftCategory>(
    "POPULAR",
  );

  /*
  ==========================================================================
  FILTER GIFTS
  ==========================================================================
  */

  const filteredGifts =
    useMemo(
      () =>
        getFilteredGifts(
          gifts,
          selectedCategory,
        ),
      [
        gifts,
        selectedCategory,
      ],
    );

  /*
  ==========================================================================
  SELECTED GIFT COST
  ==========================================================================
  */

  const selectedGiftCost =
    selectedGift?.coinPrice ?? 0;

  /*
  ==========================================================================
  RENDER
  ==========================================================================
  */

  return (
    <div>

      {/* ================================================================
          HEADER
      ================================================================ */}

      <div className="gift-picker-header">

        <div>

          <span className="gift-picker-eyebrow">
            SUPPORT THE CREATOR
          </span>

          <h2>
            Send a Gift

            <span className="gift-title-emoji">
              🎁
            </span>
          </h2>

        </div>

        <div className="gift-picker-live-dot">
          <span />
          LIVE
        </div>

      </div>

      {/* ================================================================
          GIFT COST
      ================================================================ */}

      {selectedGift && (
        <div className="gift-coin-balance">

          <div className="gift-coin-balance-left">

            <span className="gift-coin-icon">
              🪙
            </span>

            <div>

              <span className="gift-coin-label">
                Selected gift
              </span>

              <strong>
                {selectedGift.name}
              </strong>

            </div>

          </div>

          <div className="gift-cost">

            <span>
              Gift cost
            </span>

            <strong>
              🪙{" "}
              {selectedGiftCost.toLocaleString()}
            </strong>

          </div>

        </div>
      )}

      {/* ================================================================
          CATEGORY TABS
      ================================================================ */}

      <div className="gift-category-row">

        {CATEGORIES.map(
          (category) => {

            const active =
              selectedCategory ===
              category.id;

            return (
              <button
                key={
                  category.id
                }
                type="button"
                className={
                  active
                    ? "gift-category active"
                    : "gift-category"
                }
                onClick={() =>
                  setSelectedCategory(
                    category.id,
                  )
                }
                aria-pressed={
                  active
                }
              >
                {
                  category.label
                }
              </button>
            );
          },
        )}

      </div>

      {/* ================================================================
          GIFTS
      ================================================================ */}

      {filteredGifts.length >
      0 ? (

        <div className="gift-grid">

          {filteredGifts.map(
            (gift) => (

              <GiftCard
                key={
                  gift._id
                }

                gift={
                  gift
                }

                selected={
                  selectedGift?._id ===
                  gift._id
                }

                onSelect={
                  onSelect
                }
              />

            ),
          )}

        </div>

      ) : (

        <div className="gift-empty-state">

          <span>
            🎁
          </span>

          <strong>
            No{" "}
            {
              selectedCategory.toLowerCase()
            }{" "}
            gifts available
          </strong>

          <p>
            Try another gift
            category.
          </p>

        </div>

      )}

    </div>
  );
}