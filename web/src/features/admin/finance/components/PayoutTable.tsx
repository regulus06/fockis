import type { Payout } from "../types/finance.types";
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

export default function PayoutTable({
  rows,
}: {
  rows: Payout[];
}) {
  if (!rows.length) {
    return (
      <div className="finance-empty">
        <h3>No payouts found</h3>

        <p>
          No payout records match the current
          filters.
        </p>
      </div>
    );
  }

  return (
    <div className="finance-table-wrap">
      <table className="finance-table">
        <caption className="sr-only">
          Seller payout records
        </caption>

        <thead>
          <tr>
            <th scope="col">Seller</th>
            <th scope="col">Order</th>
            <th scope="col">Gross</th>
            <th scope="col">Fockis fee</th>
            <th scope="col">Net payout</th>
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
                    {row.sellerName ||
                      row.sellerId ||
                      "—"}
                  </strong>

                  {row.sellerId &&
                    row.sellerName && (
                      <small>
                        {row.sellerId}
                      </small>
                    )}
                </div>
              </td>

              <td>
                <span>
                  {row.orderNumber ||
                    row.orderId ||
                    "—"}
                </span>

                {row.orderNumber &&
                  row.orderId && (
                    <small>
                      {row.orderId}
                    </small>
                  )}
              </td>

              <td>
                {formatMoney(
                  row.grossAmount,
                )}
              </td>

              <td>
                {formatMoney(
                  row.fockisFee,
                )}
              </td>

              <td>
                <strong>
                  {formatMoney(
                    row.netAmount,
                  )}
                </strong>
              </td>

              <td>
                <PaymentStatusBadge
                  status={row.status}
                />
              </td>

              <td>
                {formatDate(
                  (
                    row as Payout & {
                      createdAt?: string | Date;
                      paidAt?: string | Date;
                      processedAt?: string | Date;
                    }
                  ).paidAt ||
                    (
                      row as Payout & {
                        createdAt?: string | Date;
                        paidAt?: string | Date;
                        processedAt?: string | Date;
                      }
                    ).processedAt ||
                    (
                      row as Payout & {
                        createdAt?: string | Date;
                        paidAt?: string | Date;
                        processedAt?: string | Date;
                      }
                    ).createdAt,
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}