/* ============================================================================
   FOCKIS SUBSCRIPTION PLAN THEMES

   Visual presentation ONLY: gemstone artwork, alt text and the CSS
   theme modifier for each account tier.

   This file must never decide access, prices or features. Those come
   from the backend (plan identity, prices, features, entitlements).
   Swapping an image here cannot change what a user is allowed to do.
============================================================================ */

import type { SubscriptionPlan } from "../types/subscriptionTypes";

import basicPearl from "../assets/gems/basic-pearl.webp";
import bronzeGem from "../assets/gems/bronze-gem.webp";
import silverGem from "../assets/gems/silver-gem.webp";
import goldenGem from "../assets/gems/golden-gem.webp";
import diamondGem from "../assets/gems/diamond-gem.webp";

export type SubscriptionPlanThemeKey = "pearl" | "bronze" | "silver" | "golden" | "diamond";

export interface SubscriptionPlanTheme {
  key: SubscriptionPlanThemeKey;
  image: string;
  imageAlt: string;
  gemName: string;
}

export const SUBSCRIPTION_PLAN_THEMES: Record<SubscriptionPlan, SubscriptionPlanTheme> = {
  BASIC: {
    key: "pearl",
    image: basicPearl,
    imageAlt: "Lustrous white pearl on a soft ivory pedestal",
    gemName: "Pearl",
  },
  BRONZE: {
    key: "bronze",
    image: bronzeGem,
    imageAlt: "Polished bronze-colored faceted gemstone with warm copper light",
    gemName: "Bronze",
  },
  SILVER: {
    key: "silver",
    image: silverGem,
    imageAlt: "Polished silver faceted gemstone with cool platinum reflections",
    gemName: "Silver",
  },
  GOLDEN: {
    key: "golden",
    image: goldenGem,
    imageAlt: "Polished golden faceted gemstone glowing with champagne light",
    gemName: "Gold",
  },
  DIAMOND: {
    key: "diamond",
    image: diamondGem,
    imageAlt: "Brilliant-cut diamond with sparkling blue facets",
    gemName: "Diamond",
  },
};

export function getSubscriptionPlanTheme(plan: SubscriptionPlan | undefined): SubscriptionPlanTheme {
  return SUBSCRIPTION_PLAN_THEMES[plan ?? "BASIC"] ?? SUBSCRIPTION_PLAN_THEMES.BASIC;
}
