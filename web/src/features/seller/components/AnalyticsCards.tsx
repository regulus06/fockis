import { useEffect, useState } from "react";
import { sellerApi } from "../services/sellerApi";
import { orderApi } from "../../orders/services/orderApi";

export default function AnalyticsCards() {
  const [rating, setRating] = useState<number | null>(null);
  const [sales, setSales] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const [store, orders] = await Promise.all([
        sellerApi.getMyStore(),
        orderApi.getSellerOrders(),
      ]);

      // getMyStore() may return the store object or an array depending on
      // response shape — matching the same defensive pattern already used
      // in sellerApi.getMyStores().
      const storeData = Array.isArray(store) ? store[0] : store;
      setRating(storeData?.rating ?? null);

      const totalSold = (Array.isArray(orders) ? orders : []).reduce(
        (sum: number, order: any) =>
          sum + (order.items || []).reduce((s: number, item: any) => s + (item.quantity || 0), 0),
        0
      );
      setSales(totalSold);
    } catch (err) {
      console.log("analytics cards error", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="stats-grid">
      <div className="card stat-card">
        <h3>👀 Visitors</h3>
        <h2>—</h2>
        {/* TODO: no visit-tracking endpoint exists anywhere in sellerApi/storeApi
            yet — add one (e.g. GET /stores/:id/analytics) to light this up. */}
        <p>Store visits</p>
      </div>

      <div className="card stat-card">
        <h3>🛒 Sales</h3>
        <h2>{loading ? "…" : sales}</h2>
        <p>Products sold</p>
      </div>

      <div className="card stat-card">
        <h3>⭐ Rating</h3>
        <h2>{loading ? "…" : rating != null ? rating.toFixed(1) : "—"}</h2>
        <p>Customer rating</p>
      </div>

      <div className="card stat-card">
        <h3>📦 Conversion</h3>
        <h2>—</h2>
        {/* Depends on the visitor count above, which isn't tracked yet. */}
        <p>Orders / visitors</p>
      </div>
    </div>
  );
}