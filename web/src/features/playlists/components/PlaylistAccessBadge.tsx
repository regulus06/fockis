import type { AccessType } from "../types/playlist.types";

export interface PlaylistAccessBadgeProps {
  access: AccessType;
  price?: number;
  currency?: string;
  size?: "md" | "lg";
}

const LABEL: Record<AccessType, string> = {
  free: "Free",
  paid: "Paid",
  premium: "Premium",
  exclusive: "Exclusive",
};

function formatPrice(
  price: number,
  currency: string = "USD",
): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(price);
  } catch {
    return `$${price.toFixed(2)}`;
  }
}

export function PlaylistAccessBadge({
  access,
  price,
  currency = "USD",
  size = "md",
}: PlaylistAccessBadgeProps) {
  const showPrice =
    (access === "paid" || access === "premium") &&
    price !== undefined;

  const label = showPrice
    ? formatPrice(price, currency)
    : LABEL[access];

  return (
    <span
      className={`fk-seal fk-seal--${access}${
        size === "lg" ? " fk-seal--lg" : ""
      }`}
      aria-label={
        showPrice
          ? `${LABEL[access]}: ${label}`
          : LABEL[access]
      }
    >
      <span
        className="fk-seal__ring"
        aria-hidden="true"
      />

      <span className="fk-seal__label">
        {label}
      </span>
    </span>
  );
}