/* ============================================================================
   LEGACY ENTRY POINT

   SubscriptionCard.tsx used to hold a second copy of the plan card.
   It now re-exports the single redesigned card so any existing import
   keeps working without duplicating plan logic.
============================================================================ */

export { default } from "./SubscriptionPlanCard";
