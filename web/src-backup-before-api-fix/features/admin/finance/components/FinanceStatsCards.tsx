import type { FinanceOverview } from "../types/finance.types";

type MoneyValue = {
  amount: number;
  currency: string;
};

function formatMoney(
  value?: MoneyValue,
) {
  if (!value) {
    return "—";
  }

  const amount = Number(value.amount);

  if (!Number.isFinite(amount)) {
    return "—";
  }

  const currency =
    String(value.currency || "USD").toUpperCase();

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function formatNumber(value?: number) {
  if (
    value === undefined ||
    value === null ||
    !Number.isFinite(Number(value))
  ) {
    return "—";
  }

  return Number(value).toLocaleString("en-US");
}

interface FinanceStatsCardsProps {
  overview: FinanceOverview | null;
}

export default function FinanceStatsCards({
  overview,
}: FinanceStatsCardsProps) {
  const cards = [
    {
      label: "Gross revenue",
      value: formatMoney(
        overview?.grossRevenue,
      ),
      description:
        "Total revenue before fees, refunds, and other adjustments.",
    },
    {
      label: "Net revenue",
      value: formatMoney(
        overview?.netRevenue,
      ),
      description:
        "Revenue remaining after applicable financial adjustments.",
    },
    {
      label: "Platform fees",
      value: formatMoney(
        overview?.platformFees,
      ),
      description:
        "Fees recorded by the Fockis platform.",
    },
    {
      label: "Payments",
      value: formatMoney(
        overview?.totalPayments,
      ),
      description:
        "Payment volume returned by the Finance service.",
    },
    {
      label: "Seller payouts",
      value: formatMoney(
        overview?.totalPayouts,
      ),
      description:
        "Funds recorded for seller payouts.",
    },
    {
      label: "Refunds",
      value: formatMoney(
        overview?.totalRefunds,
      ),
      description:
        "Refund value recorded during the reporting period.",
    },
    {
      label: "Pending payouts",
      value: formatMoney(
        overview?.pendingPayouts,
      ),
      description:
        "Payout funds that have not reached final settlement.",
    },
    {
      label: "Active subscriptions",
      value: formatNumber(
        overview?.activeSubscriptions,
      ),
      description:
        "Currently active recurring subscriptions.",
    },
  ];

  return (
    <div
      className="finance-stats"
      aria-label="Finance overview statistics"
    >
      {cards.map((card) => (
        <article
          className="finance-stat"
          key={card.label}
        >
          <span className="finance-stat__label">
            {card.label}
          </span>

          <strong className="finance-stat__value">
            {card.value}
          </strong>

          <small className="finance-stat__description">
            {card.description}
          </small>
        </article>
      ))}
    </div>
  );
}