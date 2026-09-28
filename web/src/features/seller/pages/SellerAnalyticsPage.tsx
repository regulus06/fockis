import { useEffect, useState } from "react";

import { sellerApi } from "../services/sellerApi";
import { orderApi } from "../../orders/services/orderApi";

import FockisBottomNav from "../../../components/fockis/FockisBottomNav";

import "../styles/SellerAnalyticsPage.scss";

type SellerProduct = {
  _id?: string;
  id?: string;
};

type SellerOrder = {
  _id?: string;
  totalAmount?: number | string;
  status?: string;
};

/*
 * SellerLayout already renders the seller sidebar/navigation
 * for /seller/* routes.
 *
 * FockisBottomNav is the shared mobile navigation and should
 * not be imported from the marketplace feature.
 */

export default function SellerAnalyticsPage() {
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadAnalytics();
  }, []);

  async function loadAnalytics() {
    try {
      const productData = await sellerApi.getSellerProducts();
      const orderData = await orderApi.getSellerOrders();

      setProducts(productData || []);
      setOrders(orderData || []);
    } catch (err) {
      console.error("Analytics error:", err);
    } finally {
      setLoading(false);
    }
  }

  const revenue = orders.reduce(
    (total: number, order: SellerOrder) =>
      total + Number(order.totalAmount || 0),
    0,
  );

  const averageOrder =
    orders.length > 0
      ? revenue / orders.length
      : 0;

  const processing = orders.filter(
    (order: SellerOrder) =>
      order.status === "processing",
  ).length;

  const shipped = orders.filter(
    (order: SellerOrder) =>
      order.status === "shipped",
  ).length;

  const delivered = orders.filter(
    (order: SellerOrder) =>
      order.status === "delivered",
  ).length;

  const statusMax = Math.max(
    processing,
    shipped,
    delivered,
    1,
  );

  if (loading) {
    return (
      <div className="seller-analytics">
        <div className="az-page">
          <div className="skeleton skeleton-title" />

          <div className="skeleton-row">
            {Array.from({ length: 4 }).map(
              (_, index) => (
                <div
                  className="skeleton skeleton-card"
                  key={index}
                />
              ),
            )}
          </div>

          <div className="skeleton skeleton-block" />
        </div>

        <FockisBottomNav />
      </div>
    );
  }

  return (
    <div className="seller-analytics">
      <div className="az-page">
        <div className="az-page-head">
          <div>
            <span className="az-breadcrumb">
              Seller Center / Reports
            </span>

            <h1>Business analytics</h1>
          </div>

          <div className="az-range-chip">
            Last 30 days
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <h3>Ordered product sales</h3>

            <h2>
              ${revenue.toFixed(2)}
            </h2>
          </div>

          <div className="stat-card">
            <h3>Total orders</h3>

            <h2>{orders.length}</h2>
          </div>

          <div className="stat-card">
            <h3>Active products</h3>

            <h2>{products.length}</h2>
          </div>

          <div className="stat-card">
            <h3>Average order value</h3>

            <h2>
              ${averageOrder.toFixed(2)}
            </h2>
          </div>
        </div>

        <div className="analytics-card">
          <h2>Order status</h2>

          <div className="status-row">
            <span className="status-label">
              <i className="dot dot-processing" />
              Processing
            </span>

            <div className="status-bar">
              <div
                className="status-bar-fill fill-processing"
                style={{
                  width: `${(processing / statusMax) * 100}%`,
                }}
              />
            </div>

            <strong>{processing}</strong>
          </div>

          <div className="status-row">
            <span className="status-label">
              <i className="dot dot-shipped" />
              Shipped
            </span>

            <div className="status-bar">
              <div
                className="status-bar-fill fill-shipped"
                style={{
                  width: `${(shipped / statusMax) * 100}%`,
                }}
              />
            </div>

            <strong>{shipped}</strong>
          </div>

          <div className="status-row">
            <span className="status-label">
              <i className="dot dot-delivered" />
              Delivered
            </span>

            <div className="status-bar">
              <div
                className="status-bar-fill fill-delivered"
                style={{
                  width: `${(delivered / statusMax) * 100}%`,
                }}
              />
            </div>

            <strong>{delivered}</strong>
          </div>
        </div>

        <div className="analytics-card">
          <h2>Recent sales</h2>

          {orders.length === 0 ? (
            <p className="empty-sales">
              No sales yet.
            </p>
          ) : (
            <div className="sales-table">
              <div className="sales-row sales-head">
                <span>Order</span>
                <span>Amount</span>
                <span>Status</span>
              </div>

              {orders
                .slice(0, 10)
                .map((order) => (
                  <div
                    className="sales-row"
                    key={order._id}
                  >
                    <span className="sales-id">
                      Order #
                      {String(order._id).slice(-6)}
                    </span>

                    <span className="sales-amount">
                      $
                      {Number(
                        order.totalAmount || 0,
                      ).toFixed(2)}
                    </span>

                    <span
                      className={
                        "sales-status status-" +
                        String(
                          order.status || "",
                        ).toLowerCase()
                      }
                    >
                      {order.status || "Unknown"}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      <FockisBottomNav />
    </div>
  );
}