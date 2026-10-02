import { useMemo } from "react";
import type { RevenuePoint } from "../types/finance.types";

interface RevenueChartProps {
  data: RevenuePoint[];
}

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

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getAccessibleDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function RevenueChart({
  data,
}: RevenueChartProps) {
  const chart = useMemo(() => {
    if (!data.length) {
      return {
        max: 1,
        total: 0,
        average: 0,
        highest: 0,
      };
    }

    const values = data.map((point) =>
      Number(point.net?.amount ?? 0),
    );

    const validValues = values.filter(
      (value) => Number.isFinite(value),
    );

    const max = Math.max(
      ...validValues,
      1,
    );

    const total = validValues.reduce(
      (sum, value) => sum + value,
      0,
    );

    return {
      max,
      total,
      average:
        validValues.length > 0
          ? total / validValues.length
          : 0,
      highest:
        validValues.length > 0
          ? Math.max(...validValues)
          : 0,
    };
  }, [data]);

  if (!data.length) {
    return (
      <div className="finance-empty">
        <h3>No revenue data</h3>

        <p>
          No revenue points were returned for the
          selected reporting period.
        </p>
      </div>
    );
  }

  const firstCurrency =
    data[0]?.net?.currency || "USD";

  return (
    <div
      className="revenue-chart"
      role="img"
      aria-label={`Revenue chart containing ${data.length} reporting periods`}
    >
      <div className="revenue-chart__summary">
        <div>
          <span>Total net revenue</span>

          <strong>
            {formatMoney({
              amount: chart.total,
              currency: firstCurrency,
            })}
          </strong>
        </div>

        <div>
          <span>Average period</span>

          <strong>
            {formatMoney({
              amount: chart.average,
              currency: firstCurrency,
            })}
          </strong>
        </div>

        <div>
          <span>Highest period</span>

          <strong>
            {formatMoney({
              amount: chart.highest,
              currency: firstCurrency,
            })}
          </strong>
        </div>
      </div>

      <div className="revenue-chart__viewport">
        <div
          className="revenue-chart__bars"
          role="list"
          aria-label="Net revenue by date"
        >
          {data.map((point) => {
            const value = Number(
              point.net?.amount ?? 0,
            );

            const safeValue =
              Number.isFinite(value)
                ? value
                : 0;

            const percentage =
              chart.max > 0
                ? (safeValue /
                    chart.max) *
                  100
                : 0;

            const height = Math.max(
              percentage,
              3,
            );

            return (
              <div
                className="revenue-bar"
                key={point.date}
                role="listitem"
                title={`${getAccessibleDate(
                  point.date,
                )}: ${formatMoney(
                  point.net,
                )}`}
              >
                <div className="revenue-bar__value">
                  {formatMoney(point.net)}
                </div>

                <div
                  className="revenue-bar-fill"
                  style={{
                    height: `${height}%`,
                  }}
                  aria-hidden="true"
                />

                <small>
                  {formatDate(point.date)}
                </small>
              </div>
            );
          })}
        </div>
      </div>

      <div className="revenue-chart__details">
        <span>
          {data.length.toLocaleString()}{" "}
          {data.length === 1
            ? "reporting period"
            : "reporting periods"}
        </span>

        <span>
          Values represent net revenue returned by
          the Finance service.
        </span>
      </div>

      <div className="sr-only">
        <table>
          <caption>
            Net revenue by reporting date
          </caption>

          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Net revenue</th>
            </tr>
          </thead>

          <tbody>
            {data.map((point) => (
              <tr key={`accessible-${point.date}`}>
                <td>
                  {getAccessibleDate(
                    point.date,
                  )}
                </td>

                <td>
                  {formatMoney(point.net)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}