/*
 * One-time seed script.
 *
 * Inserts FOCKIS_SIGNATURE_GIFTS into the `gifts` collection.
 *
 * Safe to re-run:
 * - Uses the unique gift `name` for upserts.
 * - Removes duplicate names from the seed array.
 * - Keeps the LAST occurrence when duplicate names exist.
 *
 * Usage from apps/api:
 *
 * npx ts-node -r tsconfig-paths/register src/gifts/seed/run-seed.ts
 */

import * as dotenv from "dotenv";

dotenv.config();

import mongoose from "mongoose";

import {
  FOCKIS_SIGNATURE_GIFTS,
} from "./gifts.seed";

/* ============================================================================
   ENVIRONMENT
============================================================================ */

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error(
    "MONGO_URI not found in .env. Please check apps/api/.env.",
  );

  process.exit(1);
}

/* ============================================================================
   GIFT SCHEMA
============================================================================ */

/*
 * This schema intentionally mirrors:
 *
 * apps/api/src/gifts/schemas/gift.schema.ts
 *
 * CATEGORY:
 *
 * POPULAR
 * LOVE
 * FUN
 * SPECIAL
 *
 * RARITY:
 *
 * COMMON
 * RARE
 * EPIC
 * LEGENDARY
 * DIAMOND
 */

const giftSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    emoji: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    category: {
      type: String,
      required: true,

      enum: [
        "POPULAR",
        "LOVE",
        "FUN",
        "SPECIAL",
      ],

      index: true,
    },

    rarity: {
      type: String,
      required: true,

      enum: [
        "COMMON",
        "RARE",
        "EPIC",
        "LEGENDARY",
        "DIAMOND",
      ],

      index: true,
    },

    coinPrice: {
      type: Number,
      required: true,
      min: 1,
    },

    image: {
      type: String,
      default: "",
    },

    animation: {
      type: String,
      default: "",
    },

    sound: {
      type: String,
      default: "",
    },

    duration: {
      type: Number,
      default: 8,
      min: 1,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    fullScreenAnimation: {
      type: Boolean,
      default: false,
    },
  },

  {
    timestamps: true,
  },
);

const Gift = mongoose.model(
  "Gift",
  giftSchema,
  "gifts",
);

/* ============================================================================
   SEED
============================================================================ */

async function seed(): Promise<void> {
  try {
    console.log(
      "Connecting to MongoDB...",
    );

    await mongoose.connect(
      MONGO_URI as string,
    );

    console.log(
      "Connected to MongoDB.",
    );

    /* ========================================================================
       DEDUPLICATE GIFTS
    ======================================================================== */

    /*
     * Some seed entries have duplicate names.
     *
     * Example:
     *
     * Fockis Super Train
     * Fockis Royal Jet
     * Fockis Mega Wave
     *
     * Keep the LAST occurrence.
     */

    const byName = new Map<
      string,
      (typeof FOCKIS_SIGNATURE_GIFTS)[number]
    >();

    for (
      const gift of FOCKIS_SIGNATURE_GIFTS
    ) {
      byName.set(
        gift.name,
        gift,
      );
    }

    const uniqueGifts =
      Array.from(
        byName.values(),
      );

    console.log(
      `Found ${FOCKIS_SIGNATURE_GIFTS.length} seed entries.`,
    );

    console.log(
      `Using ${uniqueGifts.length} unique gifts.`,
    );

    /* ========================================================================
       VALIDATE DATA BEFORE INSERTING
    ======================================================================== */

    const validCategories = new Set([
      "POPULAR",
      "LOVE",
      "FUN",
      "SPECIAL",
    ]);

    const validRarities = new Set([
      "COMMON",
      "RARE",
      "EPIC",
      "LEGENDARY",
      "DIAMOND",
    ]);

    for (
      const gift of uniqueGifts
    ) {
      if (
        !validCategories.has(
          String(gift.category),
        )
      ) {
        throw new Error(
          `Invalid category "${gift.category}" for gift "${gift.name}". ` +
          `Expected POPULAR, LOVE, FUN, or SPECIAL.`,
        );
      }

      if (
        !validRarities.has(
          String(gift.rarity),
        )
      ) {
        throw new Error(
          `Invalid rarity "${gift.rarity}" for gift "${gift.name}". ` +
          `Expected COMMON, RARE, EPIC, LEGENDARY, or DIAMOND.`,
        );
      }
    }

    /* ========================================================================
       UPSERT GIFTS
    ======================================================================== */

    let upserted = 0;

    for (
      const gift of uniqueGifts
    ) {
      await Gift.findOneAndUpdate(
        {
          name: gift.name,
        },

        {
          $set: {
            ...gift,

            /*
             * Make sure newly seeded gifts are active.
             */
            isActive: true,
          },
        },

        {
          upsert: true,
          new: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        },
      );

      upserted += 1;

      console.log(
        `✓ ${gift.name} | ${gift.category} | ${gift.rarity}`,
      );
    }

    /* ========================================================================
       FINAL COUNT
    ======================================================================== */

    const count =
      await Gift.countDocuments();

    const activeCount =
      await Gift.countDocuments({
        isActive: true,
      });

    console.log("");
    console.log(
      `Upserted ${upserted} gifts.`,
    );

    console.log(
      `Total gifts in collection: ${count}`,
    );

    console.log(
      `Active gifts: ${activeCount}`,
    );

    /* ========================================================================
       CATEGORY SUMMARY
    ======================================================================== */

    const categorySummary =
      await Gift.aggregate([
        {
          $match: {
            isActive: true,
          },
        },

        {
          $group: {
            _id: "$category",
            count: {
              $sum: 1,
            },
          },
        },

        {
          $sort: {
            _id: 1,
          },
        },
      ]);

    console.log("");
    console.log(
      "Active gifts by category:",
    );

    for (
      const item of categorySummary
    ) {
      console.log(
        `  ${item._id}: ${item.count}`,
      );
    }

    /* ========================================================================
       RARITY SUMMARY
    ======================================================================== */

    const raritySummary =
      await Gift.aggregate([
        {
          $match: {
            isActive: true,
          },
        },

        {
          $group: {
            _id: "$rarity",
            count: {
              $sum: 1,
            },
          },
        },

        {
          $sort: {
            _id: 1,
          },
        },
      ]);

    console.log("");
    console.log(
      "Active gifts by rarity:",
    );

    for (
      const item of raritySummary
    ) {
      console.log(
        `  ${item._id}: ${item.count}`,
      );
    }

    console.log("");
    console.log(
      "Gift seed completed successfully.",
    );
  } catch (error) {
    console.error("");
    console.error(
      "Gift seed failed:",
    );

    console.error(error);

    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();

    console.log(
      "MongoDB connection closed.",
    );
  }
}

/* ============================================================================
   RUN
============================================================================ */

void seed();