import type { FinanceStatus } from "../types/finance.types";

interface PaymentStatusBadgeProps {
  status: FinanceStatus;
  size?: "sm" | "md";
}

function formatStatus(status: FinanceStatus) {
  return String(status)
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );
}

function getStatusClass(status: FinanceStatus) {
  const normalized = String(status)
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  switch (normalized) {
    case "succeeded":
    case "success":
    case "successful":
    case "completed":
    case "paid":
    case "active":
      return "finance-status finance-status-success";

    case "pending":
    case "processing":
    case "requires_action":
    case "requires_payment_method":
    case "past_due":
      return "finance-status finance-status-warning";

    case "failed":
    case "failure":
    case "canceled":
    case "cancelled":
    case "declined":
    case "expired":
    case "uncollectible":
      return "finance-status finance-status-danger";

    case "refunded":
    case "partially_refunded":
      return "finance-status finance-status-refunded";

    case "trial":
    case "trialing":
      return "finance-status finance-status-info";

    case "disputed":
    case "chargeback":
      return "finance-status finance-status-danger";

    default:
      return "finance-status finance-status-neutral";
  }
}

export default function PaymentStatusBadge({
  status,
  size = "md",
}: PaymentStatusBadgeProps) {
  const label = formatStatus(status);

  return (
    <span
      className={`${getStatusClass(status)} finance-status-${size}`}
      role="status"
      aria-label={`Payment status: ${label}`}
      title={label}
    >
      <span
        className="finance-status__dot"
        aria-hidden="true"
      />

      <span className="finance-status__label">
        {label}
      </span>
    </span>
  );
}