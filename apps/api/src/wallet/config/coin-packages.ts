export interface CoinPackage {
  id: string;

  name: string;

  /**
   * Base coins included in the package.
   */
  coins: number;

  /**
   * Promotional bonus coins.
   */
  bonus: number;

  /**
   * Total coins user receives.
   *
   * coins + bonus
   */
  totalCoins: number;

  /**
   * USD price.
   */
  price: number;

  currency: string;

  popular?: boolean;
}

/* ============================================================================
   COIN PACKAGE CONFIGURATION
   ============================================================================

   IMPORTANT:

   - `coins` is the purchased/base amount.
   - `bonus` is promotional.
   - `totalCoins` is what gets credited to the wallet.
   - `price` is controlled by the SERVER.
   - Stripe amount is calculated from this configuration.
   - The frontend must NEVER be trusted to provide the price.

   Maximum base purchase:
   1,000,000 coins

   ============================================================================ */

export const COIN_PACKAGES: CoinPackage[] = [
  /* --------------------------------------------------------------------------
     STARTER
     -------------------------------------------------------------------------- */

  {
    id: "starter",
    name: "Starter",
    coins: 100,
    bonus: 0,
    totalCoins: 100,
    price: 0.99,
    currency: "USD",
  },

  /* --------------------------------------------------------------------------
     POPULAR
     -------------------------------------------------------------------------- */

  {
    id: "popular",
    name: "Popular",
    coins: 550,
    bonus: 50,
    totalCoins: 600,
    price: 4.99,
    currency: "USD",
    popular: true,
  },

  /* --------------------------------------------------------------------------
     VALUE
     -------------------------------------------------------------------------- */

  {
    id: "value",
    name: "Value",
    coins: 1_200,
    bonus: 200,
    totalCoins: 1_400,
    price: 9.99,
    currency: "USD",
  },

  /* --------------------------------------------------------------------------
     PREMIUM
     -------------------------------------------------------------------------- */

  {
    id: "premium",
    name: "Premium",
    coins: 2_500,
    bonus: 500,
    totalCoins: 3_000,
    price: 19.99,
    currency: "USD",
  },

  /* --------------------------------------------------------------------------
     ULTIMATE
     -------------------------------------------------------------------------- */

  {
    id: "ultimate",
    name: "Ultimate",
    coins: 6_500,
    bonus: 1_500,
    totalCoins: 8_000,
    price: 49.99,
    currency: "USD",
  },

  /* --------------------------------------------------------------------------
     MEGA
     -------------------------------------------------------------------------- */

  {
    id: "mega",
    name: "Mega",
    coins: 10_000,
    bonus: 2_500,
    totalCoins: 12_500,
    price: 79.99,
    currency: "USD",
  },

  /* --------------------------------------------------------------------------
     ULTRA
     -------------------------------------------------------------------------- */

  {
    id: "ultra",
    name: "Ultra",
    coins: 25_000,
    bonus: 7_500,
    totalCoins: 32_500,
    price: 199.99,
    currency: "USD",
  },

  /* --------------------------------------------------------------------------
     PREMIUM PLUS
     -------------------------------------------------------------------------- */

  {
    id: "premium-plus",
    name: "Premium Plus",
    coins: 50_000,
    bonus: 15_000,
    totalCoins: 65_000,
    price: 399.99,
    currency: "USD",
  },

  /* --------------------------------------------------------------------------
     ELITE
     -------------------------------------------------------------------------- */

  {
    id: "elite",
    name: "Elite",
    coins: 100_000,
    bonus: 30_000,
    totalCoins: 130_000,
    price: 749.99,
    currency: "USD",
  },

  /* --------------------------------------------------------------------------
     DIAMOND
     -------------------------------------------------------------------------- */

  {
    id: "diamond",
    name: "Diamond",
    coins: 250_000,
    bonus: 75_000,
    totalCoins: 325_000,
    price: 1_499.99,
    currency: "USD",
  },

  /* --------------------------------------------------------------------------
     ROYAL
     -------------------------------------------------------------------------- */

  {
    id: "royal",
    name: "Royal",
    coins: 500_000,
    bonus: 150_000,
    totalCoins: 650_000,
    price: 2_499.99,
    currency: "USD",
  },

  /* --------------------------------------------------------------------------
     ULTIMATE MAX
     -------------------------------------------------------------------------- */

  {
    id: "ultimate-max",
    name: "Ultimate Max",
    coins: 1_000_000,
    bonus: 300_000,
    totalCoins: 1_300_000,
    price: 4_999.99,
    currency: "USD",
  },
];

/* ============================================================================
   CONSTANTS
   ============================================================================ */

/**
 * Maximum BASE coin purchase allowed per package.
 *
 * Users can make multiple purchases.
 */
export const MAX_COIN_PACKAGE_AMOUNT = 1_000_000;

/**
 * Maximum TOTAL coins credited by a single package.
 *
 * The 1,000,000 base package currently gives:
 *
 * 1,000,000 + 300,000 bonus
 * = 1,300,000 total
 */
export const MAX_COIN_CREDIT_AMOUNT = 1_300_000;

/* ============================================================================
   PACKAGE LOOKUP
   ============================================================================ */

export function getCoinPackage(
  packageId: string,
): CoinPackage | undefined {
  if (
    !packageId ||
    typeof packageId !== "string"
  ) {
    return undefined;
  }

  return COIN_PACKAGES.find(
    (pkg) =>
      pkg.id === packageId,
  );
}

/* ============================================================================
   PACKAGE VALIDATION
   ============================================================================

   This runs when the server starts/imports the configuration.

   It protects against accidentally creating a package whose numbers
   don't match.

   ============================================================================ */

for (const coinPackage of COIN_PACKAGES) {
  if (
    coinPackage.coins <= 0 ||
    !Number.isInteger(
      coinPackage.coins,
    )
  ) {
    throw new Error(
      `Invalid coin package "${coinPackage.id}": coins must be a positive integer.`,
    );
  }

  if (
    coinPackage.bonus < 0 ||
    !Number.isInteger(
      coinPackage.bonus,
    )
  ) {
    throw new Error(
      `Invalid coin package "${coinPackage.id}": bonus must be a non-negative integer.`,
    );
  }

  const calculatedTotal =
    coinPackage.coins +
    coinPackage.bonus;

  if (
    coinPackage.totalCoins !==
    calculatedTotal
  ) {
    throw new Error(
      `Invalid coin package "${coinPackage.id}": totalCoins must equal coins + bonus.`,
    );
  }

  if (
    coinPackage.coins >
    MAX_COIN_PACKAGE_AMOUNT
  ) {
    throw new Error(
      `Invalid coin package "${coinPackage.id}": maximum base package is ${MAX_COIN_PACKAGE_AMOUNT.toLocaleString()} coins.`,
    );
  }

  if (
    coinPackage.totalCoins >
    MAX_COIN_CREDIT_AMOUNT
  ) {
    throw new Error(
      `Invalid coin package "${coinPackage.id}": maximum total credit is ${MAX_COIN_CREDIT_AMOUNT.toLocaleString()} coins.`,
    );
  }

  if (
    !Number.isFinite(
      coinPackage.price,
    ) ||
    coinPackage.price <= 0
  ) {
    throw new Error(
      `Invalid coin package "${coinPackage.id}": price must be greater than zero.`,
    );
  }

  if (
    coinPackage.currency !==
    "USD"
  ) {
    throw new Error(
      `Invalid coin package "${coinPackage.id}": currency must be USD.`,
    );
  }
}