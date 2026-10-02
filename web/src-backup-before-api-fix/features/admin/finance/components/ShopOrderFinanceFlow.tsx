import { useMemo } from "react";
import type { ShopOrderFinance } from "../types/finance.types";

interface ShopOrderFinanceFlowProps {
  order: ShopOrderFinance;
}

type MoneyValue = {
  amount: number;
  currency: string;
};

function formatMoney(
  value: MoneyValue | undefined,
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

function getDifference(
  left: MoneyValue,
  right: MoneyValue,
) {
  if (
    left.currency.toUpperCase() !==
    right.currency.toUpperCase()
  ) {
    return null;
  }

  return Number(left.amount) - Number(right.amount);
}

function formatStatus(value?: string) {
  if (!value) {
    return "Unknown";
  }

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );
}

function getStatusClass(value?: string) {
  const status = String(value || "")
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  switch (status) {
    case "paid":
    case "succeeded":
    case "successful":
    case "completed":
    case "settled":
      return "finance-status-badge finance-status-badge--success";

    case "pending":
    case "processing":
    case "partially_refunded":
      return "finance-status-badge finance-status-badge--warning";

    case "failed":
    case "cancelled":
    case "canceled":
    case "refunded":
      return "finance-status-badge finance-status-badge--danger";

    default:
      return "finance-status-badge";
  }
}

export default function ShopOrderFinanceFlow({
  order,
}: ShopOrderFinanceFlowProps) {
  const reconciliation = useMemo(() => {
    const difference = getDifference(
      order.sellerPayout,
      order.fockisFee,
    );

    /*
     * The original equation was:
     *
     * seller payout + Fockis fee = order total
     *
     * Calculate the actual reconciliation difference
     * instead of displaying an equation that could appear
     * valid even when the values do not balance.
     */
    const totalAmount = Number(
      order.total?.amount ?? 0,
    );

    const sellerPayoutAmount = Number(
      order.sellerPayout?.amount ?? 0,
    );

    const feeAmount = Number(
      order.fockisFee?.amount ?? 0,
    );

    const calculatedTotal =
      sellerPayoutAmount + feeAmount;

    const calculatedDifference =
      totalAmount - calculatedTotal;

    const isBalanced =
      Number.isFinite(calculatedDifference) &&
      Math.abs(calculatedDifference) < 0.01;

    return {
      difference,
      calculatedDifference,
      isBalanced,
      calculatedTotal,
    };
  }, [
    order.total,
    order.sellerPayout,
    order.fockisFee,
  ]);

  const extendedOrder =
    order as ShopOrderFinance & {
      status?: string;
      paymentStatus?: string;
      payoutStatus?: string;
      sellerId?: string;
      customerName?: string;
      customerId?: string;
      currency?: string;
      createdAt?: string | Date;
      paidAt?: string | Date;
      payoutAt?: string | Date;
      refundedAmount?: MoneyValue;
      refundAmount?: MoneyValue;
      platformFee?: MoneyValue;
      paymentFee?: MoneyValue;
      netRevenue?: MoneyValue;
    };

  const paymentStatus =
    extendedOrder.paymentStatus ||
    extendedOrder.status;

  const payoutStatus =
    extendedOrder.payoutStatus;

  const refundAmount =
    extendedOrder.refundedAmount ||
    extendedOrder.refundAmount;

  const platformFee =
    extendedOrder.platformFee ||
    order.fockisFee;

  const paymentFee =
    extendedOrder.paymentFee;

  const netRevenue =
    extendedOrder.netRevenue ||
    order.fockisFee;

  return (
    <section className="finance-flow">
      <header className="finance-flow-header">
        <div>
          <span>FOCKIS SHOP · FINANCE</span>

          <h2>
            Order #{order.orderNumber}
          </h2>

          <p>
            Financial movement from customer payment
            through platform fees and seller settlement.
          </p>
        </div>

        <div className="finance-flow-header__amount">
          <span>Order total</span>

          <strong>
            {formatMoney(order.total)}
          </strong>
        </div>
      </header>

      {(paymentStatus ||
        payoutStatus) && (
        <div className="finance-flow-statuses">
          {paymentStatus && (
            <div>
              <span>Payment status</span>

              <span
                className={getStatusClass(
                  paymentStatus,
                )}
              >
                {formatStatus(
                  paymentStatus,
                )}
              </span>
            </div>
          )}

          {payoutStatus && (
            <div>
              <span>Payout status</span>

              <span
                className={getStatusClass(
                  payoutStatus,
                )}
              >
                {formatStatus(
                  payoutStatus,
                )}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="finance-flow-line">
        <div className="finance-flow-node">
          <span>Fockis Shop</span>

          <strong>
            Order #{order.orderNumber}
          </strong>

          <small>
            Customer payment source
          </small>

          {extendedOrder.customerName && (
            <small>
              Customer:{" "}
              {extendedOrder.customerName}
            </small>
          )}
        </div>

        <div
          className="finance-flow-arrow"
          aria-hidden="true"
        >
          →
        </div>

        <div className="finance-flow-node finance-flow-primary">
          <span>Finance</span>

          <strong>
            Payment{" "}
            {formatMoney(order.total)}
          </strong>

          <small>
            Payment ID:{" "}
            {order.paymentId || "—"}
          </small>
        </div>

        <div
          className="finance-flow-arrow"
          aria-hidden="true"
        >
          →
        </div>

        <div className="finance-flow-node">
          <span>Seller</span>

          <strong>
            {order.sellerName ||
              extendedOrder.sellerId ||
              "Seller"}
          </strong>

          <small>
            Seller settlement destination
          </small>
        </div>
      </div>

      <div className="finance-flow-split">
        <div className="finance-flow-branch">
          <span>Customer payment</span>

          <strong>
            {formatMoney(order.total)}
          </strong>

          <small>
            Customer → Fockis
          </small>
        </div>

        <div className="finance-flow-branch finance-flow-fee">
          <span>Fockis fee</span>

          <strong>
            {formatMoney(platformFee)}
          </strong>

          <small>
            Platform revenue
          </small>
        </div>

        {paymentFee && (
          <div className="finance-flow-branch">
            <span>Payment processing fee</span>

            <strong>
              {formatMoney(paymentFee)}
            </strong>

            <small>
              Payment provider cost
            </small>
          </div>
        )}

        <div className="finance-flow-branch">
          <span>Seller payout</span>

          <strong>
            {formatMoney(
              order.sellerPayout,
            )}
          </strong>

          <small>
            Fockis →{" "}
            {order.sellerName ||
              "Seller"}
          </small>
        </div>

        {refundAmount && (
          <div className="finance-flow-branch">
            <span>Refunds</span>

            <strong>
              {formatMoney(
                refundAmount,
              )}
            </strong>

            <small>
              Returned to customer
            </small>
          </div>
        )}
      </div>

      <div
        className={`finance-flow-reconciliation ${
          reconciliation.isBalanced
            ? "finance-flow-reconciliation--balanced"
            : "finance-flow-reconciliation--attention"
        }`}
        role="status"
      >
        <div>
          <span>
            Financial reconciliation
          </span>

          <strong>
            {reconciliation.isBalanced
              ? "Balanced"
              : "Reconciliation requires attention"}
          </strong>
        </div>

        <div>
          <small>
            Seller payout + Fockis fee
          </small>

          <strong>
            {formatMoney(
              order.sellerPayout,
            )}{" "}
            +{" "}
            {formatMoney(
              order.fockisFee,
            )}{" "}
            ={" "}
            {formatMoney(order.total)}
          </strong>
        </div>

        {!reconciliation.isBalanced && (
          <div>
            <small>
              Reconciliation difference
            </small>

            <strong>
              {reconciliation.difference !==
              null
                ? formatMoney({
                    amount:
                      reconciliation.calculatedDifference,
                    currency:
                      order.total
                        .currency,
                  })
                : "Multiple currencies"}
            </strong>
          </div>
        )}
      </div>

      <div className="finance-panel">
        <div className="finance-panel-header">
          <div>
            <h3>
              Financial audit details
            </h3>

            <p>
              Key identifiers used to trace this
              Shop order through Finance.
            </p>
          </div>
        </div>

        <div className="finance-table-wrap">
          <table className="finance-table">
            <tbody>
              <tr>
                <th scope="row">
                  Order number
                </th>

                <td>
                  {order.orderNumber ||
                    "—"}
                </td>
              </tr>

              <tr>
                <th scope="row">
                  Payment ID
                </th>

                <td>
                  <code>
                    {order.paymentId ||
                      "—"}
                  </code>
                </td>
              </tr>

              <tr>
                <th scope="row">
                  Seller
                </th>

                <td>
                  {order.sellerName ||
                    extendedOrder.sellerId ||
                    "—"}
                </td>
              </tr>

              <tr>
                <th scope="row">
                  Order total
                </th>

                <td>
                  {formatMoney(
                    order.total,
                  )}
                </td>
              </tr>

              <tr>
                <th scope="row">
                  Fockis fee
                </th>

                <td>
                  {formatMoney(
                    order.fockisFee,
                  )}
                </td>
              </tr>

              <tr>
                <th scope="row">
                  Seller payout
                </th>

                <td>
                  {formatMoney(
                    order.sellerPayout,
                  )}
                </td>
              </tr>

              {refundAmount && (
                <tr>
                  <th scope="row">
                    Refund amount
                  </th>

                  <td>
                    {formatMoney(
                      refundAmount,
                    )}
                  </td>
                </tr>
              )}

              <tr>
                <th scope="row">
                  Net platform revenue
                </th>

                <td>
                  {formatMoney(
                    netRevenue,
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}