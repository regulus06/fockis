import React from 'react';
import type { Order } from '../types/Order';

import "../styles/OrderCard.scss";

interface Props {
  order: Order;
}

const OrderCard: React.FC<Props> = ({ order }) => {

  // =========================
  // DOWNLOAD INVOICE (SAFE URL)
  // =========================
  const downloadInvoice = () => {
    const baseUrl =
      import.meta.env.VITE_API_URL || "http://localhost:3000";

    window.open(
      `${baseUrl}/marketplace/orders/${order._id}/invoice/pdf`,
      "_blank"
    );
  };

  const safeStatus = order.status ?? "pending";

  const statusVariant =
    safeStatus === "delivered"
      ? "delivered"
      : safeStatus === "pending"
      ? "pending"
      : "default";

  return (
    <div className="order-card">

      {/* HEADER */}
      <div className="order-card__header">
        <h3>
          Invoice #{order._id.slice(-6)}
        </h3>

        <span
          className={`order-card__status order-card__status--${statusVariant}`}
        >
          {safeStatus.toUpperCase()}
        </span>
      </div>

      {/* TOTAL */}
      <p className="order-card__total">
        Total: <strong>${order.totalAmount}</strong>
      </p>

      {/* ITEMS */}
      <div className="order-card__items">
        {order.items?.map((item: any, index: number) => (
          <div key={index} className="order-card__item">
            • {item.product?.name || "Product"} × {item.quantity}
          </div>
        ))}
      </div>

      {/* BUTTON */}
      <button
        onClick={downloadInvoice}
        className="order-card__download-btn"
      >
        Download Stripe Invoice PDF
      </button>

    </div>
  );
};

export default OrderCard;