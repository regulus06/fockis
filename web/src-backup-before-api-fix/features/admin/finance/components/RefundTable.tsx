import type { Refund } from "../types/finance.types";
import PaymentStatusBadge from "./PaymentStatusBadge";

function formatMoney(
  value:
    | {
        amount: number;
        currency: string;
      }
    | undefined,
) {
  if (!value) {
    return "—";
  }

  const amount = Number(value.amount);

  if (!Number.isFinite(amount)) {
    return "—";
  }

  const currency = String(
    value.currency || "USD",
  ).toUpperCase();

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

function formatDate(value?: string | Date) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function RefundTable({
  rows,
}: {
  rows: Refund[];
}) {
  if (!rows.length) {
    return (
      <div className="finance-empty">
        <h3>No refunds found</h3>

        <p>
          No refund records match the current
          filters.
        </p>
      </div>
    );
  }

  return (
    <div className="finance-table-wrap">
      <table className="finance-table">
        <caption className="sr-only">
          Customer refund records
        </caption>

        <thead>
          <tr>
            <th scope="col">Customer</th>
            <th scope="col">Order</th>
            <th scope="col">Amount</th>
            <th scope="col">Reason</th>
            <th scope="col">Status</th>
            <th scope="col">Date</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <div>
                  <strong>
                    {row.customerName ||
                      row.customerId ||
                      "—"}
                  </strong>

                  {row.customerId &&
                    row.customerName && (
                      <small>
                        {row.customerId}
                      </small>
                    )}
                </div>
              </td>

              <td>
                <div>
                  <strong>
                    {row.orderNumber ||
                      row.orderId ||
                      "—"}
                  </strong>

                  {row.orderId &&
                    row.orderNumber && (
                      <small>
                        {row.orderId}
                      </small>
                    )}
                </div>
              </td>

              <td>
                <strong>
                  {formatMoney(row.amount)}
                </strong>
              </td>

              <td>
                <span>
                  {row.reason || "—"}
                </span>
              </td>

              <td>
                <PaymentStatusBadge
                  status={row.status}
                />
              </td>

              <td>
                {formatDate(row.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}