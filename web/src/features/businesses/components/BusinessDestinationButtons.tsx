import { Link } from "react-router-dom";

import { ExternalLink, Globe, ShoppingBag } from "lucide-react";

import { businessesApi } from "../services/businessesApi";

import type { Business } from "../types/business.types";

import {
  getBusinessDestinations,
  getStoreRoute,
} from "../utils/businessUtils";


/* ============================================================================
   BUSINESS DESTINATION BUTTONS

   "Visit Website" and "Visit Store" buttons used on every business card, the
   Spotlight, the business profile and the manager preview. Only valid,
   configured destinations are rendered; the owner's primary action gets the
   primary style.
============================================================================ */

interface Props {
  business: Pick<Business, "id" | "name" | "websiteUrl" | "store" | "primaryAction">;
  size?: "sm" | "md" | "lg";
  /*
   * Disables navigation and tracking (used by the form preview).
   */
  preview?: boolean;
  /*
   * Lets callers render the primary destination with the dark style when
   * another primary button is already present.
   */
  tone?: "default" | "muted";
}

export default function BusinessDestinationButtons({
  business,
  size = "md",
  preview = false,
  tone = "default",
}: Props) {
  const { websiteUrl, store, primary } = getBusinessDestinations(business);

  if (!websiteUrl && !store) {
    return null;
  }

  const sizeClass =
    size === "sm" ? "fkb-btn--sm" : size === "lg" ? "fkb-btn--lg" : "";

  const styleFor = (kind: "WEBSITE" | "STORE") =>
    primary === kind && tone === "default"
      ? "fkb-btn--primary"
      : "fkb-btn--secondary";

  const website = websiteUrl ? (
    preview ? (
      <span
        key="website"
        className={`fkb-btn ${styleFor("WEBSITE")} ${sizeClass}`}
        aria-disabled="true"
      >
        <Globe size={16} aria-hidden="true" />
        Visit Website
      </span>
    ) : (
      <a
        key="website"
        href={websiteUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`fkb-btn ${styleFor("WEBSITE")} ${sizeClass}`}
        onClick={() => {
          void businessesApi.trackWebsiteClick(business.id);
        }}
      >
        <Globe size={16} aria-hidden="true" />
        Visit Website
        <ExternalLink size={14} aria-hidden="true" />
        <span className="fkb-visually-hidden">
          {` for ${business.name} (opens in a new tab)`}
        </span>
      </a>
    )
  ) : null;

  const storeButton = store ? (
    preview ? (
      <span
        key="store"
        className={`fkb-btn ${styleFor("STORE")} ${sizeClass}`}
        aria-disabled="true"
      >
        <ShoppingBag size={16} aria-hidden="true" />
        Visit Store
      </span>
    ) : (
      <Link
        key="store"
        to={getStoreRoute(store.slug)}
        className={`fkb-btn ${styleFor("STORE")} ${sizeClass}`}
        onClick={() => {
          void businessesApi.trackStoreClick(business.id);
        }}
      >
        <ShoppingBag size={16} aria-hidden="true" />
        Visit Store
        <span className="fkb-visually-hidden">{` ${store.name} on Fockis Shop`}</span>
      </Link>
    )
  ) : null;

  // Primary destination first.
  return primary === "STORE" ? (
    <>
      {storeButton}
      {website}
    </>
  ) : (
    <>
      {website}
      {storeButton}
    </>
  );
}
