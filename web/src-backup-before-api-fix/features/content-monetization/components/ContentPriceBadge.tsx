import type {
  MonetizedContent,
} from "../types/contentMonetization.types";

interface ContentPriceBadgeProps {
  content: MonetizedContent;
  purchaseType:
    | "watch"
    | "listen"
    | "download";
}

const getPrice = (
  content: MonetizedContent,
  purchaseType:
    | "watch"
    | "listen"
    | "download",
) => {
  const monetization =
    content.monetization;

  if (purchaseType === "watch") {
    return monetization.watchPrice;
  }

  if (purchaseType === "listen") {
    return monetization.listenPrice;
  }

  return monetization.downloadPrice;
};

export default function ContentPriceBadge({
  content,
  purchaseType,
}: ContentPriceBadgeProps) {
  const price = getPrice(
    content,
    purchaseType,
  );

  if (price <= 0) {
    return null;
  }

  const method =
    content.monetization.paymentMethod;

  return (
    <span className="content-price-badge">
      {method === "coins" ? "🪙" : "💳"}{" "}
      {price}
    </span>
  );
}