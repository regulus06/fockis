import { useEffect, useState } from "react";

import { orderApi } from "../../orders/services/orderApi";

export default function ShippingPanel() {
const [orders, setOrders] = useState<any[]>([]);
const [loading, setLoading] = useState(true);
const [updatingOrderId, setUpdatingOrderId] =
useState<string | null>(null);

useEffect(() => {
load();
}, []);

async function load() {
try {
setLoading(true);

  const data =
    await orderApi.getSellerOrders();

  const sellerOrders =
    Array.isArray(data)
      ? data.filter(
          (order: any) =>
            order.status === "processing" ||
            order.status === "ready_to_ship" ||
            order.status === "shipped",
        )
      : [];

  setOrders(sellerOrders);
} catch (err) {
  console.error(
    "Failed to load shipping orders:",
    err,
  );
} finally {
  setLoading(false);
}

}

/* ==========================================================================
PROCESSING → READY TO SHIP
========================================================================== */

async function markReadyToShip(
orderId: string,
) {
if (!orderId) {
console.error(
"Cannot mark order ready to ship: order ID is missing.",
);
return;
}

try {
  setUpdatingOrderId(orderId);

  await orderApi.updateStatus(
    orderId,
    {
      status: "ready_to_ship",
    },
  );

  await load();
} catch (err) {
  console.error(
    "Failed to mark order ready to ship:",
    err,
  );
} finally {
  setUpdatingOrderId(null);
}

}

/* ==========================================================================
READY TO SHIP → SHIPPED
========================================================================== */

async function markShipped(
orderId: string,
) {
if (!orderId) {
console.error(
"Cannot mark order shipped: order ID is missing.",
);
return;
}

try {
  setUpdatingOrderId(orderId);

  await orderApi.updateStatus(
    orderId,
    {
      status: "shipped",
    },
  );

  await load();
} catch (err) {
  console.error(
    "Failed to mark order shipped:",
    err,
  );
} finally {
  setUpdatingOrderId(null);
}

}

if (loading) {
return ( <div className="card">
Loading shipments... </div>
);
}

return ( <div className="card"> <h2>
🚚 Orders Ready For Shipping </h2>

  {orders.length === 0 ? (
    <p>
      No shipments waiting.
    </p>
  ) : (
    orders.map(
      (order) => {
        const orderId =
          order?._id ??
          order?.id;

        const isUpdating =
          updatingOrderId ===
          orderId;

        return (
          <div
            key={orderId}
            className="card"
          >
            <h3>
              Order #
              {String(
                orderId,
              ).slice(-6)}
            </h3>

            <p>
              Total: $
              {Number(
                order.totalAmount ??
                  0,
              ).toFixed(2)}
            </p>

            <p>
              Status:{" "}
              <strong>
                {order.status}
              </strong>
            </p>

            {/* ==========================================================
                PROCESSING → READY TO SHIP
            ========================================================== */}

            {order.status ===
              "processing" && (
              <button
                type="button"
                disabled={
                  isUpdating
                }
                onClick={() =>
                  markReadyToShip(
                    orderId,
                  )
                }
              >
                {isUpdating
                  ? "Updating..."
                  : "📦 Ready to Ship"}
              </button>
            )}

            {/* ==========================================================
                READY TO SHIP → SHIPPED
            ========================================================== */}

            {order.status ===
              "ready_to_ship" && (
              <button
                type="button"
                disabled={
                  isUpdating
                }
                onClick={() =>
                  markShipped(
                    orderId,
                  )
                }
              >
                {isUpdating
                  ? "Updating..."
                  : "🚚 Mark Shipped"}
              </button>
            )}

            {/* ==========================================================
                SHIPPED
            ========================================================== */}

            {order.status ===
              "shipped" && (
              <p>
                ✅ Order has been
                shipped.
              </p>
            )}
          </div>
        );
      },
    )
  )}
</div>
);
}
