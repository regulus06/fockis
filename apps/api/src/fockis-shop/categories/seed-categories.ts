import {
  Model,
} from "mongoose";

import {
  Category,
  CategoryDocument,
} from "./categories.schema";

/**
 * ============================================================================
 * FOCKIS MARKETPLACE CATEGORIES
 * ============================================================================
 *
 * Official production marketplace categories.
 *
 * IMPORTANT:
 * - Slugs are permanent identifiers.
 * - Slugs must remain unique.
 * - Do not use temporary/test categories here.
 * - Do not use product names as categories.
 *
 * ============================================================================
 */

export const DEFAULT_MARKETPLACE_CATEGORIES = [
  {
    name: "Electronics",
    slug: "electronics",
    description:
      "Phones, computers, tablets, televisions, cameras, audio equipment, smart devices, and electronic accessories.",
    status: "active",
    sortOrder: 1,
  },

  {
    name: "Clothing & Fashion",
    slug: "clothing-fashion",
    description:
      "Men's clothing, women's clothing, children's clothing, shoes, sneakers, bags, accessories, and fashion products.",
    status: "active",
    sortOrder: 2,
  },

  {
    name: "Home & Living",
    slug: "home-living",
    description:
      "Furniture, home decor, bedding, storage, bathroom products, household essentials, and home accessories.",
    status: "active",
    sortOrder: 3,
  },

  {
    name: "Kitchen & Dining",
    slug: "kitchen-dining",
    description:
      "Cookware, kitchen appliances, utensils, dinnerware, drinkware, food storage, and dining accessories.",
    status: "active",
    sortOrder: 4,
  },

  {
    name: "Beauty & Personal Care",
    slug: "beauty-personal-care",
    description:
      "Skincare, hair care, makeup, fragrances, grooming products, bath and body products, and personal care.",
    status: "active",
    sortOrder: 5,
  },

  {
    name: "Health & Wellness",
    slug: "health-wellness",
    description:
      "Wellness products, fitness wellness equipment, personal health products, first-aid supplies, and health accessories.",
    status: "active",
    sortOrder: 6,
  },

  {
    name: "Sports & Outdoors",
    slug: "sports-outdoors",
    description:
      "Sports equipment, fitness equipment, outdoor recreation gear, camping, hiking, cycling, and sporting accessories.",
    status: "active",
    sortOrder: 7,
  },

  {
    name: "Garden & Outdoor Living",
    slug: "garden-outdoor-living",
    description:
      "Gardening tools, plants, seeds, lawn care, outdoor furniture, patio products, grills, and garden accessories.",
    status: "active",
    sortOrder: 8,
  },

  {
    name: "Toys & Games",
    slug: "toys-games",
    description:
      "Toys, games, puzzles, dolls, action figures, educational toys, collectibles, and recreational products.",
    status: "active",
    sortOrder: 9,
  },

  {
    name: "Baby & Kids",
    slug: "baby-kids",
    description:
      "Baby products, children's products, nursery items, baby gear, feeding products, and children's accessories.",
    status: "active",
    sortOrder: 10,
  },

  {
    name: "Automotive",
    slug: "automotive",
    description:
      "Automotive parts, car accessories, vehicle electronics, maintenance products, tools, tires, and motorcycle products.",
    status: "active",
    sortOrder: 11,
  },

  {
    name: "Tools & Hardware",
    slug: "tools-hardware",
    description:
      "Hand tools, power tools, hardware, workshop equipment, electrical supplies, plumbing supplies, and construction tools.",
    status: "active",
    sortOrder: 12,
  },

  {
    name: "Grocery & Food",
    slug: "grocery-food",
    description:
      "Packaged food, snacks, beverages, coffee, tea, pantry products, baking supplies, and everyday grocery essentials.",
    status: "active",
    sortOrder: 13,
  },

  {
    name: "Pet Supplies",
    slug: "pet-supplies",
    description:
      "Pet food, toys, beds, grooming products, accessories, and supplies for dogs, cats, birds, fish, and other pets.",
    status: "active",
    sortOrder: 14,
  },

  {
    name: "Office & School",
    slug: "office-school",
    description:
      "Office supplies, school supplies, stationery, notebooks, backpacks, desk accessories, printers, and office equipment.",
    status: "active",
    sortOrder: 15,
  },

  {
    name: "Books, Music & Media",
    slug: "books-music-media",
    description:
      "Books, textbooks, magazines, music, movies, musical instruments, and media products.",
    status: "active",
    sortOrder: 16,
  },

  {
    name: "Jewelry & Watches",
    slug: "jewelry-watches",
    description:
      "Rings, necklaces, bracelets, earrings, watches, fine jewelry, fashion jewelry, and jewelry accessories.",
    status: "active",
    sortOrder: 17,
  },

  {
    name: "Luggage & Travel",
    slug: "luggage-travel",
    description:
      "Suitcases, luggage, travel bags, backpacks, duffel bags, organizers, and travel accessories.",
    status: "active",
    sortOrder: 18,
  },

  {
    name: "Arts, Crafts & Hobbies",
    slug: "arts-crafts-hobbies",
    description:
      "Art supplies, painting, drawing, sewing, crafting, collectibles, model kits, and hobby equipment.",
    status: "active",
    sortOrder: 19,
  },

  {
    name: "Collectibles",
    slug: "collectibles",
    description:
      "Collectible items, memorabilia, trading cards, coins, antiques, figurines, and specialty collections.",
    status: "active",
    sortOrder: 20,
  },

  {
    name: "Business & Industrial",
    slug: "business-industrial",
    description:
      "Commercial equipment, industrial supplies, business equipment, professional tools, and workplace products.",
    status: "active",
    sortOrder: 21,
  },

  {
    name: "Handmade",
    slug: "handmade",
    description:
      "Handcrafted products, handmade gifts, custom creations, artwork, crafts, and unique artisan products.",
    status: "active",
    sortOrder: 22,
  },

  {
    name: "Services",
    slug: "services",
    description:
      "Professional, creative, technical, home, business, and other marketplace services.",
    status: "active",
    sortOrder: 23,
  },

  {
    name: "Other",
    slug: "other",
    description:
      "Products that do not reasonably belong in another marketplace category.",
    status: "active",
    sortOrder: 24,
  },
];

/**
 * ============================================================================
 * INVALID / TEST CATEGORIES
 * ============================================================================
 */

export const INVALID_MARKETPLACE_CATEGORIES = [
  "mug",
  "Nike",
  "prermium",
  "premiuem",
  "we",
  "wer",
  "sd",
  "vgygy",
];

/**
 * ============================================================================
 * SEED MARKETPLACE CATEGORIES
 * ============================================================================
 *
 * Behavior:
 *
 * 1. Creates official categories when missing.
 * 2. Updates official categories when they already exist.
 * 3. Ensures every official category has its stable slug.
 * 4. Reactivates official categories.
 * 5. Updates descriptions and sort order.
 * 6. Removes known invalid/test categories.
 *
 * Existing products are NOT deleted.
 *
 * ============================================================================
 */

export async function seedMarketplaceCategories(
  categoryModel: Model<CategoryDocument>,
): Promise<void> {
  for (
    const category
    of DEFAULT_MARKETPLACE_CATEGORIES
  ) {
    await categoryModel.updateOne(
      {
        name: category.name,
      },
      {
        $set: {
          slug: category.slug,
          description: category.description,
          status: category.status,
          sortOrder: category.sortOrder,
        },
        $setOnInsert: {
          name: category.name,
        },
      },
      {
        upsert: true,
      },
    );
  }

  if (
    INVALID_MARKETPLACE_CATEGORIES.length > 0
  ) {
    await categoryModel.deleteMany({
      name: {
        $in: INVALID_MARKETPLACE_CATEGORIES,
      },
    });
  }

  console.log(
    `FOCKIS: ${DEFAULT_MARKETPLACE_CATEGORIES.length} production marketplace categories initialized.`,
  );
}