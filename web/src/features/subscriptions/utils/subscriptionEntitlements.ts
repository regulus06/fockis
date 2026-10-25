/* ============================================================================
   FOCKIS SUBSCRIPTION ENTITLEMENTS (frontend, display-only)

   Stable identifiers for what a membership unlocks, so the app can ask
   "does this user have shop.premium?" instead of comparing plan names
   or card colors.

   IMPORTANT
   - The current backend does NOT return entitlements yet. Until it does,
     hasEntitlement() returns false for everything — no access is invented.
   - Frontend checks only shape the UI. The backend (SubscriptionGuard,
     @RequirePlan, future entitlement guards) remains the authority.
============================================================================ */

import type { FockisModuleId, Subscription } from "../types/subscriptionTypes";

/** `${module}.${capability}` — e.g. "social.premium", "shop.premium". */
export type SubscriptionEntitlementId = `${FockisModuleId}.${string}`;

/** Illustrative identifiers. Declaring them does not activate anything. */
export const KNOWN_ENTITLEMENTS = [
  "social.premium",
  "shop.premium",
  "travel.premium",
  "live.premium",
  "music.premium",
  "ai.premium",
] as const satisfies readonly SubscriptionEntitlementId[];

const ENTITLEMENT_PATTERN = /^[a-z][a-z0-9-]*\.[a-z0-9][a-z0-9.-]*$/;

/** Entitlements explicitly granted by the backend; [] when none are sent. */
export function getGrantedEntitlements(subscription: Subscription | null | undefined): string[] {
  const raw = subscription?.entitlements;
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === "string" && ENTITLEMENT_PATTERN.test(item));
}

/** True only when the backend explicitly granted the entitlement. */
export function hasEntitlement(
  subscription: Subscription | null | undefined,
  entitlement: SubscriptionEntitlementId | string,
): boolean {
  return getGrantedEntitlements(subscription).includes(entitlement);
}

/** Whether the backend sends entitlement data at all. */
export function backendProvidesEntitlements(subscription: Subscription | null | undefined): boolean {
  return Array.isArray(subscription?.entitlements);
}
