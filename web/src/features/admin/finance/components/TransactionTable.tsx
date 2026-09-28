import type { FinanceTransaction } from "../types/finance.types";
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

function formatLabel(value?: string) {
  if (!value) {
    return "—";
  }

  return value
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );
}

function formatDateTime(
  value?: string | Date,
) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function TransactionTable({
  rows,
}: {
  rows: FinanceTransaction[];
}) {
  if (!rows.length) {
    return (
      <div className="finance-empty">
        <h3>No transactions found</h3>

        <p>
          No financial transaction records match the
          current filters.
        </p>
      </div>
    );
  }

  return (
    <div className="finance-table-wrap">
      <table className="finance-table">
        <caption className="sr-only">
          Fockis financial transaction ledger
        </caption>

        <thead>
          <tr>
            <th scope="col">
              Reference
            </th>

            <th scope="col">
              Type
            </th>

            <th scope="col">
              Description
            </th>

            <th scope="col">
              Amount
            </th>

            <th scope="col">
              Status
            </th>

            <th scope="col">
              Date
            </th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => {
            const reference =
              row.referenceNumber ||
              row.referenceId ||
              row.id;

            return (
              <tr key={row.id}>
                <td>
                  <div>
                    <strong>
                      {reference}
                    </strong>

                    {row.referenceId &&
                      row.referenceId !==
                        reference && (
                        <small>
                          {row.referenceId}
                        </small>
                      )}
                  </div>
                </td>

                <td>
                  <span>
                    {formatLabel(
                      row.type,
                    )}
                  </span>
                </td>

                <td>
                  <span>
                    {row.description ||
                      "—"}
                  </span>
                </td>

                <td>
                  <strong>
                    {formatMoney(
                      row.amount,
                    )}
                  </strong>
                </td>

                <td>
                  <PaymentStatusBadge
                    status={row.status}
                  />
                </td>

                <td>
                  {formatDateTime(
                    row.createdAt,
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}